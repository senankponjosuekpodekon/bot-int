import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User } from './user.entity';
import { TenantsService } from '../tenants/tenants.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './refresh-token.entity';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionService: SessionService,
  ) {}

  async register(dto: RegisterDto) {
    const existingTenant = await this.tenantsService.findByEmail(dto.email);
    if (existingTenant) throw new ConflictException('Email already registered');

    const tenant = await this.tenantsService.create({
      name: dto.companyName,
      email: dto.email,
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      tenantId: tenant.id,
    });
    await this.userRepo.save(user);

    return this.issueTokens(user.id, tenant.id);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.tenantId);
  }

  async refresh(dto: RefreshTokenDto) {
    const token = await this.validateRefreshToken(dto.refreshToken);
    await this.revokeToken(token);
    return this.issueTokens(token.userId, token.tenantId);
  }

  async logout(dto: RefreshTokenDto) {
    const token = await this.validateRefreshToken(dto.refreshToken);
    await this.revokeToken(token);
    return { success: true };
  }

  private async issueTokens(userId: string, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const payload = { sub: userId, tenantId, role: user?.role };
    const expiresIn = this.config.get('JWT_EXPIRES_IN', '1h');
    const refreshTtlMinutes = Number(this.config.get('REFRESH_TOKEN_TTL_MINUTES', 60 * 24 * 7));
    const { tokenId, secret, token: refreshPlain } = this.generateRefreshToken();
    const hashedToken = await bcrypt.hash(secret, 12);

    const expiresAt = new Date(Date.now() + refreshTtlMinutes * 60 * 1000);
    await this.refreshRepo.save(
      this.refreshRepo.create({ userId, tenantId, tokenId, hashedToken, expiresAt }),
    );
    await this.sessionService.create(userId, tenantId, tokenId, refreshTtlMinutes * 60);

    return {
      access_token: this.jwtService.sign(payload, { expiresIn }),
      refresh_token: refreshPlain,
      userId,
      tenantId,
    };
  }

  private generateRefreshToken() {
    const tokenId = randomBytes(16).toString('hex');
    const secret = randomBytes(48).toString('hex');
    return {
      tokenId,
      secret,
      token: `${tokenId}.${secret}`,
    };
  }

  private parseRefreshToken(refreshToken: string) {
    if (!refreshToken) throw new ForbiddenException('Invalid refresh token');
    const parts = refreshToken.split('.');

    if (parts.length === 1) {
      const secret = parts[0];
      if (!secret) throw new ForbiddenException('Invalid refresh token');
      return { tokenId: null, secret };
    }

    if (parts.length === 2) {
      const [tokenId, secret] = parts;
      if (!tokenId || !secret) throw new ForbiddenException('Invalid refresh token');
      return { tokenId, secret };
    }

    throw new ForbiddenException('Invalid refresh token');
  }

  private async validateRefreshToken(refreshToken: string) {
    const { tokenId, secret } = this.parseRefreshToken(refreshToken);
    let token: RefreshToken | null = null;

    if (tokenId) {
      token = await this.refreshRepo.findOne({ where: { tokenId } });
    } else {
      token = await this.findLegacyToken(secret);
    }

    if (!token) throw new ForbiddenException('Invalid refresh token');
    if (token.isRevoked || token.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token expired');
    }

    const match = await bcrypt.compare(secret, token.hashedToken);
    if (!match) throw new ForbiddenException('Invalid refresh token');
    return token;
  }

  private async revokeToken(token: RefreshToken) {
    token.isRevoked = true;
    token.revokedAt = new Date();
    await this.refreshRepo.save(token);
    await this.sessionService.remove(token.userId, token.tokenId);
  }

  private async findLegacyToken(secret: string) {
    const candidates = await this.refreshRepo.find({
      where: {
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    for (const candidate of candidates) {
      if (await bcrypt.compare(secret, candidate.hashedToken)) {
        return candidate;
      }
    }

    return null;
  }
}
