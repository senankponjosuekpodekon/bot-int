import type { RawBodyRequest } from '@nestjs/common';
import { Request } from '@nestjs/common';
import { Body, Controller, ForbiddenException, Get, Headers, Logger, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';;
import type { Request as ExpressRequest } from 'express';;
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
import { ConversationChannel } from '../chat/conversation.entity';
import { Message, MessageRole } from '../chat/message.entity';

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
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
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

  // App-level WhatsApp webhook (centralized, set once in the Meta console).
  // Verification: one shared token from META_VERIFY_TOKEN — same for all tenants.
  @Get('whatsapp')
  async verifyWhatsAppCentral(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expectedToken = this.config.get<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && expectedToken && this.safeEqual(token || '', expectedToken)) {
      this.logger.log('WhatsApp centralized webhook verified');
      return challenge;
    }
    throw new ForbiddenException('Verification failed');
  }

  // App-level WhatsApp incoming — routes each change to the tenant owning the
  // phone_number_id in the payload. Requires META_APP_SECRET in env.
  @Post('whatsapp')
  async receiveWhatsAppCentral(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Query('agentId') agentId?: string,
  ) {
    const appSecret = this.config.get<string>('META_APP_SECRET');
    if (!appSecret) {
      this.logger.error('WhatsApp centralized webhook rejected: META_APP_SECRET is not configured');
      throw new UnauthorizedException('WhatsApp appSecret is not configured');
    }
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')}`;
    if (!signature || !this.safeEqual(signature, expected)) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }

    let processed = 0;
    try {
      for (const entry of body?.entry || []) {
        for (const change of entry?.changes || []) {
          const phoneNumberId = change?.value?.metadata?.phone_number_id;
          const integration = await this.integrationsService.findWhatsAppByPhoneNumberId(phoneNumberId);
          if (!integration) {
            if (change?.value?.messages?.length) {
              this.logger.warn(`WhatsApp webhook: no enabled integration for phone_number_id ${phoneNumberId}`);
            }
            continue;
          }
          const tenantPayload = { object: body.object, entry: [{ ...entry, changes: [change] }] };
          const normalized = await this.whatsappAdapter.normalizeAll(integration.tenantId, tenantPayload);
          for (const msg of normalized) {
            await this.processIncomingMessage(integration.tenantId, msg, agentId);
            processed++;
          }
        }
      }
      return this.lastSendError ? { status: 'ok', processed, sendError: this.lastSendError } : { status: 'ok', processed };
    } catch (err: any) {
      this.logger.error(`WhatsApp centralized webhook error: ${err?.message}`);
      return { status: 'error' };
    }
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
      const normalized = await this.whatsappAdapter.normalizeAll(tenantId, body);
      for (const msg of normalized) {
        await this.processIncomingMessage(tenantId, msg, agentId);
      }
      return this.lastSendError ? { status: 'ok', processed: normalized.length, sendError: this.lastSendError } : { status: 'ok', processed: normalized.length };
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
      const normalized = await this.instagramAdapter.normalizeAll(tenantId, body);
      for (const msg of normalized) {
        await this.processIncomingMessage(tenantId, msg, agentId);
      }
      return this.lastSendError ? { status: 'ok', processed: normalized.length, sendError: this.lastSendError } : { status: 'ok', processed: normalized.length };
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

    // Behind a TLS-terminating proxy (Render), req.protocol is 'http' while the
    // public URL is 'https' — Telegram rejects non-HTTPS webhook URLs.
    const proto = httpReq.get('x-forwarded-proto')?.split(',')[0]?.trim() || httpReq.protocol;
    const baseUrl = `${proto}://${httpReq.get('host')}/api/webhooks/telegram/${tenantId}`;
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
      const normalized = await this.telegramAdapter.normalizeAll(tenantId, body);
      for (const msg of normalized) {
        await this.processIncomingMessage(tenantId, msg, agentId);
      }
      return this.lastSendError ? { status: 'ok', processed: normalized.length, sendError: this.lastSendError } : { status: 'ok', processed: normalized.length };
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
      return this.lastSendError ? { status: 'ok', sendError: this.lastSendError } : { status: 'ok' };
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
      return this.lastSendError ? { status: 'ok', sendError: this.lastSendError } : { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`SMS webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  // Twilio request validation: base64(HMAC-SHA1(authToken, url + sortedParamKeyValueConcat))
  private verifyTwilioSignature(req: ExpressRequest, authToken: string, signature: string, params: Record<string, any>): boolean {
    // Twilio signs the external https URL — honor x-forwarded-proto behind a proxy.
    const proto = req.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.protocol;
    const url = `${proto}://${req.get('host')}${req.originalUrl}`;
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
      undefined,
      undefined,
      undefined,
      normalized.channel as ConversationChannel,
    );

    // Send reply back through the channel — surface failures in the webhook
    // response so "agent replied but the number didn't receive" is diagnosable.
    try {
      if (normalized.channel === 'whatsapp') {
        await this.integrationsService.sendWhatsApp(tenantId, normalized.metadata?.from, result.reply);
      } else if (normalized.channel === 'instagram') {
        await this.integrationsService.sendInstagram(tenantId, normalized.metadata?.from, result.reply);
      } else if (normalized.channel === 'telegram') {
        await this.integrationsService.sendTelegram(tenantId, normalized.metadata?.chatId ?? normalized.metadata?.from, result.reply);
      } else if (normalized.channel === 'email') {
        const subject = normalized.metadata?.subject || 'Re:';
        const replySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
        await this.integrationsService.sendEmail(tenantId, normalized.metadata?.from, replySubject, result.reply);
      } else if (normalized.channel === 'sms') {
        await this.integrationsService.sendSMS(tenantId, normalized.metadata?.from, result.reply);
      }
      this.lastSendError = undefined;
    } catch (err: any) {
      this.lastSendError = `${normalized.channel}: ${err?.message}`;
      this.logger.error(`Failed to send reply via ${normalized.channel}: ${err?.message}`);
      // Persist the delivery failure on the assistant message so it shows in
      // the conversation audit trail and admin views.
      try {
        const last = await this.msgRepo.findOne({
          where: { conversationId: result.conversationId, role: MessageRole.ASSISTANT },
          order: { createdAt: 'DESC' },
        });
        if (last) {
          last.metadata = { ...(last.metadata || {}), sendError: err?.message, sendFailedAt: new Date().toISOString() };
          await this.msgRepo.save(last);
        }
      } catch {
        // best-effort audit trail — never break the webhook ack
      }
    }
  }

  private lastSendError: string | undefined;
}
