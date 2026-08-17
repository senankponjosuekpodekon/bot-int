import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { LeadStatus } from '../lead.entity';

export class CreateLeadDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  score?: number;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsString()
  @IsOptional()
  source?: string;

  @IsUUID()
  @IsOptional()
  agentId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
