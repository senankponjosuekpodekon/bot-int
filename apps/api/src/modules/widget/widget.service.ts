import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { ChatService } from '../chat/chat.service';
import { Conversation, ConversationChannel } from '../chat/conversation.entity';
import { Message } from '../chat/message.entity';
import { FlowsService } from '../flows/flows.service';

@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly chatService: ChatService,
    private readonly flowsService: FlowsService,
  ) {}

  private async loadAgent(agentId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId, isActive: true } });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  // Public-facing widget config — never expose systemPrompt or tenant internals.
  async getPublicConfig(agentId: string): Promise<{
    id: string;
    name: string;
    personality: string;
    iceBreakers: string[];
  }> {
    const agent = await this.loadAgent(agentId);
    return {
      id: agent.id,
      name: agent.name,
      personality: agent.personality || '',
      iceBreakers: agent.iceBreakers || [],
    };
  }

  async getAgentConfig(agentId: string): Promise<{
    id: string;
    name: string;
    tenantId: string;
    personality: string;
    iceBreakers: string[];
  }> {
    const agent = await this.loadAgent(agentId);
    return {
      id: agent.id,
      name: agent.name,
      tenantId: agent.tenantId,
      personality: agent.personality || '',
      iceBreakers: agent.iceBreakers || [],
    };
  }

  // A public client may only access a conversation it owns (matching visitorId).
  async assertPublicConversation(conversationId: string, visitorId?: string): Promise<Conversation> {
    const conversation = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.visitorId && conversation.visitorId !== visitorId) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async getConversationHistory(conversationId: string, visitorId?: string): Promise<any[]> {
    const conversation = await this.assertPublicConversation(conversationId, visitorId);
    return this.msgRepo.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'ASC' },
      take: 500,
    });
  }

  // Resolves /widget/history/:id where :id may be a conversationId or an agentId.
  async resolvePublicHistory(id: string, visitorId?: string): Promise<any[]> {
    if (visitorId) {
      const conversation = await this.convRepo.findOne({ where: { id, visitorId } });
      if (conversation) {
        return this.msgRepo.find({
          where: { conversationId: conversation.id },
          order: { createdAt: 'ASC' },
          take: 500,
        });
      }
    }
    return this.getPublicHistory(id, visitorId || '');
  }

  async sendPublicMessage(
    agentId: string,
    message: string,
    visitorId: string,
    conversationId?: string,
    utmParams?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string },
    referrerUrl?: string,
    landingPageUrl?: string,
  ): Promise<{ reply: string; conversationId: string; leadId?: string; flow?: any }> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId, isActive: true } });
    if (!agent) throw new NotFoundException('Agent not found');

    return this.chatService.sendMessage(
      agent.tenantId,
      agentId,
      message,
      conversationId,
      visitorId,
      true,
      { utmParams, referrerUrl, landingPageUrl },
      undefined,
      undefined,
      ConversationChannel.WEB,
    );
  }

  async getPublicHistory(agentId: string, visitorId: string): Promise<any[]> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId, isActive: true } });
    if (!agent) throw new NotFoundException('Agent not found');

    const conversation = await this.convRepo.findOne({
      where: { agentId, visitorId },
      order: { createdAt: 'DESC' },
    });

    if (!conversation) return [];

    return this.msgRepo.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'ASC' },
    });
  }

  async submitFlowResponse(
    agentId: string,
    conversationId: string,
    flowId: string,
    responses: Record<string, string>,
    visitorId: string,
  ): Promise<any> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId, isActive: true } });
    if (!agent) throw new NotFoundException('Agent not found');

    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId: agent.tenantId, visitorId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.flowsService.processFlowResponse(agent.tenantId, conversationId, flowId, responses);
  }
}
