import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ChannelAdapter, NormalizedMessage } from './channel-adapter.interface';
import { WidgetChannelAdapter } from './adapters/widget-channel.adapter';
import { WhatsAppChannelAdapter } from './adapters/whatsapp-channel.adapter';
import { InstagramChannelAdapter } from './adapters/instagram-channel.adapter';
import { Agent } from '../agents/agent.entity';
import { ChatService } from '../chat/chat.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { ConversationChannel } from '../chat/conversation.entity';

@Injectable()
export class ChannelAdapterService {
  private readonly logger = new Logger(ChannelAdapterService.name);
  private readonly adapters: Record<string, ChannelAdapter>;

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => IntegrationsService))
    private readonly integrationsService: IntegrationsService,
  ) {
    this.adapters = {
      [ConversationChannel.WEB]: new WidgetChannelAdapter(),
      [ConversationChannel.WHATSAPP]: new WhatsAppChannelAdapter(config),
      [ConversationChannel.INSTAGRAM]: new InstagramChannelAdapter(config),
    };
  }

  getAdapter(channel: string): ChannelAdapter | undefined {
    return this.adapters[channel.toLowerCase()];
  }

  getSupportedChannels(): string[] {
    return Object.keys(this.adapters);
  }

  getChallengeResponse(channel: string, query: Record<string, any>): string | null {
    const adapter = this.getAdapter(channel);
    if (!adapter || !adapter.getChallengeResponse) return null;
    return adapter.getChallengeResponse(query);
  }

  async normalizeMessage(channel: string, tenantId: string, payload: any): Promise<NormalizedMessage> {
    const adapter = this.getAdapter(channel);
    if (!adapter) throw new BadRequestException(`Unsupported channel ${channel}`);
    const normalized = await adapter.normalize(tenantId, payload);
    if (!normalized) throw new BadRequestException('Could not normalize incoming message');
    return normalized;
  }

  async handleInbound(
    channel: string,
    agentId: string,
    payload: any,
    signature?: string,
    rawBody?: string,
  ): Promise<{ reply: string; conversationId: string; leadId?: string; funnelStage?: string; intentScore?: number }> {
    const adapter = this.getAdapter(channel);
    if (!adapter) throw new BadRequestException(`Unsupported channel ${channel}`);

    if (adapter.verifySignature) {
      if (!signature || !rawBody || !adapter.verifySignature(rawBody, signature)) {
        throw new UnauthorizedException('Invalid or missing webhook signature');
      }
    }

    const normalizedList = adapter.normalizeAll
      ? await adapter.normalizeAll('', payload)
      : [await adapter.normalize('', payload)].filter(Boolean) as NormalizedMessage[];
    if (normalizedList.length === 0) throw new BadRequestException('Could not normalize incoming message');

    const agent = await this.agentRepo.findOne({ where: { id: agentId, isActive: true } });
    if (!agent) throw new NotFoundException('Agent not found');

    let lastResult: any;
    for (const normalized of normalizedList) {
      lastResult = await this.chatService.sendMessage(
        agent.tenantId,
        agent.id,
        normalized.text,
        undefined,
        normalized.visitorId,
        true,
        undefined,
        undefined,
        normalized.metadata,
        channel as ConversationChannel,
      );
      await this.deliverReply(agent.tenantId, channel, normalized, lastResult?.reply);
    }
    return lastResult;
  }

  // Send the agent's reply back through the originating channel. Failures are
  // logged but don't fail the webhook (Meta/Telegram would retry → duplicates).
  private async deliverReply(tenantId: string, channel: string, normalized: NormalizedMessage, reply?: string): Promise<void> {
    if (!reply) return;
    const to = normalized.metadata?.from || normalized.visitorId;
    try {
      if (channel === ConversationChannel.WHATSAPP) {
        await this.integrationsService.sendWhatsApp(tenantId, to, reply);
      } else if (channel === ConversationChannel.INSTAGRAM) {
        await this.integrationsService.sendInstagram(tenantId, to, reply);
      } else if (channel === ConversationChannel.TELEGRAM) {
        await this.integrationsService.sendTelegram(tenantId, to, reply);
      }
    } catch (err: any) {
      this.logger.error(`Failed to deliver reply via ${channel}: ${err?.message}`);
    }
  }
}
