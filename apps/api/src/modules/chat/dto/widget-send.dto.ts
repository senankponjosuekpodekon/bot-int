import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class WidgetSendDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  visitorId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
