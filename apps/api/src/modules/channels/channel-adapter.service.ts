import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ChannelAdapter, NormalizedMessage } from './channel-adapter.interface';
import { WidgetChannelAdapter } from './adapters/widget-channel.adapter';
import { WhatsAppChannelAdapter } from './adapters/whatsapp-channel.adapter';
import { InstagramChannelAdapter } from './adapters/instagram-channel.adapter';
import { Agent } from '../agents/agent.entity';
import { ChatService } from '../chat/chat.service';
import { ConversationChannel } from '../chat/conversation.entity';

@Injectable()
export class ChannelAdapterService {
  private readonly adapters: Record<string, ChannelAdapter>;

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
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

    if (signature && adapter.verifySignature && rawBody && !adapter.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const normalized = await adapter.normalize('', payload);
    if (!normalized) throw new BadRequestException('Could not normalize incoming message');

    const agent = await this.agentRepo.findOne({ where: { id: agentId, isActive: true } });
    if (!agent) throw new NotFoundException('Agent not found');

    return this.chatService.sendMessage(
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
  }
}
