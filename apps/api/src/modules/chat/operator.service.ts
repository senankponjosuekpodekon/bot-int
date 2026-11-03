import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationChannel, ConversationState, ConversationStatus } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { ChatEventsService } from './chat-events.service';
import { LLMService } from './llm.service';
import { OllamaMessage } from './ollama.service';
import { IntegrationsService } from '../integrations/integrations.service';

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
    private readonly integrationsService: IntegrationsService,
  ) {}

  private readonly logger = new Logger(OperatorService.name);

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

    // Deliver the operator reply through the conversation's outbound channel —
    // without this the dashboard message stays DB-side and the WhatsApp client
    // never sees it. Legacy rows have channel='web': fall back to inferring the
    // channel from the visitorId prefix (whatsapp_/instagram_/telegram_/email_/sms_).
    const visitorId = conversation.visitorId || '';
    const inferred = visitorId.split('_')[0];
    const channel = (conversation.channel && conversation.channel !== ConversationChannel.WEB)
      ? conversation.channel
      : (Object.values(ConversationChannel) as string[]).includes(inferred)
      ? (inferred as ConversationChannel)
      : conversation.channel;
    const to = visitorId.includes('_') ? visitorId.slice(visitorId.indexOf('_') + 1) : visitorId;
    try {
      if (channel === ConversationChannel.WHATSAPP) {
        await this.integrationsService.sendWhatsApp(tenantId, to, content);
      } else if (channel === ConversationChannel.INSTAGRAM) {
        await this.integrationsService.sendInstagram(tenantId, to, content);
      } else if (channel === ConversationChannel.TELEGRAM) {
        await this.integrationsService.sendTelegram(tenantId, to, content);
      } else if (channel === ConversationChannel.EMAIL) {
        await this.integrationsService.sendEmail(tenantId, to, 'Support', content);
      } else if (channel === ConversationChannel.SMS) {
        await this.integrationsService.sendSMS(tenantId, to, content);
      }
    } catch (err: any) {
      this.logger.error(`Operator reply failed to reach ${channel} recipient ${to}: ${err?.message}`);
      // keep the saved message — the error is logged, not fatal to the operator
    }
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
