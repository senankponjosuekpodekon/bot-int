import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsObject, IsBoolean, IsOptional } from 'class-validator';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class UpsertIntegrationDto {
  @IsString() @IsNotEmpty() type: string;
  @IsObject() config: Record<string, any>;
}

class ToggleDto {
  @IsBoolean() enabled: boolean;
}

class StripePaymentDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsString() @IsNotEmpty() productName: string;
  amount: number;
  @IsString() @IsOptional() currency?: string;
}

class EmailDto {
  @IsString() @IsNotEmpty() to: string;
  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsNotEmpty() body: string;
}

class MessageDto {
  @IsString() @IsNotEmpty() to: string;
  @IsString() @IsNotEmpty() message: string;
}

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Post()
  upsert(@Request() req, @Body() dto: UpsertIntegrationDto) {
    return this.service.upsert(req.user.tenantId, dto.type, dto.config);
  }

  @Patch(':type')
  toggle(@Request() req, @Param('type') type: string, @Body() dto: ToggleDto) {
    return this.service.toggle(req.user.tenantId, type, dto.enabled);
  }

  @Delete(':type')
  remove(@Request() req, @Param('type') type: string) {
    return this.service.remove(req.user.tenantId, type);
  }

  @Post('stripe/payment-link')
  createPaymentLink(@Request() req, @Body() dto: StripePaymentDto) {
    return this.service.createStripePaymentLink(req.user.tenantId, dto.productId, dto.productName, dto.amount, dto.currency);
  }

  @Get('calendly/events')
  getCalendlyEvents(@Request() req) {
    return this.service.getCalendlyEventTypes(req.user.tenantId);
  }

  @Post('email/send')
  sendEmail(@Request() req, @Body() dto: EmailDto) {
    return this.service.sendEmail(req.user.tenantId, dto.to, dto.subject, dto.body);
  }

  @Post('whatsapp/send')
  sendWhatsApp(@Request() req, @Body() dto: MessageDto) {
    return this.service.sendWhatsApp(req.user.tenantId, dto.to, dto.message);
  }

  @Post('telegram/send')
  sendTelegram(@Request() req, @Body() dto: MessageDto) {
    return this.service.sendTelegram(req.user.tenantId, dto.to, dto.message);
  }

  @Post('sms/send')
  sendSMS(@Request() req, @Body() dto: MessageDto) {
    return this.service.sendSMS(req.user.tenantId, dto.to, dto.message);
  }
}
