import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User, UserRole } from './user.entity';
import { Tenant } from '../tenants/tenant.entity';
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
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const existingTenant = await this.tenantsService.findByEmail(dto.email);
    if (existingTenant) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Tenant + owner user must be created atomically — an orphaned tenant with no
    // user would be an unmanageable record that still consumes a unique email.
    const { tenant, user } = await this.dataSource.transaction(async (em) => {
      const tenant = await em.getRepository(Tenant).save(
        em.getRepository(Tenant).create({
          name: dto.companyName,
          email: dto.email,
          language: dto.language,
          timezone: dto.timezone,
          location: dto.location,
        }),
      );
      const user = await em.getRepository(User).save(
        em.getRepository(User).create({
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          tenantId: tenant.id,
          role: UserRole.ADMIN,
        }),
      );
      return { tenant, user };
    });

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
    await this.dataSource.transaction(async (em) => {
      await em.getRepository(RefreshToken).save(
        em.getRepository(RefreshToken).create({ userId, tenantId, tokenId, hashedToken, expiresAt }),
      );
      await this.sessionService.create(userId, tenantId, tokenId, refreshTtlMinutes * 60, em);
    });

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

    // Legacy single-segment tokens are rejected: resolving them required an O(n)
    // bcrypt scan over every active refresh token (DoS amplification). Users holding
    // one must log in again.
    if (parts.length !== 2) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const [tokenId, secret] = parts;
    if (!tokenId || !secret) throw new ForbiddenException('Invalid refresh token');
    return { tokenId, secret };
  }

  private async validateRefreshToken(refreshToken: string) {
    const { tokenId, secret } = this.parseRefreshToken(refreshToken);
    const token = await this.refreshRepo.findOne({ where: { tokenId } });

    if (!token) throw new ForbiddenException('Invalid refresh token');
    if (token.isRevoked || token.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token expired');
    }

    const match = await bcrypt.compare(secret, token.hashedToken);
    if (!match) throw new ForbiddenException('Invalid refresh token');
    return token;
  }

  private async revokeToken(token: RefreshToken) {
    // Atomic revoke — safe against concurrent refresh of the same token.
    const res = await this.refreshRepo.update(
      { id: token.id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
    if (res.affected === 0) {
      throw new ForbiddenException('Refresh token already used');
    }
    await this.sessionService.remove(token.userId, token.tokenId);
  }
}
