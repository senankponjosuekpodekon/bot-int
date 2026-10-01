import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import axios from 'axios';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { IntegrationsService } from './integrations.service';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { TelegramAdapter } from './telegram.adapter';
import { InstagramAdapter } from './instagram.adapter';
import { ChatService } from '../chat/chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { Integration } from './integration.entity';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly chatService: ChatService,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly config: ConfigService,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  private async requireIntegration(tenantId: string, type: string): Promise<Integration> {
    const integration = await this.integrationsService.findByType(tenantId, type);
    if (!integration?.enabled) {
      throw new UnauthorizedException(`${type} integration is not configured or disabled`);
    }
    return integration;
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }

  // WhatsApp Business API webhook verification (Meta challenge)
  @Get('whatsapp/:tenantId')
  async verifyWhatsApp(
    @Param('tenantId') tenantId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const integration = await this.requireIntegration(tenantId, 'whatsapp');
    const expectedToken = integration.config?.verifyToken;
    if (mode === 'subscribe' && expectedToken && this.safeEqual(token || '', expectedToken)) {
      this.logger.log(`WhatsApp webhook verified for tenant ${tenantId}`);
      return challenge;
    }
    throw new ForbiddenException('Verification failed');
  }

  // WhatsApp Business API incoming messages — HMAC-SHA256 signature required
  @Post('whatsapp/:tenantId')
  async receiveWhatsApp(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Query('agentId') agentId?: string,
  ) {
    const integration = await this.requireIntegration(tenantId, 'whatsapp');
    const appSecret =
      integration.config?.appSecret ||
      this.config.get<string>('WHATSAPP_APP_SECRET') ||
      this.config.get<string>('META_APP_SECRET');
    if (!appSecret) {
      this.logger.error(`WhatsApp webhook rejected for tenant ${tenantId}: no appSecret configured`);
      throw new UnauthorizedException('WhatsApp appSecret is not configured');
    }
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')}`;
    if (!signature || !this.safeEqual(signature, expected)) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }

    try {
      const normalized = await this.whatsappAdapter.normalize(tenantId, body);
      if (normalized) {
        await this.processIncomingMessage(tenantId, normalized, agentId);
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`WhatsApp webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  // Instagram Messaging webhook verification (Meta challenge)
  @Get('instagram/:tenantId')
  async verifyInstagram(
    @Param('tenantId') tenantId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const integration = await this.requireIntegration(tenantId, 'instagram');
    const expectedToken = integration.config?.verifyToken;
    if (mode === 'subscribe' && expectedToken && this.safeEqual(token || '', expectedToken)) {
      this.logger.log(`Instagram webhook verified for tenant ${tenantId}`);
      return challenge;
    }
    throw new ForbiddenException('Verification failed');
  }

  // Instagram Messaging incoming — HMAC-SHA256 signature required (same Meta app secret scheme)
  @Post('instagram/:tenantId')
  async receiveInstagram(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Query('agentId') agentId?: string,
  ) {
    const integration = await this.requireIntegration(tenantId, 'instagram');
    const appSecret =
      integration.config?.appSecret ||
      this.config.get<string>('INSTAGRAM_APP_SECRET') ||
      this.config.get<string>('META_APP_SECRET');
    if (!appSecret) {
      this.logger.error(`Instagram webhook rejected for tenant ${tenantId}: no appSecret configured`);
      throw new UnauthorizedException('Instagram appSecret is not configured');
    }
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')}`;
    if (!signature || !this.safeEqual(signature, expected)) {
      throw new UnauthorizedException('Invalid Instagram webhook signature');
    }

    try {
      const normalized = await this.instagramAdapter.normalize(tenantId, body);
      if (normalized) {
        await this.processIncomingMessage(tenantId, normalized, agentId);
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`Instagram webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  // Telegram webhook setup — authenticated; registers a per-tenant secret_token
  @Post('telegram/:tenantId/setup')
  @UseGuards(JwtAuthGuard)
  async setupTelegramWebhook(@Param('tenantId') tenantId: string, @Request() req: any, @Req() httpReq: ExpressRequest) {
    if (req.user?.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant mismatch');
    }
    const integration = await this.requireIntegration(tenantId, 'telegram');
    const botToken = integration.config?.botToken;
    if (!botToken) {
      throw new UnauthorizedException('Telegram botToken is not configured');
    }

    const webhookSecret = randomBytes(24).toString('hex');
    await this.integrationsService.upsert(tenantId, 'telegram', { webhookSecret });

    const baseUrl = `${httpReq.protocol}://${httpReq.get('host')}/api/webhooks/telegram/${tenantId}`;
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        url: baseUrl,
        secret_token: webhookSecret,
      });
      return { status: 'ok', webhookUrl: baseUrl };
    } catch (err: any) {
      return { error: err?.message };
    }
  }

  @Post('telegram/:tenantId')
  async receiveTelegram(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Headers('x-telegram-bot-api-secret-token') secretToken: string | undefined,
    @Query('agentId') agentId?: string,
  ) {
    const integration = await this.requireIntegration(tenantId, 'telegram');
    const expected = integration.config?.webhookSecret;
    if (!expected) {
      this.logger.error(`Telegram webhook rejected for tenant ${tenantId}: webhookSecret not configured (call POST /api/webhooks/telegram/${tenantId}/setup)`);
      throw new UnauthorizedException('Telegram webhookSecret is not configured');
    }
    if (!secretToken || !this.safeEqual(secretToken, expected)) {
      throw new UnauthorizedException('Invalid Telegram secret token');
    }

    try {
      const normalized = await this.telegramAdapter.normalize(tenantId, body);
      if (normalized) {
        await this.processIncomingMessage(tenantId, normalized, agentId);
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`Telegram webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  @Post('email/:tenantId')
  async receiveEmail(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Query('agentId') agentId?: string,
  ) {
    const integration = await this.requireIntegration(tenantId, 'email');
    const expected = integration.config?.inboundSecret;
    if (!expected) {
      this.logger.error(`Email webhook rejected for tenant ${tenantId}: inboundSecret not configured`);
      throw new UnauthorizedException('Email inboundSecret is not configured');
    }
    if (!secret || !this.safeEqual(secret, expected)) {
      throw new UnauthorizedException('Invalid email webhook secret');
    }

    try {
      const from = body.from || body.sender || '';
      const subject = body.subject || '(No subject)';
      const text = body.text || body.html || '';
      const emailBody = text.replace(/<[^>]*>/g, '').trim();

      if (emailBody && from) {
        const fromEmail = from.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || from;
        await this.processIncomingMessage(
          tenantId,
          {
            visitorId: `email_${fromEmail}`,
            text: emailBody,
            channel: 'email',
            metadata: { from: fromEmail, subject },
          },
          agentId,
        );
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`Email webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  @Post('sms/:tenantId')
  async receiveSms(
    @Param('tenantId') tenantId: string,
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Req() req: ExpressRequest,
    @Query('agentId') agentId?: string,
  ) {
    const integration = await this.requireIntegration(tenantId, 'twilio');
    const authToken = integration.config?.authToken;
    if (!authToken) {
      this.logger.error(`SMS webhook rejected for tenant ${tenantId}: twilio authToken not configured`);
      throw new UnauthorizedException('Twilio authToken is not configured');
    }
    if (!signature || !this.verifyTwilioSignature(req, authToken, signature, body)) {
      throw new UnauthorizedException('Invalid Twilio webhook signature');
    }

    try {
      const from = body.From || body.from || '';
      const text = body.Body || body.body || '';

      if (text && from) {
        const fromNumber = from.replace(/\D/g, '');
        await this.processIncomingMessage(
          tenantId,
          {
            visitorId: `sms_${fromNumber}`,
            text: text.trim(),
            channel: 'sms',
            metadata: { from: fromNumber },
          },
          agentId,
        );
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`SMS webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  // Twilio request validation: base64(HMAC-SHA1(authToken, url + sortedParamKeyValueConcat))
  private verifyTwilioSignature(req: ExpressRequest, authToken: string, signature: string, params: Record<string, any>): boolean {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const data = Object.keys(params || {})
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);
    const expected = createHmac('sha1', authToken).update(Buffer.from(data, 'utf8')).digest('base64');
    return this.safeEqual(signature, expected);
  }

  private async processIncomingMessage(
    tenantId: string,
    normalized: { visitorId: string; text: string; channel: string; metadata?: Record<string, any> },
    agentId?: string,
  ): Promise<void> {
    let agent: Agent | null = null;
    if (agentId) {
      agent = await this.agentRepo.findOne({ where: { id: agentId, tenantId, isActive: true } });
      if (!agent) throw new UnauthorizedException('Unknown or inactive agent for this tenant');
    } else {
      agent = await this.agentRepo.findOne({
        where: { tenantId, isActive: true },
        order: { createdAt: 'ASC' },
      });
    }
    if (!agent) return;

    const result = await this.chatService.sendMessage(
      tenantId,
      agent.id,
      normalized.text,
      undefined,
      normalized.visitorId,
      true,
    );

    // Send reply back through the channel
    try {
      if (normalized.channel === 'whatsapp') {
        await this.integrationsService.sendWhatsApp(tenantId, normalized.metadata?.from, result.reply);
      } else if (normalized.channel === 'instagram') {
        await this.integrationsService.sendInstagram(tenantId, normalized.metadata?.from, result.reply);
      } else if (normalized.channel === 'telegram') {
        await this.integrationsService.sendTelegram(tenantId, normalized.metadata?.from, result.reply);
      } else if (normalized.channel === 'email') {
        const subject = normalized.metadata?.subject || 'Re:';
        const replySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
        await this.integrationsService.sendEmail(tenantId, normalized.metadata?.from, replySubject, result.reply);
      } else if (normalized.channel === 'sms') {
        await this.integrationsService.sendSMS(tenantId, normalized.metadata?.from, result.reply);
      }
    } catch (err: any) {
      this.logger.error(`Failed to send reply via ${normalized.channel}: ${err?.message}`);
    }
  }
}
