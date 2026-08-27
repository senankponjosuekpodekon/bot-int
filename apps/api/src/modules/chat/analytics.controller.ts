import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { Conversation, ConversationStatus } from './conversation.entity';
import { Agent } from '../agents/agent.entity';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly chatService: ChatService,
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics' })
  async dashboard(@Request() req, @Query('days') days = '30') {
    const end = new Date();
    const daysNum = Math.min(parseInt(days, 10) || 30, 365);
    const start = new Date(end.getTime() - daysNum * 24 * 60 * 60 * 1000);
    const tenantId = req.user.tenantId;

    const metrics = await this.chatService.getDashboardMetrics(tenantId, start.toISOString(), end.toISOString());

    const [total, open, handedOff, closed, recent7d, withLead] = await Promise.all([
      this.convRepo.count({ where: { tenantId, createdAt: Between(start, end) } }),
      this.convRepo.count({ where: { tenantId, status: ConversationStatus.OPEN } }),
      this.convRepo.count({ where: { tenantId, status: ConversationStatus.HANDED_OFF } }),
      this.convRepo.count({ where: { tenantId, status: ConversationStatus.CLOSED } }),
      this.convRepo.count({ where: { tenantId, createdAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) } }),
      this.convRepo.count({ where: { tenantId, leadId: MoreThan(''), createdAt: Between(start, end) } }),
    ]);

    const leadTotal = withLead;
    const leadRecent = await this.convRepo.count({
      where: {
        tenantId,
        leadId: MoreThan(''),
        createdAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      },
    });

    const [agentsTotal, agentsActive] = await Promise.all([
      this.agentRepo.count({ where: { tenantId } }),
      this.agentRepo.count({ where: { tenantId, isActive: true } }),
    ]);

    return {
      conversations: {
        total,
        open,
        handedOff,
        closed,
        recent7d,
        leadCaptureRate: total > 0 ? Math.round((withLead / total) * 100) : 0,
      },
      leads: {
        total: leadTotal,
        new: leadRecent,
        contacted: 0,
        qualified: 0,
        converted: metrics.conversationsWithLead,
        lost: 0,
        conversionRate: metrics.conversionRate,
        avgScore: metrics.averageIntentScore,
        recent7d: leadRecent,
      },
      products: {
        total: 0,
        active: 0,
        outOfStock: 0,
        categories: 0,
      },
      agents: {
        total: agentsTotal,
        active: agentsActive,
        performance: [],
      },
    };
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get conversations timeline' })
  @ApiResponse({ status: 200, description: 'Daily conversation counts' })
  async timeline(@Request() req, @Query('days') days = '30') {
    const tenantId = req.user.tenantId;
    const daysNum = Math.min(parseInt(days, 10) || 30, 365);
    const end = new Date();
    const start = new Date(end.getTime() - daysNum * 24 * 60 * 60 * 1000);

    const rows = await this.convRepo
      .createQueryBuilder('conv')
      .where('conv.tenantId = :tenantId', { tenantId })
      .andWhere('conv.createdAt BETWEEN :start AND :end', { start, end })
      .select("DATE_TRUNC('day', conv.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy("DATE_TRUNC('day', conv.createdAt)")
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map((r: any) => ({
      date: new Date(r.date).toISOString().slice(0, 10),
      count: Number(r.count),
    }));
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get channel analytics' })
  @ApiResponse({ status: 200, description: 'Channel performance analytics' })
  async channels(@Request() req, @Query('days') days = '30') {
    const tenantId = req.user.tenantId;
    const daysNum = Math.min(parseInt(days, 10) || 30, 365);
    const end = new Date();
    const start = new Date(end.getTime() - daysNum * 24 * 60 * 60 * 1000);

    const rows = await this.convRepo
      .createQueryBuilder('conv')
      .where('conv.tenantId = :tenantId', { tenantId })
      .andWhere('conv.createdAt BETWEEN :start AND :end', { start, end })
      .select('conv.channel', 'channel')
      .addSelect('COUNT(*)', 'conversations')
      .addSelect('SUM(CASE WHEN conv.leadId IS NOT NULL THEN 1 ELSE 0 END)', 'leads')
      .groupBy('conv.channel')
      .getRawMany();

    const channels = rows.map((r: any) => ({
      channel: r.channel,
      conversations: Number(r.conversations),
      leads: Number(r.leads),
      conversionRate: Number(r.conversations) > 0
        ? Math.round((Number(r.leads) / Number(r.conversations)) * 100)
        : 0,
      messages: 0,
    }));

    const totalConversations = channels.reduce((s, c) => s + c.conversations, 0);
    const totalLeads = channels.reduce((s, c) => s + c.leads, 0);

    return {
      summary: {
        totalConversations,
        totalLeads,
        totalMessages: 0,
        avgConversionRate: totalConversations > 0
          ? Math.round((totalLeads / totalConversations) * 100)
          : 0,
      },
      channels,
      dailyVolume: [],
    };
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get funnel analytics' })
  @ApiResponse({ status: 200, description: 'Funnel stages' })
  funnel() {
    return { stages: [], summary: { conversionRate: 0, wonCount: 0, lostCount: 0, highIntentLeads: 0 } };
  }

  @Get('acquisition')
  @ApiOperation({ summary: 'Get acquisition channel analytics' })
  @ApiResponse({ status: 200, description: 'Acquisition channels' })
  acquisition() {
    return { channels: [], topCampaigns: [], summary: { totalTracked: 0, totalUntracked: 0 } };
  }
}
