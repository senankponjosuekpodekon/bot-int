import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  create(@Request() req, @Body() dto: CreateWebhookDto) {
    return this.webhookService.create(req.user.tenantId, dto.url, dto.events, dto.secret);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook endpoints' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  findAll(@Request() req) {
    return this.webhookService.findByTenant(req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhookService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  remove(@Request() req, @Param('id') id: string) {
    return this.webhookService.delete(id, req.user.tenantId);
  }
}
