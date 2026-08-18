import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { AgentsService } from '../agents/agents.service';
import { OllamaService, OllamaMessage } from './ollama.service';
import { LeadsService } from '../leads/leads.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ProductsService } from '../products/products.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { FlowsService } from '../flows/flows.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { ListConversationsDto } from './dto/list-conversations.dto';

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
const PHONE_REGEX = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
const NAME_PATTERNS = [
  /je m'appelle\s+([a-zA-ZÀ-ÿ'-]+)/i,
  /mon nom est\s+([a-zA-ZÀ-ÿ'-]+)/i,
  /je suis\s+([a-zA-ZÀ-ÿ'-]+)/i,
];

const SLASH_COMMANDS: Record<string, string> = {
  '/help': `Voici les commandes disponibles:
/help — Afficher l'aide
/contact — Laisser ses coordonnées
/products — Voir nos produits/services
/human — Parler à un humain`,
  '/products': `Pour voir nos produits et services, posez-moi directement vos questions ! Je peux vous renseigner sur les tarifs, les fonctionnalités et les options disponibles.`,
  '/contact': `Pour être recontacté, laissez-moi votre nom, votre email et/ou votre numéro de téléphone dans le chat. Je transmettrai ces informations à notre équipe.`,
};

interface ExtractedData {
  email?: string;
  phone?: string;
  name?: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly agentsService: AgentsService,
    private readonly ollamaService: OllamaService,
    private readonly leadsService: LeadsService,
    @Inject(forwardRef(() => KnowledgeService))
    private readonly knowledgeService: KnowledgeService,
    private readonly productsService: ProductsService,
    private readonly integrationsService: IntegrationsService,
    private readonly flowsService: FlowsService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  async sendMessage(
    tenantId: string,
    agentId: string,
    userMessage: string,
    conversationId?: string,
    visitorId?: string,
    captureLead = true,
  ): Promise<{ reply: string; conversationId: string; leadId?: string; flow?: { id: string; title: string; fields: any[] } | null }> {
    const agent = await this.agentsService.findById(agentId, tenantId);

    let conversation: Conversation;
    let createdLeadId: string | undefined;
    if (conversationId) {
      conversation = await this.convRepo.findOne({
        where: { id: conversationId, tenantId },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
    } else {
      conversation = await this.convRepo.save(
        this.convRepo.create({ agentId, tenantId, visitorId }),
      );

      if (captureLead !== false) {
        const lead = await this.leadsService.create(tenantId, {
          agentId,
          source: 'chat',
          metadata: {
            conversationId: conversation.id,
            visitorId,
            autoCaptured: true,
          },
        });
        createdLeadId = lead.id;
        await this.convRepo.update(conversation.id, { leadId: lead.id });
        conversation.leadId = lead.id;
      }
    }

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: userMessage,
      }),
    );

    if (conversation.leadId) {
      const extracted = this.extractData(userMessage);
      if (extracted.email || extracted.phone || extracted.name) {
        await this.updateLeadData(conversation.leadId, tenantId, extracted);
      }
    }

    const cmd = userMessage.trim().toLowerCase();
    if (cmd === '/human') {
      await this.convRepo.update(conversation.id, { status: ConversationStatus.HANDED_OFF });
      const handoffReply = `Votre conversation a été transférée à un agent humain. Quelqu'un vous répondra prochainement. Vos coordonnées ont été enregistrées pour faciliter le suivi.`;
      await this.msgRepo.save(
        this.msgRepo.create({
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          content: handoffReply,
        }),
      );
      return { reply: handoffReply, conversationId: conversation.id, leadId: conversation.leadId };
    }

    if (SLASH_COMMANDS[cmd]) {
      let cmdReply = SLASH_COMMANDS[cmd];

      if (cmd === '/products') {
        try {
          const { data: products } = await this.productsService.findByTenant(tenantId, { limit: 5 });
          if (products.length > 0) {
            cmdReply = `Voici nos produits disponibles:\n\n` + products
              .map((p) => `• ${p.name} — ${p.price}${p.currency === 'EUR' ? '€' : ' ' + p.currency}${p.stock > 0 ? '' : ' (rupture)'}${p.description ? `\n  ${p.description.slice(0, 100)}` : ''}`)
              .join('\n\n');
          }
        } catch {
          // Keep default reply
        }
      }

      await this.msgRepo.save(
        this.msgRepo.create({
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          content: cmdReply,
        }),
      );
      return { reply: cmdReply, conversationId: conversation.id, leadId: conversation.leadId };
    }

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

    if (conversation.leadId) {
      try {
        const lead = await this.leadsService.findById(conversation.leadId, tenantId);
        const profileParts: string[] = [];
        if (lead.name) profileParts.push(`Nom du visiteur: ${lead.name}`);
        if (lead.email) profileParts.push(`Email: ${lead.email}`);
        if (lead.phone) profileParts.push(`Téléphone: ${lead.phone}`);
        if (lead.score > 0) profileParts.push(`Score d'engagement: ${lead.score}/100`);
        if (lead.metadata?.autoCaptured) profileParts.push(`Visiteur auto-capturé`);

        if (profileParts.length > 0) {
          messages.splice(1, 0, {
            role: 'system',
            content: `Profil du visiteur (adapte ton ton et tes réponses en fonction):\n${profileParts.join('\n')}`,
          });
        }
      } catch {
        // Lead not found — continue without profile
      }
    }

    let relevantContext: string[] = [];
    try {
      relevantContext = await this.knowledgeService.searchRelevant(tenantId, userMessage);
    } catch {
      // Knowledge search is optional — continue without context
    }

    if (relevantContext.length > 0) {
      const contextBlock = relevantContext
        .map((ctx, i) => `[Context ${i + 1}]: ${ctx}`)
        .join('\n\n');
      messages.splice(1, 0, {
        role: 'system',
        content: `Voici des informations issues de la base de connaissances. Utilise-les pour répondre si pertinent:\n\n${contextBlock}`,
      });
    }

    let productsContext = '';
    try {
      const products = await this.productsService.searchRelevant(tenantId, userMessage);
      if (products.length > 0) {
        productsContext = products
          .map((p) => `- ${p.name}: ${p.price}${p.currency === 'EUR' ? '€' : ' ' + p.currency} (stock: ${p.stock})${p.description ? ` — ${p.description.slice(0, 200)}` : ''}${p.productUrl ? ` [${p.productUrl}]` : ''}`)
          .join('\n');
        messages.splice(1, 0, {
          role: 'system',
          content: `Catalogue produits pertinents pour cette conversation. Utilise-les pour recommander des produits, donner des prix et vérifier la disponibilité:\n${productsContext}`,
        });
      }
    } catch {
      // Products search is optional
    }

    const reply = await this.ollamaService.chat(messages);

    let finalReply = reply;

    const lowerMsg = userMessage.toLowerCase();
    const wantsToBuy = /acheter|payer|commander|combien|prix|tarif|co[uû]te|payment|checkout|commande/.test(lowerMsg);
    const wantsMeeting = /rendez-vous|rdv|appointment|meeting|consultation|appel|d[eé]monstration|demo/.test(lowerMsg);

    if (wantsToBuy) {
      try {
        const products = await this.productsService.searchRelevant(tenantId, userMessage);
        if (products.length > 0) {
          const product = products[0];
          const link = await this.integrationsService.createStripePaymentLink(
            tenantId, product.id, product.name, product.price, product.currency.toLowerCase(),
          );
          finalReply += `\n\nVous pouvez commander ici: ${link.url}`;
        }
      } catch {
        // Stripe not configured — skip
      }
    }

    if (wantsMeeting) {
      try {
        const events = await this.integrationsService.getCalendlyEventTypes(tenantId);
        if (events.length > 0) {
          const eventList = events.map((e: any) => `- ${e.name} (${e.duration}min): ${e.url}`).join('\n');
          finalReply += `\n\nVous pouvez réserver un créneau ici:\n${eventList}`;
        }
      } catch {
        // Calendly not configured — skip
      }
    }

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: finalReply,
      }),
    );

    const responseLeadId = conversation.leadId ?? createdLeadId;

    let flowData: { id: string; title: string; fields: any[] } | null = null;
    try {
      const intent = await this.flowsService.detectFlowIntent(userMessage);
      if (intent) {
        const flow = await this.flowsService.getFlowForIntent(tenantId, agentId, intent);
        if (flow) {
          flowData = { id: flow.id, title: flow.title, fields: flow.fields };
        }
      }
    } catch {
      // Flow detection is optional
    }

    try {
      this.intelligenceService.recordConversation(
        tenantId,
        conversation.id,
        responseLeadId ?? null,
        userMessage,
        finalReply,
        relevantContext.length > 0,
        productsContext !== '',
        flowData?.title ?? null,
      );
    } catch {
      // Intelligence recording is optional
    }

    return { reply: finalReply, conversationId: conversation.id, leadId: responseLeadId, flow: flowData };
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

    const lead = await this.leadsService.findById(leadId, tenantId);
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
    return conversation;
  }

  private extractData(text: string): ExtractedData {
    const data: ExtractedData = {};

    const emailMatch = text.match(EMAIL_REGEX);
    if (emailMatch) data.email = emailMatch[0];

    const phoneMatch = text.match(PHONE_REGEX);
    if (phoneMatch) data.phone = phoneMatch[0].replace(/\s/g, '');

    for (const pattern of NAME_PATTERNS) {
      const nameMatch = text.match(pattern);
      if (nameMatch) {
        data.name = nameMatch[1].trim();
        break;
      }
    }

    return data;
  }

  private async updateLeadData(leadId: string, tenantId: string, data: ExtractedData): Promise<void> {
    const lead = await this.leadsService.findById(leadId, tenantId);
    const updates: Partial<typeof lead> = {};
    if (data.email && !lead.email) updates.email = data.email;
    if (data.phone && !lead.phone) updates.phone = data.phone;
    if (data.name && !lead.name) updates.name = data.name;

    if (Object.keys(updates).length > 0) {
      const newScore = lead.score + 10;
      updates.score = newScore;
      if (newScore >= 20 && lead.status === 'new') {
        updates.status = 'contacted' as any;
      }
      await this.leadsService.update(leadId, tenantId, updates);
    }
  }
}
