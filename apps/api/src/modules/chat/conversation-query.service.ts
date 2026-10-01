import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { LeadsService } from '../leads/leads.service';
import { WebhookService } from '../webhooks/webhook.service';
import { ListConversationsDto } from './dto/list-conversations.dto';

// Read-side of conversations: lookups, history, transcripts, listing, lead
// attachment and status transitions. Everything is tenant-scoped.
@Injectable()
export class ConversationQueryService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly leadsService: LeadsService,
    private readonly webhookService: WebhookService,
  ) {}

  async getConversationForTenant(conversationId: string, tenantId: string): Promise<Conversation> {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async getHistory(conversationId: string, tenantId: string, limit = 500) {
    const conversation = await this.getConversationForTenant(conversationId, tenantId);

    const messages = await this.msgRepo.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return messages.reverse();
  }

  async exportTranscript(conversationId: string, tenantId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = await this.msgRepo.find({
      where: { conversationId, role: In([MessageRole.USER, MessageRole.ASSISTANT]) },
      order: { createdAt: 'ASC' },
    });

    return { conversation, messages };
  }

  async getConversations(tenantId: string, params: ListConversationsDto) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.convRepo
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.lead', 'lead')
      .where('conversation.tenantId = :tenantId', { tenantId })
      .orderBy('conversation.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (params.businessId) {
      qb.andWhere('conversation.businessId = :businessId', { businessId: params.businessId });
    }

    if (params.agentId) {
      qb.andWhere('conversation.agentId = :agentId', { agentId: params.agentId });
    }

    if (params.status) {
      qb.andWhere('conversation.status = :status', {
        status: params.status,
      });
    }

    if (params.channel) {
      qb.andWhere('conversation.channel = :channel', { channel: params.channel });
    }

    if (params.hasLead !== undefined) {
      qb.andWhere(`conversation.leadId IS ${params.hasLead ? 'NOT' : ''} NULL`);
    }

    if (params.leadStatus) {
      qb.andWhere('lead.status = :leadStatus', { leadStatus: params.leadStatus });
    }

    if (params.funnelStage) {
      qb.andWhere('conversation.funnelStage = :funnelStage', { funnelStage: params.funnelStage });
    }

    if (params.acquisitionChannel) {
      qb.andWhere('conversation.acquisitionChannel = :acquisitionChannel', { acquisitionChannel: params.acquisitionChannel });
    }

    if (params.search) {
      qb.andWhere(
        '(lead.name ILIKE :search OR lead.email ILIKE :search OR conversation.visitorId ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    const hasMore = skip + data.length < total;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        hasMore,
      },
    };
  }

  async attachLead(conversationId: string, tenantId: string, leadId: string) {
    const conversation = await this.convRepo.findOne({ where: { id: conversationId, tenantId } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const lead = await this.leadsService.findById(leadId, tenantId, conversation.businessId);
    conversation.leadId = lead.id;
    await this.convRepo.save(conversation);

    return {
      ...conversation,
      lead,
    };
  }

  async updateStatus(conversationId: string, tenantId: string, status: Conversation['status']) {
    const conversation = await this.convRepo.findOne({ where: { id: conversationId, tenantId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    conversation.status = status;
    await this.convRepo.save(conversation);

    if (status === ConversationStatus.CLOSED) {
      this.webhookService.trigger('conversation.closed', tenantId, {
        conversationId: conversation.id,
        agentId: conversation.agentId,
        leadId: conversation.leadId,
        fitScore: conversation.fitScore,
        purchaseProbability: conversation.purchaseProbability,
        funnelStage: conversation.funnelStage,
      });
    }

    return conversation;
  }
}
