import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { TenantsService } from '../tenants/tenants.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
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

    return this.signToken(user.id, tenant.id);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signToken(user.id, user.tenantId);
  }

  private signToken(userId: string, tenantId: string) {
    const payload = { sub: userId, tenantId };
    return {
      access_token: this.jwtService.sign(payload),
      userId,
      tenantId,
    };
  }
}
