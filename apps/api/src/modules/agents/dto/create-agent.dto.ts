import { IsBoolean, IsEnum, IsOptional, IsString, MinLength, IsArray, IsObject } from 'class-validator';
import { AgentType } from '../agent.entity';

export class CreateAgentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(AgentType)
  @IsOptional()
  type?: AgentType;

  @IsString()
  @MinLength(10)
  systemPrompt: string;

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
