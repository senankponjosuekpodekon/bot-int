import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationState, ConversationStatus } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { ChatEventsService } from './chat-events.service';
import { LLMService } from './llm.service';
import { OllamaMessage } from './ollama.service';

// Human-in-the-loop operations: operator replies, take/release handoff, and
// LLM-suggested replies for the operator console.
@Injectable()
export class OperatorService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly chatEvents: ChatEventsService,
    private readonly llmService: LLMService,
  ) {}

  async operatorReply(conversationId: string, tenantId: string, content: string): Promise<Message> {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const message = this.msgRepo.create({
      conversationId,
      role: MessageRole.ASSISTANT,
      content,
      metadata: { isOperator: true },
    });

    conversation.status = ConversationStatus.HANDED_OFF;
    conversation.state = ConversationState.HANDED_OFF;
    await this.convRepo.save(conversation);

    const saved = await this.msgRepo.save(message);
    this.chatEvents.emitMessage(conversationId, {
      role: MessageRole.ASSISTANT,
      content,
      metadata: { isOperator: true },
      createdAt: saved.createdAt,
    });
    return saved;
  }

  // Operator takes over a handed-off conversation
  async takeConversation(conversationId: string, tenantId: string): Promise<Conversation> {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    conversation.status = ConversationStatus.HANDED_OFF;
    conversation.state = ConversationState.HANDED_OFF;
    return this.convRepo.save(conversation);
  }

  // Operator hands the conversation back to the AI
  async releaseConversation(conversationId: string, tenantId: string): Promise<Conversation> {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    conversation.status = ConversationStatus.OPEN;
    conversation.state = ConversationState.ANSWERING;
    return this.convRepo.save(conversation);
  }

  // Suggest an operator reply using the LLM
  async suggestReply(conversationId: string, tenantId: string): Promise<{ suggestion: string }> {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const history = (
      await this.msgRepo.find({
        where: { conversationId },
        order: { createdAt: 'DESC' },
        take: 20,
      })
    ).reverse();

    const systemPrompt =
      conversation.language === 'en'
        ? "You are a customer support assistant. Propose a short, professional reply that a human operator can send to the customer. Return only the operator's message, no explanation."
        : "Tu es un assistant du conseiller client. Propose une réponse courte et professionnelle qu'un opérateur humain peut envoyer au client. Renvoie uniquement le message de l'opérateur, sans explication.";

    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      { role: 'user', content: conversation.language === 'en' ? 'Suggest a reply for the operator.' : 'Suggère une réponse pour le conseiller.' },
    ];

    const suggestion = await this.llmService.chat(messages);
    return { suggestion: suggestion?.trim() || '' };
  }
}
