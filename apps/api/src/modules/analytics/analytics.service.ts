import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Conversation, ConversationStatus, FunnelStage, AcquisitionChannel } from '../chat/conversation.entity';
import { Message } from '../chat/message.entity';
import { Lead, LeadStatus } from '../leads/lead.entity';
import { Product } from '../products/product.entity';
import { Agent } from '../agents/agent.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly dataSource: DataSource,
  ) {}

  async getDashboard(tenantId: string) {
    const [conversations, leads, products, agents] = await Promise.all([
      this.convRepo.find({ where: { tenantId } }),
      this.leadRepo.find({ where: { tenantId } }),
      this.productRepo.find({ where: { tenantId } }),
      this.agentRepo.find({ where: { tenantId } }),
    ]);

    const totalConversations = conversations.length;
    const openConversations = conversations.filter((c) => c.status === ConversationStatus.OPEN).length;
    const handedOffConversations = conversations.filter((c) => c.status === ConversationStatus.HANDED_OFF).length;
    const closedConversations = conversations.filter((c) => c.status === ConversationStatus.CLOSED).length;

    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === LeadStatus.NEW).length;
    const contactedLeads = leads.filter((l) => l.status === LeadStatus.CONTACTED).length;
    const qualifiedLeads = leads.filter((l) => l.status === LeadStatus.QUALIFIED).length;
    const convertedLeads = leads.filter((l) => l.status === LeadStatus.CONVERTED).length;
    const lostLeads = leads.filter((l) => l.status === LeadStatus.LOST).length;

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;

    const conversationsWithLeads = conversations.filter((c) => c.leadId).length;
    const leadCaptureRate = totalConversations > 0 ? Math.round((conversationsWithLeads / totalConversations) * 100) : 0;

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentConversations = conversations.filter((c) => new Date(c.createdAt) >= last7Days).length;
    const recentLeads = leads.filter((l) => new Date(l.createdAt) >= last7Days).length;

    const agentPerformance = agents.map((agent) => {
      const agentConvs = conversations.filter((c) => c.agentId === agent.id);
      const agentLeads = leads.filter((l) => l.agentId === agent.id);
      const agentConverted = agentLeads.filter((l) => l.status === LeadStatus.CONVERTED).length;
      return {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        conversations: agentConvs.length,
        leads: agentLeads.length,
        conversions: agentConverted,
        conversionRate: agentLeads.length > 0 ? Math.round((agentConverted / agentLeads.length) * 100) : 0,
      };
    });

    return {
      conversations: {
        total: totalConversations,
        open: openConversations,
        handedOff: handedOffConversations,
        closed: closedConversations,
        recent7d: recentConversations,
        leadCaptureRate,
      },
      leads: {
        total: totalLeads,
        new: newLeads,
        contacted: contactedLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        lost: lostLeads,
        conversionRate,
        avgScore,
        recent7d: recentLeads,
      },
      products: {
        total: products.length,
        active: products.filter((p) => p.isActive).length,
        outOfStock: products.filter((p) => p.stock <= 0).length,
        categories: [...new Set(products.map((p) => p.category).filter(Boolean))].length,
      },
      agents: {
        total: agents.length,
        active: agents.filter((a) => a.isActive).length,
        performance: agentPerformance,
      },
    };
  }

  async getConversationTimeline(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const conversations = await this.convRepo
      .createQueryBuilder('conv')
      .where('conv.tenantId = :tenantId', { tenantId })
      .andWhere('conv.createdAt >= :since', { since })
      .select(["DATE_TRUNC('day', conv.createdAt) as date", 'COUNT(*)::int as count'])
      .groupBy("DATE_TRUNC('day', conv.createdAt)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return conversations.map((c) => ({ date: c.date, count: c.count }));
  }

  async getFunnelAnalytics(tenantId: string) {
    const conversations = await this.convRepo.find({ where: { tenantId } });
    const leads = await this.leadRepo.find({ where: { tenantId } });

    const stageCounts: Record<string, number> = {};
    const stageIntents: Record<string, number[]> = {};
    Object.values(FunnelStage).forEach((s) => { stageCounts[s] = 0; stageIntents[s] = []; });

    conversations.forEach((c) => {
      const stage = c.funnelStage || FunnelStage.AWARENESS;
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      if (c.intentScore !== undefined && c.intentScore !== null) {
        stageIntents[stage].push(c.intentScore);
      }
    });

    const stages = [
      { stage: FunnelStage.AWARENESS, label: 'Awareness', color: '#3b82f6' },
      { stage: FunnelStage.INTEREST, label: 'Intérêt', color: '#8b5cf6' },
      { stage: FunnelStage.QUALIFICATION, label: 'Qualification', color: '#f97316' },
      { stage: FunnelStage.CONSIDERATION, label: 'Considération', color: '#ec4899' },
      { stage: FunnelStage.DECISION, label: 'Décision', color: '#ef4444' },
      { stage: FunnelStage.CLOSED_WON, label: 'Gagné', color: '#10b981' },
      { stage: FunnelStage.CLOSED_LOST, label: 'Perdu', color: '#6b7280' },
    ];

    const funnelData = stages.map((s) => {
      const intents = stageIntents[s.stage] || [];
      const avgIntent = intents.length > 0 ? Math.round(intents.reduce((a, b) => a + b, 0) / intents.length) : 0;
      return {
        stage: s.stage,
        label: s.label,
        color: s.color,
        count: stageCounts[s.stage] || 0,
        avgIntentScore: avgIntent,
      };
    });

    const totalConv = conversations.length;
    const wonCount = stageCounts[FunnelStage.CLOSED_WON] || 0;
    const lostCount = stageCounts[FunnelStage.CLOSED_LOST] || 0;
    const decisionCount = stageCounts[FunnelStage.DECISION] || 0;
    const conversionRate = totalConv > 0 ? Math.round((wonCount / totalConv) * 100) : 0;
    const dropoffRates = funnelData.map((s, i) => {
      if (i === 0) return 0;
      const prev = funnelData[i - 1].count;
      return prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : 0;
    });

    const highIntentLeads = leads.filter((l) => l.score >= 50).length;
    const avgLeadScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;

    return {
      stages: funnelData.map((s, i) => ({ ...s, dropoffRate: dropoffRates[i] })),
      summary: {
        totalConversations: totalConv,
        conversionRate,
        wonCount,
        lostCount,
        decisionCount,
        highIntentLeads,
        avgLeadScore,
      },
    };
  }

  async getTokenUsage(tenantId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.dataSource.query(
      `SELECT DATE_TRUNC('day', "createdAt") as date,
              SUM("promptTokens")::int as "promptTokens",
              SUM("completionTokens")::int as "completionTokens",
              SUM("totalTokens")::int as "totalTokens",
              COUNT(*)::int as "conversationCount"
       FROM conversation_analytics
       WHERE "tenantId" = $1 AND "createdAt" >= $2
       GROUP BY DATE_TRUNC('day', "createdAt")
       ORDER BY date ASC`,
      [tenantId, since],
    );
    const total = rows.reduce(
      (acc: any, r: any) => ({
        promptTokens: acc.promptTokens + (r.promptTokens || 0),
        completionTokens: acc.completionTokens + (r.completionTokens || 0),
        totalTokens: acc.totalTokens + (r.totalTokens || 0),
        conversationCount: acc.conversationCount + (r.conversationCount || 0),
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, conversationCount: 0 },
    );
    return { days, total, timeline: rows };
  }

  async getAcquisitionAnalytics(tenantId: string) {
    const conversations = await this.convRepo.find({ where: { tenantId } });
    const leads = await this.leadRepo.find({ where: { tenantId } });

    const channelCounts: Record<string, number> = {};
    const channelConversions: Record<string, number> = {};
    const channelIntents: Record<string, number[]> = {};
    Object.values(AcquisitionChannel).forEach((c) => {
      channelCounts[c] = 0;
      channelConversions[c] = 0;
      channelIntents[c] = [];
    });

    conversations.forEach((c) => {
      const ch = c.acquisitionChannel || AcquisitionChannel.UNKNOWN;
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      if (c.funnelStage === FunnelStage.CLOSED_WON) {
        channelConversions[ch] = (channelConversions[ch] || 0) + 1;
      }
      if (c.intentScore) channelIntents[ch].push(c.intentScore);
    });

    const channels = [
      { channel: AcquisitionChannel.META_ADS, label: 'Meta Ads', color: '#1877f2' },
      { channel: AcquisitionChannel.GOOGLE_ADS, label: 'Google Ads', color: '#ea4335' },
      { channel: AcquisitionChannel.ORGANIC, label: 'Organique', color: '#10b981' },
      { channel: AcquisitionChannel.SOCIAL, label: 'Social', color: '#8b5cf6' },
      { channel: AcquisitionChannel.DIRECT, label: 'Direct', color: '#6b7280' },
      { channel: AcquisitionChannel.REFERRAL, label: 'Referral', color: '#f97316' },
      { channel: AcquisitionChannel.EMAIL, label: 'Email', color: '#3b82f6' },
      { channel: AcquisitionChannel.QR_CODE, label: 'QR Code', color: '#ec4899' },
      { channel: AcquisitionChannel.LANDING_PAGE, label: 'Landing Page', color: '#14b8a6' },
      { channel: AcquisitionChannel.WEB_CHAT, label: 'Web Chat', color: '#6366f1' },
      { channel: AcquisitionChannel.PUBLIC_LINK, label: 'Lien Public', color: '#a855f7' },
      { channel: AcquisitionChannel.UNKNOWN, label: 'Inconnu', color: '#9ca3af' },
    ];

    const channelData = channels
      .filter((c) => channelCounts[c.channel] > 0)
      .map((c) => {
        const count = channelCounts[c.channel];
        const conversions = channelConversions[c.channel] || 0;
        const intents = channelIntents[c.channel] || [];
        const avgIntent = intents.length > 0 ? Math.round(intents.reduce((a, b) => a + b, 0) / intents.length) : 0;
        return {
          ...c,
          count,
          conversions,
          conversionRate: count > 0 ? Math.round((conversions / count) * 100) : 0,
          avgIntentScore: avgIntent,
        };
      })
      .sort((a, b) => b.count - a.count);

    // UTM campaign breakdown
    const utmCampaigns: Record<string, number> = {};
    conversations.forEach((c) => {
      const camp = c.utmParams?.campaign;
      if (camp) utmCampaigns[camp] = (utmCampaigns[camp] || 0) + 1;
    });

    const topCampaigns = Object.entries(utmCampaigns)
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      channels: channelData,
      topCampaigns,
      summary: {
        totalTracked: conversations.filter((c) => c.acquisitionChannel !== AcquisitionChannel.UNKNOWN).length,
        totalUntracked: conversations.filter((c) => c.acquisitionChannel === AcquisitionChannel.UNKNOWN).length,
        bestChannel: channelData[0]?.channel || null,
        bestConversionChannel: channelData.sort((a, b) => b.conversionRate - a.conversionRate)[0]?.channel || null,
      },
    };
  }
}
