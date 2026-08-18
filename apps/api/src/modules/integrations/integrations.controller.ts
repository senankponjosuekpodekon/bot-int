import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsObject, IsBoolean, IsOptional } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all integrations' })
  @ApiResponse({ status: 200, description: 'List of integrations' })
  findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update integration' })
  @ApiResponse({ status: 201, description: 'Integration saved' })
  upsert(@Request() req, @Body() dto: UpsertIntegrationDto) {
    return this.service.upsert(req.user.tenantId, dto.type, dto.config);
  }

  @Patch(':type')
  @ApiOperation({ summary: 'Toggle integration on/off' })
  @ApiResponse({ status: 200, description: 'Integration toggled' })
  toggle(@Request() req, @Param('type') type: string, @Body() dto: ToggleDto) {
    return this.service.toggle(req.user.tenantId, type, dto.enabled);
  }

  @Delete(':type')
  @ApiOperation({ summary: 'Delete integration' })
  @ApiResponse({ status: 200, description: 'Integration deleted' })
  remove(@Request() req, @Param('type') type: string) {
    return this.service.remove(req.user.tenantId, type);
  }

  @Post('stripe/payment-link')
  @ApiOperation({ summary: 'Create Stripe payment link' })
  @ApiResponse({ status: 201, description: 'Payment link created' })
  createPaymentLink(@Request() req, @Body() dto: StripePaymentDto) {
    return this.service.createStripePaymentLink(req.user.tenantId, dto.productId, dto.productName, dto.amount, dto.currency);
  }

  @Get('calendly/events')
  @ApiOperation({ summary: 'Get Calendly event types' })
  @ApiResponse({ status: 200, description: 'Calendly events' })
  getCalendlyEvents(@Request() req) {
    return this.service.getCalendlyEventTypes(req.user.tenantId);
  }

  @Post('email/send')
  @ApiOperation({ summary: 'Send email via integration' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  sendEmail(@Request() req, @Body() dto: EmailDto) {
    return this.service.sendEmail(req.user.tenantId, dto.to, dto.subject, dto.body);
  }

  @Post('whatsapp/send')
  @ApiOperation({ summary: 'Send WhatsApp message' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  sendWhatsApp(@Request() req, @Body() dto: MessageDto) {
    return this.service.sendWhatsApp(req.user.tenantId, dto.to, dto.message);
  }

  @Post('telegram/send')
  @ApiOperation({ summary: 'Send Telegram message' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  sendTelegram(@Request() req, @Body() dto: MessageDto) {
    return this.service.sendTelegram(req.user.tenantId, dto.to, dto.message);
  }

  @Post('sms/send')
  @ApiOperation({ summary: 'Send SMS message' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  sendSMS(@Request() req, @Body() dto: MessageDto) {
    return this.service.sendSMS(req.user.tenantId, dto.to, dto.message);
  }
}
