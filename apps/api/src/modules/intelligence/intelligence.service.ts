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
import { KnowledgeService } from '../knowledge/knowledge.service';

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
    @InjectRepository(PlatformInsight)
    private readonly platformRepo: Repository<PlatformInsight>,
    private readonly knowledgeService: KnowledgeService,
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

      const keywords: Record<string, number> = {};
      for (const entry of recent) {
        const words = entry.userMessage
          .toLowerCase()
          .replace(/[^\w\sàâäéèêëïîôöùûüç]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3 && !['bonjour', 'salut', 'merci', 'cest', 'vous', 'avoir', 'faire', 'pouvez', 'quel', 'quelle', 'quelles', 'quels'].includes(w));

        for (const word of words) {
          keywords[word] = (keywords[word] || 0) + 1;
        }
      }

      const topKeywords = Object.entries(keywords)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .filter(([, count]) => count >= 3);

      for (const [keyword, count] of topKeywords) {
        const existing = await this.insightRepo.findOne({
          where: { tenantId, type: 'unanswered' as InsightType, resolved: false },
        });

        const title = `Questions non répondues sur "${keyword}"`;
        const existingMatch = existing?.title === title;

        if (!existingMatch) {
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
}
