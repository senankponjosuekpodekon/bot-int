import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  // Optional: the refresh token may also arrive via the stiamond_refresh
  // httpOnly cookie; the controller falls back to it when the body is empty.
  @IsString()
  @MinLength(10)
  @IsOptional()
  refreshToken?: string;
}
