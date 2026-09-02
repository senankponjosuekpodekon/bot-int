import { Body, Controller, Get, Post, Query, Param, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import axios from 'axios';
import { IntegrationsService } from './integrations.service';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { TelegramAdapter } from './telegram.adapter';
import { ChatService } from '../chat/chat.service';
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
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
  ) {}

  // WhatsApp Business API webhook verification
  @Get('whatsapp/:tenantId')
  verifyWhatsApp(
    @Param('tenantId') tenantId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && token) {
      this.logger.log(`WhatsApp webhook verified for tenant ${tenantId}`);
      return challenge;
    }
    return 'Verification failed';
  }

  // WhatsApp Business API incoming messages
  @Post('whatsapp/:tenantId')
  async receiveWhatsApp(@Param('tenantId') tenantId: string, @Body() body: any) {
    try {
      const normalized = await this.whatsappAdapter.normalize(tenantId, body);
      if (normalized) {
        await this.processIncomingMessage(tenantId, normalized);
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`WhatsApp webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  // Telegram webhook setup and incoming messages
  @Get('telegram/:tenantId')
  async setupTelegramWebhook(@Param('tenantId') tenantId: string, @Req() req: Request) {
    const integration = await this.integrationRepo.findOne({
      where: { tenantId, type: 'telegram' },
    });
    if (!integration?.config?.botToken) {
      return { error: 'Telegram not configured' };
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/api/webhooks/telegram/${tenantId}`;
    try {
    await axios.post(
      `https://api.telegram.org/bot${integration.config.botToken}/setWebhook`,
      { url: baseUrl },
    );
    return { status: 'ok', webhookUrl: baseUrl };
    } catch (err: any) {
      return { error: err?.message };
    }
  }

  @Post('telegram/:tenantId')
  async receiveTelegram(@Param('tenantId') tenantId: string, @Body() body: any) {
    try {
      const normalized = await this.telegramAdapter.normalize(tenantId, body);
      if (normalized) {
        await this.processIncomingMessage(tenantId, normalized);
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`Telegram webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  @Post('email/:tenantId')
  async receiveEmail(@Param('tenantId') tenantId: string, @Body() body: any) {
    try {
      const from = body.from || body.sender || '';
      const subject = body.subject || '(No subject)';
      const text = body.text || body.html || '';
      const emailBody = text.replace(/<[^>]*>/g, '').trim();

      if (emailBody && from) {
        const fromEmail = from.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || from;
        await this.processIncomingMessage(tenantId, {
          visitorId: `email_${fromEmail}`,
          text: emailBody,
          channel: 'email',
          metadata: { from: fromEmail, subject },
        });
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`Email webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  @Post('sms/:tenantId')
  async receiveSms(@Param('tenantId') tenantId: string, @Body() body: any) {
    try {
      const from = body.From || body.from || '';
      const text = body.Body || body.body || '';

      if (text && from) {
        const fromNumber = from.replace(/\D/g, '');
        await this.processIncomingMessage(tenantId, {
          visitorId: `sms_${fromNumber}`,
          text: text.trim(),
          channel: 'sms',
          metadata: { from: fromNumber },
        });
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`SMS webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  private async processIncomingMessage(
    tenantId: string,
    normalized: { visitorId: string; text: string; channel: string; metadata?: Record<string, any> },
  ): Promise<void> {
    const agents = await this.agentRepo.find({ where: { tenantId, isActive: true } });
    if (agents.length === 0) return;

    const agent = agents[0];

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
