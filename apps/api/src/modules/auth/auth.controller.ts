import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { Request, Response } from 'express';;

const REFRESH_COOKIE = 'stiamond_refresh';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7d, matches refresh rotation

function refreshCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: REFRESH_MAX_AGE,
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, token?: string) {
    const secure = process.env.NODE_ENV === 'production';
    if (token) {
      res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(secure));
    } else {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(secure));
    }
  }

  private tokenFromCookieOrBody(req: Request, dto: RefreshTokenDto): string | undefined {
    if (dto?.refreshToken) return dto.refreshToken;
    const header = req.headers.cookie;
    if (!header) return undefined;
    const match = header.match(new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new tenant + user' })
  @ApiResponse({ status: 201, description: 'Tenant and user created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    this.setRefreshCookie(res, tokens?.refresh_token);
    return tokens;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login and get JWT tokens' })
  @ApiResponse({ status: 200, description: 'Returns access + refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens?.refresh_token);
    return tokens;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refresh({
      refreshToken: this.tokenFromCookieOrBody(req, dto) as string,
    });
    this.setRefreshCookie(res, tokens?.refresh_token);
    return tokens;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout({
      refreshToken: this.tokenFromCookieOrBody(req, dto) as string,
    });
    this.setRefreshCookie(res);
    return result;
  }
}
