import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AgentType } from '../agent.entity';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AgentType)
  @IsOptional()
  type?: AgentType;

  @IsString()
  @IsOptional()
  personality?: string;

  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAgentDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(AgentType)
  @IsOptional()
  type?: AgentType;

  @IsString()
  @IsOptional()
  personality?: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
