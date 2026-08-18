import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from '../chat/conversation.entity';
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
}
