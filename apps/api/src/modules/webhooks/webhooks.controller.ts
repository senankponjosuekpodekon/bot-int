import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateWebhookDto {
  @IsString() @IsUrl() @IsNotEmpty() url: string;
  @IsArray() @IsNotEmpty() events: string[];
  @IsString() @IsOptional() secret?: string;
}

class UpdateWebhookDto {
  @IsString() @IsUrl() @IsOptional() url?: string;
  @IsArray() @IsOptional() events?: string[];
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateWebhookDto) {
    return this.webhookService.create(req.user.tenantId, dto.url, dto.events, dto.secret);
  }

  @Get()
  findAll(@Request() req) {
    return this.webhookService.findByTenant(req.user.tenantId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhookService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.webhookService.delete(id, req.user.tenantId);
  }
}
