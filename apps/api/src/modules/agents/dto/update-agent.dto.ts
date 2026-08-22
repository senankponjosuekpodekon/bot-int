import { IsBoolean, IsEnum, IsOptional, IsString, MinLength, IsArray, IsObject } from 'class-validator';
import { AgentType } from '../agent.entity';

export class UpdateAgentDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsEnum(AgentType)
  @IsOptional()
  type?: AgentType;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  systemPrompt?: string;

  @IsString()
  @IsOptional()
  personality?: string;

  @IsArray()
  @IsOptional()
  iceBreakers?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  personalityConfig?: Record<string, any>;
}
