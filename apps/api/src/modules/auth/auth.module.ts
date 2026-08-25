import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { SessionEntity } from './session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, SessionEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || (process.env.NODE_ENV !== 'production' ? 'dev_only_secret_change_me' : (() => { throw new Error('JWT_SECRET env var is required in production'); })()),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    TenantsModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, SessionService],
  controllers: [AuthController, SessionController],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
