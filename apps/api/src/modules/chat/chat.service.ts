import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Conversation, ConversationStatus, FunnelStage, AcquisitionChannel } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { AgentFeedback } from './agent-feedback.entity';
import { AgentsService } from '../agents/agents.service';
import { OllamaService, OllamaMessage } from './ollama.service';
import { LeadsService } from '../leads/leads.service';
import { LeadTagService } from '../leads/lead-tag.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ProductsService } from '../products/products.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { FlowsService } from '../flows/flows.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { BillingService } from '../billing/billing.service';
import { RegionsService } from '../regions/regions.service';
import { RegionCode } from '../regions/region-profile.types';
import { WebhookService } from '../webhooks/webhook.service';
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
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(AgentFeedback)
    private readonly feedbackRepo: Repository<AgentFeedback>,
    private readonly agentsService: AgentsService,
    private readonly ollamaService: OllamaService,
    private readonly leadsService: LeadsService,
    private readonly leadTagService: LeadTagService,
    @Inject(forwardRef(() => KnowledgeService))
    private readonly knowledgeService: KnowledgeService,
    private readonly productsService: ProductsService,
    private readonly integrationsService: IntegrationsService,
    private readonly flowsService: FlowsService,
    private readonly intelligenceService: IntelligenceService,
    private readonly billingService: BillingService,
    private readonly regionsService: RegionsService,
    private readonly webhookService: WebhookService,
  ) {}

  async sendMessage(
    tenantId: string,
    agentId: string,
    userMessage: string,
    conversationId?: string,
    visitorId?: string,
    captureLead = true,
    tracking?: {
      utmParams?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
      referrerUrl?: string;
      landingPageUrl?: string;
      acquisitionChannel?: AcquisitionChannel;
    },
    regionContext?: {
      ip?: string;
      phone?: string;
      browserLanguage?: string;
      timezone?: string;
      userSelectedRegion?: RegionCode;
    },
  ): Promise<{ reply: string; conversationId: string; leadId?: string; flow?: { id: string; title: string; fields: any[] } | null; products?: any[]; funnelStage?: FunnelStage; intentScore?: number; region?: RegionCode }> {
    const agent = await this.agentsService.findById(agentId, tenantId);
    const personalityConfig = agent.personalityConfig || {};

    // Detect region for regional adaptation
    let detectedRegion: RegionCode = 'international';
    try {
      detectedRegion = await this.regionsService.detectRegion({
        ip: regionContext?.ip,
        phone: regionContext?.phone,
        browserLanguage: regionContext?.browserLanguage,
        timezone: regionContext?.timezone,
        userSelectedRegion: regionContext?.userSelectedRegion,
      });
    } catch {
      // Region detection is optional — fallback to international
    }

    // Billing quota check
    try {
      const quota = await this.billingService.checkQuota(tenantId);
      if (!quota.allowed) {
        const limitReply = `Notre service est temporairement limité. Veuillez nous contacter pour continuer la conversation.`;
        const tempConv = await this.convRepo.save(
          this.convRepo.create({ agentId, tenantId, visitorId }),
        );
        await this.msgRepo.save(this.msgRepo.create({ conversationId: tempConv.id, role: MessageRole.USER, content: userMessage }));
        await this.msgRepo.save(this.msgRepo.create({ conversationId: tempConv.id, role: MessageRole.ASSISTANT, content: limitReply }));
        return { reply: limitReply, conversationId: tempConv.id, leadId: undefined };
      }
    } catch (err: any) {
      this.logger.warn(`Billing check skipped: ${err?.message}`);
    }

    // Business hours check
    if (personalityConfig.autoReplyMode && personalityConfig.autoReplyMode !== 'always') {
      const inHours = this.isWithinBusinessHours(personalityConfig.businessHours);
      if (personalityConfig.autoReplyMode === 'business_hours' && !inHours) {
        const afterHoursReply = personalityConfig.aiDisclosureMessage || 
          `Notre équipe est actuellement indisponible. Nos horaires sont ${personalityConfig.businessHours?.start} - ${personalityConfig.businessHours?.end}. Laissez-nous votre message, nous vous répondrons dès notre retour.`;
        const tempConv = await this.convRepo.save(
          this.convRepo.create({ agentId, tenantId, visitorId }),
        );
        await this.msgRepo.save(this.msgRepo.create({ conversationId: tempConv.id, role: MessageRole.USER, content: userMessage }));
        await this.msgRepo.save(this.msgRepo.create({ conversationId: tempConv.id, role: MessageRole.ASSISTANT, content: afterHoursReply }));
        return { reply: afterHoursReply, conversationId: tempConv.id, leadId: undefined };
      }
    }

    let conversation: Conversation;
    let createdLeadId: string | undefined;
    let isReturningVisitor = false;

    if (conversationId) {
      conversation = await this.convRepo.findOne({
        where: { id: conversationId, tenantId },
      });
      if (!conversation) throw new NotFoundException('Conversation not found');
    } else {
      // Check for returning visitor (cross-conversation memory)
      if (visitorId) {
        const previousConvs = await this.convRepo.find({
          where: { agentId, tenantId, visitorId },
          order: { createdAt: 'DESC' },
          take: 1,
        });
        if (previousConvs.length > 0) {
          isReturningVisitor = true;
        }
      }

      conversation = await this.convRepo.save(
        this.convRepo.create({
          agentId, tenantId, visitorId,
          utmParams: tracking?.utmParams || {},
          referrerUrl: tracking?.referrerUrl || null,
          landingPageUrl: tracking?.landingPageUrl || null,
          acquisitionChannel: tracking?.acquisitionChannel || this.detectAcquisitionChannel(tracking),
          funnelStage: FunnelStage.AWARENESS,
          intentScore: 0,
          stageHistory: [FunnelStage.AWARENESS],
        }),
      );

      this.webhookService.trigger('conversation.created', tenantId, {
        conversationId: conversation.id,
        agentId,
        visitorId,
        channel: 'web',
      }).catch(() => {});

      if (captureLead !== false) {
        const autoTags = this.leadTagService.autoTag({
          message: userMessage,
          source: 'chat',
          acquisitionChannel: conversation.acquisitionChannel,
          channel: 'web',
          language: regionContext?.browserLanguage,
          agentType: agent.type,
        });
        const lead = await this.leadsService.create(tenantId, {
          agentId,
          source: 'chat',
          tags: autoTags,
          metadata: {
            conversationId: conversation.id,
            visitorId,
            autoCaptured: true,
          },
        });
        createdLeadId = lead.id;
        await this.convRepo.update(conversation.id, { leadId: lead.id });
        conversation.leadId = lead.id;

        this.webhookService.trigger('lead.created', tenantId, {
          leadId: lead.id,
          agentId,
          conversationId: conversation.id,
          source: 'chat',
        }).catch(() => {});
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
      { role: 'system', content: this.regionsService.buildSystemPrompt(agent.systemPrompt, detectedRegion) },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    // Returning visitor memory: inject summary of past conversations
    if (isReturningVisitor && visitorId) {
      try {
        const pastSummary = await this.getVisitorMemory(agentId, tenantId, visitorId);
        if (pastSummary) {
          messages.splice(1, 0, {
            role: 'system',
            content: `Ce visiteur est de retour. Voici un résumé de ses conversations précédentes:\n${pastSummary}\n\nUtilise ces informations pour personnaliser ton accueil. Par exemple: "Bonjour [nom], ravi de vous revoir !" ou référence à sa demande précédente si pertinent.`,
          });
        }
      } catch {
        // Memory retrieval is optional
      }
    }

    // Apply feedback corrections to system prompt
    try {
      const recentFeedback = await this.feedbackRepo.find({
        where: { agentId, tenantId, appliedToPrompt: false },
        take: 5,
        order: { createdAt: 'DESC' },
      });
      if (recentFeedback.length > 0) {
        const corrections = recentFeedback
          .map((f) => `Quand l'utilisateur demande quelque chose similaire à "${f.userMessage.slice(0, 100)}", réponds plutôt: "${f.correctedReply.slice(0, 300)}"`)
          .join('\n');
        messages.splice(1, 0, {
          role: 'system',
          content: `Corrections apportées par l'administrateur (applique ces préférences):\n${corrections}`,
        });
        // Mark feedback as applied
        for (const f of recentFeedback) {
          await this.feedbackRepo.update(f.id, { appliedToPrompt: true });
        }
      }
    } catch {
      // Feedback is optional
    }

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
    let carouselProducts: any[] = [];
    try {
      const products = await this.productsService.searchRelevant(tenantId, userMessage);
      if (products.length > 0) {
        carouselProducts = products.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency,
          image: p.imageUrl || p.metadata?.image || null,
          url: p.productUrl || null,
          stock: p.stock,
          description: p.description ? p.description.slice(0, 120) : '',
        }));
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

    // Funnel stage detection and agent behavior adaptation
    const detectedStage = this.detectFunnelStage(userMessage, conversation.funnelStage);
    if (detectedStage !== conversation.funnelStage) {
      const stageHistory = [...(conversation.stageHistory || []), detectedStage];
      await this.convRepo.update(conversation.id, { funnelStage: detectedStage, stageHistory });
      conversation.funnelStage = detectedStage;
    }

    // Intent score calculation
    const newIntentScore = this.calculateIntentScore(userMessage, conversation.intentScore);
    if (newIntentScore !== conversation.intentScore) {
      await this.convRepo.update(conversation.id, { intentScore: newIntentScore });
      conversation.intentScore = newIntentScore;
    }

    if (conversation.leadId) {
      const messageTags = this.leadTagService.autoTag({
        message: userMessage,
        funnelStage: conversation.funnelStage,
      });
      if (messageTags.length > 0) {
        try {
          const lead = await this.leadsService.findById(conversation.leadId, tenantId);
          const merged = this.leadTagService.mergeTags(lead.tags, messageTags);
          if (merged.length !== (lead.tags || []).length) {
            await this.leadsService.update(conversation.leadId, tenantId, { tags: merged });
          }
        } catch {
          // Lead not found — skip tagging
        }
      }
    }

    // Inject funnel-stage-aware system prompt
    const stageGuidance = this.getStageGuidance(conversation.funnelStage);
    if (stageGuidance) {
      messages.splice(1, 0, {
        role: 'system',
        content: stageGuidance,
      });
    }

    const reply = await this.ollamaService.chat(messages);

    let finalReply = reply;

    // AI disclosure (genuine transparency)
    if (personalityConfig.discloseAI && conversationId === undefined) {
      const disclosure = personalityConfig.aiDisclosureMessage || 
        '\n\n— Message généré par notre assistant IA. Un agent humain peut prendre le relais à tout moment.';
      if (!finalReply.includes('assistant IA') && !finalReply.includes('généré par')) {
        finalReply += disclosure;
      }
    }

    // Escalation check: if topic matches escalation topics, hand off
    if (personalityConfig.escalationTopics && personalityConfig.escalationTopics.length > 0) {
      const lowerMsg = userMessage.toLowerCase();
      const shouldEscalate = personalityConfig.escalationTopics.some((topic) =>
        lowerMsg.includes(topic.toLowerCase()),
      );
      if (shouldEscalate) {
        await this.convRepo.update(conversation.id, { status: ConversationStatus.HANDED_OFF });
        finalReply += '\n\nJe transfère votre demande à un agent humain qui pourra mieux vous aider sur ce sujet.';
      }
    }

    // Pacing: simulate natural response delay
    if (personalityConfig.pacingEnabled !== false) {
      const minDelay = personalityConfig.minDelayMs || 500;
      const maxDelay = personalityConfig.maxDelayMs || 2500;
      const wordCount = finalReply.split(/\s+/).length;
      const baseDelay = Math.min(wordCount * 30, maxDelay);
      const delay = Math.max(minDelay, Math.min(baseDelay, maxDelay));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

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

    // Billing metering: increment usage
    try {
      await this.billingService.incrementUsage(tenantId);
    } catch (err: any) {
      this.logger.warn(`Billing metering skipped: ${err?.message}`);
    }

    return { reply: finalReply, conversationId: conversation.id, leadId: responseLeadId, flow: flowData, products: carouselProducts.length > 0 ? carouselProducts : undefined, funnelStage: conversation.funnelStage, intentScore: conversation.intentScore, region: detectedRegion };
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

  // ─── Visitor memory: summarize past conversations for returning visitors ───
  private async getVisitorMemory(agentId: string, tenantId: string, visitorId: string): Promise<string | null> {
    const pastConvs = await this.convRepo.find({
      where: { agentId, tenantId, visitorId },
      order: { createdAt: 'DESC' },
      take: 3,
    });

    if (pastConvs.length === 0) return null;

    const summaries: string[] = [];
    for (const conv of pastConvs) {
      const msgs = await this.msgRepo.find({
        where: { conversationId: conv.id },
        order: { createdAt: 'ASC' },
        take: 10,
      });
      if (msgs.length === 0) continue;

      const userMsgs = msgs.filter((m) => m.role === MessageRole.USER).map((m) => m.content).join(' | ');
      const agentMsgs = msgs.filter((m) => m.role === MessageRole.ASSISTANT).map((m) => m.content.slice(0, 100)).join(' | ');
      const date = new Date(conv.createdAt).toLocaleDateString('fr-FR');

      let leadInfo = '';
      if (conv.leadId) {
        try {
          const lead = await this.leadsService.findById(conv.leadId, tenantId);
          if (lead.name) leadInfo += `Nom: ${lead.name}. `;
          if (lead.email) leadInfo += `Email: ${lead.email}. `;
        } catch {}
      }

      summaries.push(`[${date}] ${leadInfo}Visiteur a demandé: "${userMsgs.slice(0, 300)}". Réponse donnée: "${agentMsgs.slice(0, 200)}"`);
    }

    return summaries.length > 0 ? summaries.join('\n') : null;
  }

  // ─── Business hours check ───
  private isWithinBusinessHours(hours?: { start: string; end: string; days: number[] }): boolean {
    if (!hours || !hours.start || !hours.end) return true;
    const now = new Date();
    const day = now.getDay();
    if (hours.days && hours.days.length > 0 && !hours.days.includes(day)) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // ─── Feedback CRUD ───
  async createFeedback(
    tenantId: string,
    agentId: string,
    userMessage: string,
    originalReply: string,
    correctedReply: string,
    reason?: string,
  ): Promise<AgentFeedback> {
    return this.feedbackRepo.save(
      this.feedbackRepo.create({ tenantId, agentId, userMessage, originalReply, correctedReply, reason }),
    );
  }

  async getFeedback(tenantId: string, agentId?: string): Promise<AgentFeedback[]> {
    if (agentId) {
      return this.feedbackRepo.find({ where: { tenantId, agentId }, order: { createdAt: 'DESC' } });
    }
    return this.feedbackRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async deleteFeedback(id: string, tenantId: string): Promise<void> {
    await this.feedbackRepo.delete({ id, tenantId });
  }

  // ─── Funnel stage detection ───
  private detectFunnelStage(message: string, currentStage: FunnelStage): FunnelStage {
    const msg = message.toLowerCase();
    const stageOrder = [
      FunnelStage.AWARENESS,
      FunnelStage.INTEREST,
      FunnelStage.QUALIFICATION,
      FunnelStage.CONSIDERATION,
      FunnelStage.DECISION,
    ];
    const currentIndex = stageOrder.indexOf(currentStage);

    // Decision signals — ready to buy/book
    if (/acheter|payer|commander|checkout|payment|je prends|je veux|valider|confirmer|c'est parti|go|ok je|parfait/.test(msg)) {
      return FunnelStage.DECISION;
    }

    // Consideration signals — asking for quotes, comparisons, recommendations
    if (/devis|tarif|prix|combien|co[uû]te|compar|recommand|lequel|quelle option|diff[eé]rence|avantage/.test(msg)) {
      return Math.max(currentIndex, 3) >= 3 ? FunnelStage.CONSIDERATION : FunnelStage.CONSIDERATION;
    }

    // Qualification signals — sharing info about themselves, budget, needs
    if (/budget|j'ai besoin|je cherche|mon projet|ma situation|urgence|d[eé]lai|quand|pour quand|mon besoin/.test(msg)) {
      return Math.max(currentIndex, 2) >= 2 ? FunnelStage.QUALIFICATION : FunnelStage.QUALIFICATION;
    }

    // Interest signals — asking questions about product/service
    if (/comment|pourquoi|qu'est-ce|c'est quoi|fonctionne|vous faites|vous proposez|service|produit|capacit[eé]|possible de/.test(msg)) {
      return Math.max(currentIndex, 1) >= 1 ? FunnelStage.INTEREST : FunnelStage.INTEREST;
    }

    return currentStage;
  }

  // ─── Intent score calculation (0-100) ───
  private calculateIntentScore(message: string, currentScore: number): number {
    const msg = message.toLowerCase();
    let delta = 0;

    // High intent signals
    if (/acheter|payer|commander|checkout|je prends|je veux bien|valider|confirmer/.test(msg)) delta += 15;
    if (/devis|tarif|prix|combien|co[uû]te/.test(msg)) delta += 10;
    if (/rendez-vous|rdv|appointment|meeting|consultation|d[eé]mo/.test(msg)) delta += 10;
    if (/budget|j'ai besoin|urgence|d[eé]lai/.test(msg)) delta += 8;
    if (/contact|t[eé]l[eé]phone|email|appeler|recontacter/.test(msg)) delta += 5;
    if (/int[eé]ress[eé]|plut[^o]t|j'aime|bien|parfait/.test(msg)) delta += 5;

    // Negative signals
    if (/trop cher|pas maintenant|je r[eé]fl[eé]chis|plus tard|pas int[eé]ress[eé]/.test(msg)) delta -= 10;
    if (/au revoir|merci|c'est tout|rien d'autre/.test(msg)) delta -= 3;

    return Math.max(0, Math.min(100, currentScore + delta));
  }

  // ─── Acquisition channel detection from tracking data ───
  private detectAcquisitionChannel(tracking?: {
    utmParams?: { source?: string; medium?: string; campaign?: string };
    referrerUrl?: string;
    landingPageUrl?: string;
  }): AcquisitionChannel {
    if (!tracking) return AcquisitionChannel.UNKNOWN;

    const utm = tracking.utmParams;
    if (utm?.source) {
      const src = utm.source.toLowerCase();
      if (src.includes('facebook') || src.includes('instagram') || src.includes('meta')) return AcquisitionChannel.META_ADS;
      if (src.includes('google') || src.includes('adwords')) return AcquisitionChannel.GOOGLE_ADS;
      if (src.includes('newsletter') || src.includes('email')) return AcquisitionChannel.EMAIL;
      if (utm.medium === 'social' || src.includes('social')) return AcquisitionChannel.SOCIAL;
      if (src.includes('referral')) return AcquisitionChannel.REFERRAL;
    }

    if (tracking.referrerUrl) {
      const ref = tracking.referrerUrl.toLowerCase();
      if (ref.includes('facebook') || ref.includes('instagram')) return AcquisitionChannel.SOCIAL;
      if (ref.includes('google.')) return AcquisitionChannel.ORGANIC;
      if (ref.includes('t.co') || ref.includes('twitter') || ref.includes('linkedin')) return AcquisitionChannel.SOCIAL;
    }

    if (tracking.landingPageUrl) {
      const landing = tracking.landingPageUrl.toLowerCase();
      if (landing.includes('/site/')) return AcquisitionChannel.LANDING_PAGE;
      if (landing.includes('/chat/')) return AcquisitionChannel.PUBLIC_LINK;
      if (landing.includes('qr=')) return AcquisitionChannel.QR_CODE;
    }

    return AcquisitionChannel.UNKNOWN;
  }

  // ─── Stage-specific guidance for the agent ───
  private getStageGuidance(stage: FunnelStage): string | null {
    const guidance: Record<FunnelStage, string> = {
      [FunnelStage.AWARENESS]: `Le visiteur découvre votre entreprise. Sois accueillant, pose des questions ouvertes pour comprendre son besoin. Ne sois pas commercial. Objectif: comprendre ce qu'il cherche et l'orienter.`,
      [FunnelStage.INTEREST]: `Le visiteur montre de l'intérêt. Renseigne-le sur vos services/produits, explique les bénéfices clés. Pose des questions pour qualifier son besoin (contexte, usage attendu). Objectif: approfondir la conversation.`,
      [FunnelStage.QUALIFICATION]: `Le visiteur partage des informations sur son besoin/budget/délai. Qualifie-le: budget, urgence, décisionnaire, critères. Si le profil correspond, propose une solution concrète. Objectif: valider le fit.`,
      [FunnelStage.CONSIDERATION]: `Le visiteur évalue vos solutions. Donne des détails précis (prix, comparaison, options). Adresse ses objections. Propose un devis ou une démo. Objectif: l'aider à décider.`,
      [FunnelStage.DECISION]: `Le visiteur est prêt à acheter/réserver. Facilite l'action: lien de paiement, prise de RDV, confirmation de commande. Sois direct et rassurant. Objectif: closing.`,
      [FunnelStage.CLOSED_WON]: `Le visiteur a converti. Remercie-le, confirme les prochaines étapes, propose un suivi. Objectif: fidélisation.`,
      [FunnelStage.CLOSED_LOST]: `Le visiteur n'est pas prêt ou a refusé. Reste courtois, propose de revenir vers lui plus tard, laisse une bonne impression. Objectif: nurturing.`,
    };
    return guidance[stage] || null;
  }
}
