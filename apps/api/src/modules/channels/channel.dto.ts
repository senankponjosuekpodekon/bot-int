import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class ChannelMessageDto {
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

  @IsString()
  @IsOptional()
  channel?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ChannelWebhookDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  events?: string;
}
