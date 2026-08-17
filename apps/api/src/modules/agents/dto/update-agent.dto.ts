import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
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
  @MinLength(10)
  @IsOptional()
  systemPrompt?: string;

  @IsString()
  @IsOptional()
  personality?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
