import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) @IsOptional() price?: number;
  @IsString() @IsOptional() currency?: string;
  @Type(() => Number) @IsNumber() @IsOptional() stock?: number;
  @IsString() @IsOptional() sku?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsString() @IsOptional() productUrl?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsString() @IsOptional() agentId?: string;
}
