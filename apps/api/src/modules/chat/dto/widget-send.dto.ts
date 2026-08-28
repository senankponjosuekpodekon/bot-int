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

  @IsObject()
  @IsOptional()
  utmParams?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };

  @IsString()
  @IsOptional()
  referrerUrl?: string;

  @IsString()
  @IsOptional()
  landingPageUrl?: string;
}
