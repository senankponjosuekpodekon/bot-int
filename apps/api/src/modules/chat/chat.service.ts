import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { AgentsService } from '../agents/agents.service';
import { OllamaService, OllamaMessage } from './ollama.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly agentsService: AgentsService,
    private readonly ollamaService: OllamaService,
  ) {}

  async sendMessage(
    tenantId: string,
    agentId: string,
    userMessage: string,
    conversationId?: string,
    visitorId?: string,
  ): Promise<{ reply: string; conversationId: string }> {
    const agent = await this.agentsService.findById(agentId, tenantId);

    let conversation: Conversation;
    if (conversationId) {
      conversation = await this.convRepo.findOne({
        where: { id: conversationId, tenantId },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
    } else {
      conversation = await this.convRepo.save(
        this.convRepo.create({ agentId, tenantId, visitorId }),
      );
    }

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: userMessage,
      }),
    );

    const history = await this.msgRepo.find({
      where: { conversationId: conversation.id },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    const messages: OllamaMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    const reply = await this.ollamaService.chat(messages);

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      }),
    );

    return { reply, conversationId: conversation.id };
  }

  async getHistory(conversationId: string, tenantId: string) {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async getConversations(tenantId: string) {
    return this.convRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}
