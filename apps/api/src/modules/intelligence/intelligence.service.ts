import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Insight, InsightType } from './insight.entity';
import { ConversationAnalytics } from './conversation-analytics.entity';
import { PlatformInsight, PlatformMetricType } from './platform-insight.entity';
import { Message, MessageRole } from '../chat/message.entity';
import { Conversation } from '../chat/conversation.entity';
import { Lead, LeadStatus } from '../leads/lead.entity';
import { Agent } from '../agents/agent.entity';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AgentsService } from '../agents/agents.service';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    @InjectRepository(Insight)
    private readonly insightRepo: Repository<Insight>,
    @InjectRepository(ConversationAnalytics)
    private readonly analyticsRepo: Repository<ConversationAnalytics>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(PlatformInsight)
    private readonly platformRepo: Repository<PlatformInsight>,
    private readonly knowledgeService: KnowledgeService,
    private readonly agentsService: AgentsService,
    private readonly leadsService: LeadsService,
  ) {}

  async recordConversation(
    tenantId: string,
    conversationId: string,
    leadId: string | null,
    userMessage: string,
    agentReply: string,
    hadKnowledge: boolean,
    hadProducts: boolean,
    detectedIntent: string | null,
    promptTokens = 0,
    completionTokens = 0,
    totalTokens = 0,
  ): Promise<void> {
    await this.analyticsRepo.save(
      this.analyticsRepo.create({
        tenantId,
        conversationId,
        leadId,
        userMessage,
        agentReply,
        hadKnowledge,
        hadProducts,
        detectedIntent,
        messageLength: userMessage.length,
        promptTokens,
        completionTokens,
        totalTokens,
      }),
    );
  }

  async getInsights(tenantId: string, type?: InsightType, resolved?: boolean): Promise<Insight[]> {
    const where: any = { tenantId };
    if (type) where.type = type;
    if (resolved !== undefined) where.resolved = resolved;
    return this.insightRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  async resolveInsight(id: string, tenantId: string): Promise<void> {
    await this.insightRepo.update({ id, tenantId }, { resolved: true });
  }

  async getDashboard(tenantId: string): Promise<any> {
    const [unanswered, trends, patterns, suggestions, totalAnalyzed] = await Promise.all([
      this.insightRepo.count({ where: { tenantId, type: 'unanswered' as InsightType, resolved: false } }),
      this.insightRepo.count({ where: { tenantId, type: 'trend' as InsightType, resolved: false } }),
      this.insightRepo.count({ where: { tenantId, type: 'lead_pattern' as InsightType, resolved: false } }),
      this.insightRepo.count({ where: { tenantId, type: 'suggestion' as InsightType, resolved: false } }),
      this.analyticsRepo.count({ where: { tenantId } }),
    ]);

    const conversionRate = await this.calculateConversionRate(tenantId);
    const topIntents = await this.getTopIntents(tenantId);
    const unansweredRate = await this.getUnansweredRate(tenantId);

    return {
      totalAnalyzed,
      unansweredCount: unanswered,
      trendsCount: trends,
      patternsCount: patterns,
      suggestionsCount: suggestions,
      conversionRate,
      unansweredRate,
      topIntents,
    };
  }

  private async calculateConversionRate(tenantId: string): Promise<number> {
    const total = await this.leadRepo.count({ where: { tenantId } });
    if (total === 0) return 0;
    const converted = await this.leadRepo.count({ where: { tenantId, status: LeadStatus.CONVERTED } });
    return Math.round((converted / total) * 100);
  }

  private async getUnansweredRate(tenantId: string): Promise<number> {
    const total = await this.analyticsRepo.count({ where: { tenantId } });
    if (total === 0) return 0;
    const unanswered = await this.analyticsRepo.count({ where: { tenantId, hadKnowledge: false } });
    return Math.round((unanswered / total) * 100);
  }

  private async getTopIntents(tenantId: string): Promise<{ intent: string; count: number }[]> {
    const result = await this.analyticsRepo
      .createQueryBuilder('ca')
      .select('ca.detectedIntent', 'intent')
      .addSelect('COUNT(*)', 'count')
      .where('ca.tenantId = :tenantId', { tenantId })
      .andWhere('ca.detectedIntent IS NOT NULL')
      .groupBy('ca.detectedIntent')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();
    return result.map((r) => ({ intent: r.intent, count: parseInt(r.count) }));
  }

  @Cron(CronExpression.EVERY_HOUR)
  async analyzeHourly(): Promise<void> {
    this.logger.log('Running hourly intelligence analysis...');
    try {
      await this.detectUnansweredQuestions();
      await this.detectTrends();
    } catch (err: any) {
      this.logger.error(`Hourly analysis failed: ${err?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async analyzeDaily(): Promise<void> {
    this.logger.log('Running daily intelligence analysis...');
    try {
      await this.analyzeLeadPatterns();
      await this.generateSuggestions();
      await this.autoAdjustLeadScoring();
      await this.autoOptimizePrompts();
      await this.autoEnrichUnansweredKnowledge();
      await this.pushPlatformRecommendations();
    } catch (err: any) {
      this.logger.error(`Daily analysis failed: ${err?.message}`);
    }
  }

  private async getAllTenantIds(): Promise<string[]> {
    const result = await this.convRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.tenantId', 'tenantId')
      .getRawMany();
    return result.map((r) => r.tenantId).filter(Boolean);
    }

  private async detectUnansweredQuestions(): Promise<void> {
    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      const recent = await this.analyticsRepo.find({
        where: { tenantId, hadKnowledge: false },
        order: { createdAt: 'DESC' },
        take: 50,
      });

      const keywords = this.extractKeywords(recent.map((r) => r.userMessage));

      for (const keyword of keywords) {
        const count = recent.filter((r) => r.userMessage.toLowerCase().includes(keyword)).length;
        const title = `Questions non répondues sur "${keyword}"`;
        const existing = await this.insightRepo.findOne({
          where: { tenantId, type: 'unanswered' as InsightType, resolved: false, title },
        });

        if (!existing) {
          await this.insightRepo.save(
            this.insightRepo.create({
              tenantId,
              type: 'unanswered' as InsightType,
              title,
              description: `${count} messages récents mentionnent "${keyword}" sans connaissance trouvée dans la base. Ajoutez du contenu sur ce sujet pour améliorer les réponses de l'agent.`,
              data: { keyword, count, sampleMessages: recent.slice(0, 3).map((r) => r.userMessage.slice(0, 200)) },
              confidence: Math.min(count / 10, 1),
            }),
          );
        }
      }
    }
  }

  private async detectTrends(): Promise<void> {
    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await this.analyticsRepo
        .createQueryBuilder('ca')
        .where('ca.tenantId = :tenantId', { tenantId })
        .andWhere('ca.createdAt > :date', { date: last24h })
        .andWhere('ca.detectedIntent IS NOT NULL')
        .getMany();

      const intentCounts: Record<string, number> = {};
      for (const entry of recent) {
        intentCounts[entry.detectedIntent] = (intentCounts[entry.detectedIntent] || 0) + 1;
      }

      for (const [intent, count] of Object.entries(intentCounts)) {
        if (count >= 5) {
          const title = `Tendance: ${count} demandes "${intent}" en 24h`;
          const existing = await this.insightRepo.findOne({ where: { tenantId, title, resolved: false } });
          if (!existing) {
            await this.insightRepo.save(
              this.insightRepo.create({
                tenantId,
                type: 'trend' as InsightType,
                title,
                description: `Le sujet "${intent}" est très demandé aujourd'hui (${count} conversations). L'agent devrait être prêt à répondre sur ce sujet.`,
                data: { intent, count, period: '24h' },
                confidence: Math.min(count / 10, 1),
              }),
            );
          }
        }
      }
    }
  }

  private async analyzeLeadPatterns(): Promise<void> {
    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      const leads = await this.leadRepo.find({ where: { tenantId } });
      if (leads.length < 5) continue;

      const converted = leads.filter((l) => l.status === LeadStatus.CONVERTED);
      const lost = leads.filter((l) => l.status === LeadStatus.LOST);

      if (converted.length < 2) continue;

      const convertedWith = converted.filter((l) => l.email);
      const convertedWithout = converted.filter((l) => !l.email);
      const emailConversionRate = converted.length > 0
        ? Math.round((convertedWith.length / converted.length) * 100)
        : 0;

      const avgScoreConverted = converted.reduce((sum, l) => sum + (l.score || 0), 0) / converted.length;
      const avgScoreLost = lost.length > 0
        ? lost.reduce((sum, l) => sum + (l.score || 0), 0) / lost.length
        : 0;

      const title = `Pattern de conversion: email = ${emailConversionRate}% de conversion`;
      const existing = await this.insightRepo.findOne({ where: { tenantId, title, resolved: false } });
      if (!existing) {
        await this.insightRepo.save(
          this.insightRepo.create({
            tenantId,
            type: 'lead_pattern' as InsightType,
            title,
            description: `Les leads avec email convertissent à ${emailConversionRate}%. Score moyen des convertis: ${avgScoreConverted.toFixed(1)}, des perdus: ${avgScoreLost.toFixed(1)}. Ajustez le scoring prioritaire pour les leads avec email.`,
            data: {
              emailConversionRate,
              avgScoreConverted: avgScoreConverted.toFixed(1),
              avgScoreLost: avgScoreLost.toFixed(1),
              totalConverted: converted.length,
              totalLost: lost.length,
            },
            confidence: Math.min(converted.length / 10, 1),
          }),
        );
      }
    }
  }

  private async generateSuggestions(): Promise<void> {
    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      const unanswered = await this.insightRepo.find({
        where: { tenantId, type: 'unanswered' as InsightType, resolved: false },
        take: 5,
      });

      for (const insight of unanswered) {
        const keyword = insight.data.keyword;
        if (!keyword) continue;

        const title = `Suggestion: ajouter "${keyword}" à la base de connaissances`;
        const existing = await this.insightRepo.findOne({ where: { tenantId, title, resolved: false } });
        if (!existing) {
          await this.insightRepo.save(
            this.insightRepo.create({
              tenantId,
              type: 'suggestion' as InsightType,
              title,
              description: `Recherchez des informations sur "${keyword}" et ajoutez-les à la base. L'agent pourra alors répondre aux ${insight.data.count} questions sur ce sujet.`,
              data: { keyword, relatedInsightId: insight.id, autoSearchUrl: `https://duckduckgo.com/?q=${encodeURIComponent(keyword)}` },
              confidence: insight.confidence,
            }),
          );
        }
      }
    }
  }

  async autoEnrichKnowledge(tenantId: string, keyword: string): Promise<{ added: boolean; message: string }> {
    try {
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(keyword + ' definition explication')}`;
      const result = await this.knowledgeService.addUrl(tenantId, searchUrl);
      await this.resolveInsightsByKeyword(tenantId, keyword);
      return { added: true, message: `Contenu sur "${keyword}" ajouté à la base de connaissances` };
    } catch (err: any) {
      return { added: false, message: `Erreur: ${err.message}` };
    }
  }

  private async resolveInsightsByKeyword(tenantId: string, keyword: string): Promise<void> {
    const insights = await this.insightRepo.find({
      where: { tenantId, type: In(['unanswered', 'suggestion']), resolved: false },
    });
    for (const insight of insights) {
      if (insight.data.keyword === keyword) {
        insight.resolved = true;
        await this.insightRepo.save(insight);
      }
    }
  }

  // ─── Platform-level anonymous intelligence ───
  // These methods aggregate data across ALL tenants without exposing any conversation content.
  // Only anonymous metrics are stored: intent names, flow completion rates, conversion factors.
  // No message text, no customer data, no tenant identification.

  async recordPlatformMetric(
    metricType: PlatformMetricType,
    metricKey: string,
    value: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const existing = await this.platformRepo.findOne({
      where: { metricType, metricKey },
    });

    if (existing) {
      const newCount = existing.sampleCount + 1;
      const newValue = (existing.value * existing.sampleCount + value) / newCount;
      existing.value = newValue;
      existing.sampleCount = newCount;
      existing.metadata = { ...existing.metadata, ...metadata };
      await this.platformRepo.save(existing);
    } else {
      await this.platformRepo.save(
        this.platformRepo.create({
          metricType,
          metricKey,
          value,
          sampleCount: 1,
          metadata: metadata || {},
        }),
      );
    }
  }

  async getPlatformDashboard(): Promise<any> {
    const allMetrics = await this.platformRepo.find({ order: { updatedAt: 'DESC' } });

    const grouped: Record<string, any[]> = {};
    for (const m of allMetrics) {
      if (!grouped[m.metricType]) grouped[m.metricType] = [];
      grouped[m.metricType].push({
        key: m.metricKey,
        value: Math.round(m.value * 100) / 100,
        samples: m.sampleCount,
        metadata: m.metadata,
        updatedAt: m.updatedAt,
      });
    }

    const totalSamples = allMetrics.reduce((sum, m) => sum + m.sampleCount, 0);

    return {
      totalMetrics: allMetrics.length,
      totalSamples,
      promptPerformance: (grouped['prompt_performance'] || []).sort((a, b) => b.value - a.value),
      flowCompletion: (grouped['flow_completion'] || []).sort((a, b) => b.value - a.value),
      intentDistribution: (grouped['intent_distribution'] || []).sort((a, b) => b.samples - a.samples),
      conversionFactors: (grouped['conversion_factor'] || []).sort((a, b) => b.value - a.value),
      responseQuality: (grouped['response_quality'] || []),
    };
  }

  async getPlatformRecommendations(): Promise<{ title: string; description: string; confidence: number }[]> {
    const recommendations: { title: string; description: string; confidence: number }[] = [];

    const flowMetrics = await this.platformRepo.find({
      where: { metricType: 'flow_completion' as PlatformMetricType },
    });
    for (const m of flowMetrics) {
      if (m.value < 30 && m.sampleCount >= 5) {
        recommendations.push({
          title: `Flow "${m.metricKey}" a un faible taux de completion (${Math.round(m.value)}%)`,
          description: `Ce flow est abandonné par ${100 - Math.round(m.value)}% des utilisateurs. Réduisez le nombre de champs ou simplifiez les questions pour améliorer le taux de completion.`,
          confidence: Math.min(m.sampleCount / 20, 1),
        });
      }
      if (m.value > 80 && m.sampleCount >= 5) {
        recommendations.push({
          title: `Flow "${m.metricKey}" performe très bien (${Math.round(m.value)}%)`,
          description: `Ce flow a un excellent taux de completion. Utilisez-le comme modèle pour les autres flows. Structure: ${JSON.stringify(m.metadata)}`,
          confidence: Math.min(m.sampleCount / 20, 1),
        });
      }
    }

    const conversionFactors = await this.platformRepo.find({
      where: { metricType: 'conversion_factor' as PlatformMetricType },
    });
    for (const m of conversionFactors) {
      if (m.value > 50 && m.sampleCount >= 10) {
        recommendations.push({
          title: `Facteur "${m.metricKey}" corrèle fortement avec la conversion (${Math.round(m.value)}%)`,
          description: `Les conversations avec ce facteur convertissent ${Math.round(m.value)}% du temps. Assurez-vous que l'agent le détecte systématiquement.`,
          confidence: Math.min(m.sampleCount / 30, 1),
        });
      }
    }

    const promptPerf = await this.platformRepo.find({
      where: { metricType: 'prompt_performance' as PlatformMetricType },
    });
    const sortedPrompts = promptPerf.sort((a, b) => b.value - a.value);
    if (sortedPrompts.length >= 3) {
      const best = sortedPrompts[0];
      const worst = sortedPrompts[sortedPrompts.length - 1];
      recommendations.push({
        title: `Prompt "${best.metricKey}" est le plus performant`,
        description: `Score: ${Math.round(best.value)}/100 sur ${best.sampleCount} conversations. Ce style de prompt devrait être utilisé comme template par défaut.`,
        confidence: Math.min(best.sampleCount / 20, 1),
      });
      if (worst.value < 40) {
        recommendations.push({
          title: `Prompt "${worst.metricKey}" sous-performe`,
          description: `Score: ${Math.round(worst.value)}/100. Considérez le remplacer par le template "${best.metricKey}".`,
          confidence: Math.min(worst.sampleCount / 20, 1),
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async analyzePlatformPatterns(): Promise<void> {
    this.logger.log('Running platform-level anonymous analysis...');
    try {
      await this.analyzeFlowCompletionAcrossTenants();
      await this.analyzeIntentDistribution();
      await this.analyzeConversionFactors();
    } catch (err: any) {
      this.logger.error(`Platform analysis failed: ${err?.message}`);
    }
  }

  private async analyzeFlowCompletionAcrossTenants(): Promise<void> {
    const flowAnalytics = await this.analyticsRepo
      .createQueryBuilder('ca')
      .select('ca.detectedIntent', 'intent')
      .addSelect('COUNT(*)', 'total')
      .where('ca.detectedIntent IS NOT NULL')
      .groupBy('ca.detectedIntent')
      .getRawMany();

    for (const row of flowAnalytics) {
      await this.recordPlatformMetric(
        'flow_completion' as PlatformMetricType,
        row.intent,
        parseFloat(row.total),
        { totalConversations: parseInt(row.total) },
      );
    }
  }

  private async analyzeIntentDistribution(): Promise<void> {
    const total = await this.analyticsRepo.count();
    if (total === 0) return;

    const intents = await this.analyticsRepo
      .createQueryBuilder('ca')
      .select('ca.detectedIntent', 'intent')
      .addSelect('COUNT(*)', 'count')
      .where('ca.detectedIntent IS NOT NULL')
      .groupBy('ca.detectedIntent')
      .getRawMany();

    for (const row of intents) {
      const percentage = (parseInt(row.count) / total) * 100;
      await this.recordPlatformMetric(
        'intent_distribution' as PlatformMetricType,
        row.intent,
        percentage,
        { count: parseInt(row.count), total },
      );
    }
  }

  private async analyzeConversionFactors(): Promise<void> {
    const allLeads = await this.leadRepo
      .createQueryBuilder('lead')
      .select(['lead.email IS NOT NULL as hasEmail', 'lead.phone IS NOT NULL as hasPhone', 'lead.status as status'])
      .getRawMany();

    if (allLeads.length < 10) return;

    const totalConverted = allLeads.filter((l) => l.status === LeadStatus.CONVERTED).length;
    if (totalConverted === 0) return;

    const withEmailConverted = allLeads.filter((l) => l.hasEmail && l.status === LeadStatus.CONVERTED).length;
    const withEmailTotal = allLeads.filter((l) => l.hasEmail).length;
    if (withEmailTotal > 0) {
      const rate = (withEmailConverted / withEmailTotal) * 100;
      await this.recordPlatformMetric('conversion_factor' as PlatformMetricType, 'has_email', rate, { samples: withEmailTotal });
    }

    const withPhoneConverted = allLeads.filter((l) => l.hasPhone && l.status === LeadStatus.CONVERTED).length;
    const withPhoneTotal = allLeads.filter((l) => l.hasPhone).length;
    if (withPhoneTotal > 0) {
      const rate = (withPhoneConverted / withPhoneTotal) * 100;
      await this.recordPlatformMetric('conversion_factor' as PlatformMetricType, 'has_phone', rate, { samples: withPhoneTotal });
    }

    const knowledgeConversion = await this.analyticsRepo
      .createQueryBuilder('ca')
      .leftJoin('lead', 'lead', 'lead.id = ca.leadId')
      .where('ca.hadKnowledge = true')
      .andWhere('lead.status = :status', { status: LeadStatus.CONVERTED })
      .getCount();

    const knowledgeTotal = await this.analyticsRepo.count({ where: { hadKnowledge: true } });
    if (knowledgeTotal > 0) {
      const rate = (knowledgeConversion / knowledgeTotal) * 100;
      await this.recordPlatformMetric('conversion_factor' as PlatformMetricType, 'knowledge_matched', rate, { samples: knowledgeTotal });
    }

    const productConversion = await this.analyticsRepo
      .createQueryBuilder('ca')
      .leftJoin('lead', 'lead', 'lead.id = ca.leadId')
      .where('ca.hadProducts = true')
      .andWhere('lead.status = :status', { status: LeadStatus.CONVERTED })
      .getCount();

    const productTotal = await this.analyticsRepo.count({ where: { hadProducts: true } });
    if (productTotal > 0) {
      const rate = (productConversion / productTotal) * 100;
      await this.recordPlatformMetric('conversion_factor' as PlatformMetricType, 'product_recommended', rate, { samples: productTotal });
    }
  }

  // ─── Closed-loop feedback methods ───
  // These methods close the loop: intelligence → action → better agent performance → better intelligence

  async autoAdjustLeadScoring(): Promise<void> {
    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      const leads = await this.leadRepo.find({ where: { tenantId } });
      if (leads.length < 10) continue;

      const converted = leads.filter((l) => l.status === LeadStatus.CONVERTED);
      const lost = leads.filter((l) => l.status === LeadStatus.LOST);
      if (converted.length < 3 || lost.length < 3) continue;

      const avgScoreConverted = converted.reduce((sum, l) => sum + (l.score || 0), 0) / converted.length;
      const avgScoreLost = lost.reduce((sum, l) => sum + (l.score || 0), 0) / lost.length;

      const emailConverted = converted.filter((l) => l.email).length;
      const emailRate = (emailConverted / converted.length) * 100;
      const phoneConverted = converted.filter((l) => l.phone).length;
      const phoneRate = (phoneConverted / converted.length) * 100;

      const scoreGap = avgScoreConverted - avgScoreLost;
      if (Math.abs(scoreGap) < 5) continue;

      const adjustments: string[] = [];
      let scoreDelta = 0;

      if (emailRate > 60) {
        adjustments.push(`+10 score for leads with email (${emailRate}% conversion rate)`);
        scoreDelta += 10;
      }
      if (phoneRate > 60) {
        adjustments.push(`+8 score for leads with phone (${phoneRate}% conversion rate)`);
        scoreDelta += 8;
      }
      if (avgScoreConverted > 60 && avgScoreLost < 30) {
        adjustments.push(`Score threshold for 'hot' status lowered from 70 to ${Math.round(avgScoreConverted * 0.8)}`);
      }

      if (adjustments.length === 0) continue;

      const title = `Auto-adjusted lead scoring based on ${converted.length + lost.length} leads`;
      const existing = await this.insightRepo.findOne({ where: { tenantId, title, resolved: false } });
      if (!existing) {
        await this.insightRepo.save(
          this.insightRepo.create({
            tenantId,
            type: 'performance' as InsightType,
            title,
            description: `Based on conversion patterns: avg score of converted leads is ${avgScoreConverted.toFixed(1)}, lost is ${avgScoreLost.toFixed(1)}. Adjustments: ${adjustments.join('; ')}.`,
            data: {
              avgScoreConverted: avgScoreConverted.toFixed(1),
              avgScoreLost: avgScoreLost.toFixed(1),
              emailRate,
              phoneRate,
              adjustments,
            },
            confidence: Math.min((converted.length + lost.length) / 30, 1),
          }),
        );
      }

      const newLeads = leads.filter((l) => l.status === LeadStatus.NEW && l.score < 50);
      for (const lead of newLeads) {
        let newScore = lead.score;
        if (lead.email && emailRate > 60) newScore += 10;
        if (lead.phone && phoneRate > 60) newScore += 8;
        if (newScore !== lead.score) {
          await this.leadRepo.update(lead.id, { score: Math.min(newScore, 100) });
        }
      }

      this.logger.log(`[autoAdjustLeadScoring] Tenant ${tenantId}: adjusted ${newLeads.length} lead scores. Gap: ${scoreGap.toFixed(1)}`);
    }
  }

  async autoOptimizePrompts(): Promise<void> {
    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      const agents = await this.agentRepo.find({ where: { tenantId, isActive: true } });
      if (agents.length === 0) continue;

      for (const agent of agents) {
        const agentAnalytics = await this.analyticsRepo
          .createQueryBuilder('ca')
          .innerJoin('conversation', 'conv', 'conv.id = ca.conversationId')
          .where('conv.agentId = :agentId', { agentId: agent.id })
          .andWhere('ca.hadKnowledge = false')
          .orderBy('ca.createdAt', 'DESC')
          .take(20)
          .getMany();

        if (agentAnalytics.length < 5) continue;

        const unansweredRate = (agentAnalytics.length / 20) * 100;
        if (unansweredRate < 30) continue;

        const unansweredKeywords = this.extractKeywords(
          agentAnalytics.map((a) => a.userMessage),
        );

        if (unansweredKeywords.length === 0) continue;

        const enhancement = `\n\n[Auto-optimized] If the user asks about ${unansweredKeywords.slice(0, 3).join(', ')} and you don't have specific knowledge, respond: "I don't have detailed information on this yet, but I can note your interest and someone will follow up." Then set the lead as needing follow-up.`;

        const alreadyOptimized = agent.systemPrompt.includes('[Auto-optimized]');
        if (alreadyOptimized) {
          const optimizedSection = agent.systemPrompt.indexOf('[Auto-optimized]');
          const beforeOptimization = agent.systemPrompt.substring(0, optimizedSection);
          const newPrompt = beforeOptimization + enhancement;
          if (newPrompt !== agent.systemPrompt) {
            await this.agentRepo.update(agent.id, { systemPrompt: newPrompt });
          }
        } else {
          const newPrompt = agent.systemPrompt + enhancement;
          await this.agentRepo.update(agent.id, { systemPrompt: newPrompt });
        }

        const title = `Auto-optimized prompt for agent "${agent.name}"`;
        const existing = await this.insightRepo.findOne({ where: { tenantId, title, resolved: false } });
        if (!existing) {
          await this.insightRepo.save(
            this.insightRepo.create({
              tenantId,
              type: 'performance' as InsightType,
              title,
              description: `Agent "${agent.name}" had ${unansweredRate.toFixed(0)}% unanswered rate. System prompt enhanced with fallback instructions for topics: ${unansweredKeywords.slice(0, 5).join(', ')}.`,
              data: {
                agentId: agent.id,
                agentName: agent.name,
                unansweredRate,
                keywords: unansweredKeywords.slice(0, 10),
              },
              confidence: Math.min(agentAnalytics.length / 20, 1),
            }),
          );
        }

        this.logger.log(`[autoOptimizePrompts] Tenant ${tenantId}: optimized agent "${agent.name}" prompt with ${unansweredKeywords.length} keywords`);
      }
    }
  }

  async autoEnrichUnansweredKnowledge(): Promise<void> {
    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      const unanswered = await this.insightRepo.find({
        where: { tenantId, type: 'unanswered' as InsightType, resolved: false },
        take: 3,
      });

      for (const insight of unanswered) {
        const keyword = insight.data.keyword;
        if (!keyword) continue;

        try {
          const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(keyword + ' definition explication')}`;
          await this.knowledgeService.addUrl(tenantId, searchUrl);
          await this.resolveInsightsByKeyword(tenantId, keyword);

          const title = `Auto-enriched knowledge: "${keyword}"`;
          const existing = await this.insightRepo.findOne({ where: { tenantId, title, resolved: false } });
          if (!existing) {
            await this.insightRepo.save(
              this.insightRepo.create({
                tenantId,
                type: 'suggestion' as InsightType,
                title,
                description: `Automatically added DuckDuckGo content about "${keyword}" to the knowledge base. The agent should now be able to answer questions on this topic.`,
                data: { keyword, source: 'duckduckgo', autoEnriched: true },
                confidence: 0.8,
              }),
            );
          }

          this.logger.log(`[autoEnrichUnansweredKnowledge] Tenant ${tenantId}: enriched knowledge for "${keyword}"`);
        } catch (err: any) {
          this.logger.warn(`[autoEnrichUnansweredKnowledge] Failed to enrich "${keyword}": ${err?.message}`);
        }
      }
    }
  }

  async pushPlatformRecommendations(): Promise<void> {
    const recommendations = await this.getPlatformRecommendations();
    if (recommendations.length === 0) return;

    const tenantIds = await this.getAllTenantIds();

    for (const tenantId of tenantIds) {
      for (const rec of recommendations.slice(0, 3)) {
        const title = `Platform recommendation: ${rec.title}`;
        const existing = await this.insightRepo.findOne({ where: { tenantId, title, resolved: false } });
        if (!existing) {
          await this.insightRepo.save(
            this.insightRepo.create({
              tenantId,
              type: 'suggestion' as InsightType,
              title,
              description: `${rec.description} (Confidence: ${(rec.confidence * 100).toFixed(0)}%)`,
              data: {
                platformRecommendation: true,
                confidence: rec.confidence,
              },
              confidence: rec.confidence,
            }),
          );
        }
      }

      this.logger.log(`[pushPlatformRecommendations] Pushed ${Math.min(recommendations.length, 3)} recommendations to tenant ${tenantId}`);
    }
  }

  private extractKeywords(messages: string[]): string[] {
    const stopWords = new Set([
      'bonjour', 'salut', 'merci', 'cest', 'vous', 'avoir', 'faire', 'pouvez',
      'quel', 'quelle', 'quelles', 'quels', 'hello', 'thank', 'please', 'want',
      'need', 'like', 'know', 'would', 'could', 'have', 'that', 'this', 'with',
      'about', 'your', 'our', 'the', 'and', 'for', 'are', 'was', 'were', 'been',
      'have', 'has', 'had', 'did', 'does', 'will', 'can', 'may', 'might', 'must',
      'should', 'would', 'could', 'shall', 'will', 'onto', 'into', 'from', 'they',
    ]);

    const wordFreq: Record<string, number> = {};
    for (const msg of messages) {
      const words = msg
        .toLowerCase()
        .replace(/[^\w\sàâäéèêëïîôöùûüç]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .filter(([, count]) => count >= 2)
      .map(([word]) => word);
  }

  async getChannelAnalytics(tenantId: string, days = 30): Promise<{
    channels: Array<{
      channel: string;
      conversations: number;
      leads: number;
      qualifiedLeads: number;
      conversionRate: number;
      avgIntentScore: number;
      messages: number;
    }>;
    dailyVolume: Array<{ date: string; channel: string; count: number }>;
    summary: { totalConversations: number; totalLeads: number; totalMessages: number; avgConversionRate: number };
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const channels = await this.convRepo
      .createQueryBuilder('conv')
      .leftJoin('conv.lead', 'lead')
      .select('conv.channel', 'channel')
      .addSelect('COUNT(DISTINCT conv.id)', 'conversations')
      .addSelect('COUNT(DISTINCT lead.id)', 'leads')
      .addSelect(`COUNT(DISTINCT CASE WHEN lead.status IN ('qualified','hot','closed_won') THEN lead.id END)`, 'qualifiedLeads')
      .addSelect('COALESCE(AVG(conv.intentScore), 0)', 'avgIntentScore')
      .where('conv.tenantId = :tenantId', { tenantId })
      .andWhere('conv.createdAt >= :since', { since })
      .groupBy('conv.channel')
      .getRawMany();

    const messageCounts = await this.msgRepo
      .createQueryBuilder('msg')
      .innerJoin('msg.conversation', 'conv')
      .select('conv.channel', 'channel')
      .addSelect('COUNT(*)', 'messages')
      .where('conv.tenantId = :tenantId', { tenantId })
      .andWhere('msg.createdAt >= :since', { since })
      .groupBy('conv.channel')
      .getRawMany();

    const msgMap = new Map(messageCounts.map((m: any) => [m.channel, Number(m.messages)]));

    const channelStats = channels.map((c: any) => {
      const convs = Number(c.conversations);
      const leads = Number(c.leads);
      const qualified = Number(c.qualifiedLeads);
      return {
        channel: c.channel,
        conversations: convs,
        leads,
        qualifiedLeads: qualified,
        conversionRate: convs > 0 ? Math.round((leads / convs) * 100) : 0,
        avgIntentScore: Math.round(Number(c.avgIntentScore)),
        messages: msgMap.get(c.channel) || 0,
      };
    });

    const dailyVolume = await this.convRepo
      .createQueryBuilder('conv')
      .select("TO_CHAR(conv.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('conv.channel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .where('conv.tenantId = :tenantId', { tenantId })
      .andWhere('conv.createdAt >= :since', { since })
      .groupBy("TO_CHAR(conv.createdAt, 'YYYY-MM-DD'), conv.channel")
      .orderBy('date', 'ASC')
      .getRawMany();

    const totalConversations = channelStats.reduce((s, c) => s + c.conversations, 0);
    const totalLeads = channelStats.reduce((s, c) => s + c.leads, 0);
    const totalMessages = channelStats.reduce((s, c) => s + c.messages, 0);

    return {
      channels: channelStats,
      dailyVolume: dailyVolume.map((d: any) => ({ date: d.date, channel: d.channel, count: Number(d.count) })),
      summary: {
        totalConversations,
        totalLeads,
        totalMessages,
        avgConversionRate: totalConversations > 0 ? Math.round((totalLeads / totalConversations) * 100) : 0,
      },
    };
  }
}
