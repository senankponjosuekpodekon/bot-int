import { Body, Controller, Get, Post, Query, Param, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import axios from 'axios';
import { IntegrationsService } from './integrations.service';
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
      if (body.object) {
        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const messages = change.value?.messages || [];
            for (const msg of messages) {
              const from = msg.from;
              const text = msg.text?.body || '';
              if (text) {
                await this.processIncomingMessage(tenantId, 'whatsapp', from, text);
              }
            }
          }
        }
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
      const message = body.message;
      if (message?.text) {
        const from = message.from?.id?.toString() || 'unknown';
        const text = message.text;
        await this.processIncomingMessage(tenantId, 'telegram', from, text);
      }
      return { status: 'ok' };
    } catch (err: any) {
      this.logger.error(`Telegram webhook error: ${err?.message}`);
      return { status: 'error' };
    }
  }

  private async processIncomingMessage(
    tenantId: string,
    channel: string,
    from: string,
    text: string,
  ): Promise<void> {
    const agents = await this.agentRepo.find({ where: { tenantId, isActive: true } });
    if (agents.length === 0) return;

    const agent = agents[0];
    const visitorId = `${channel}_${from}`;

    const result = await this.chatService.sendMessage(
      tenantId,
      agent.id,
      text,
      undefined,
      visitorId,
      true,
    );

    // Send reply back through the channel
    try {
      if (channel === 'whatsapp') {
        await this.integrationsService.sendWhatsApp(tenantId, from, result.reply);
      } else if (channel === 'telegram') {
        await this.integrationsService.sendTelegram(tenantId, from, result.reply);
      }
    } catch (err: any) {
      this.logger.error(`Failed to send reply via ${channel}: ${err?.message}`);
    }
  }
}
