import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IntelligenceService } from './intelligence.service';
import { Insight } from './insight.entity';
import { ConversationAnalytics } from './conversation-analytics.entity';
import { PlatformInsight } from './platform-insight.entity';
import { Message } from '../chat/message.entity';
import { Conversation } from '../chat/conversation.entity';
import { Lead } from '../leads/lead.entity';
import { Agent } from '../agents/agent.entity';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AgentsService } from '../agents/agents.service';
import { LeadsService } from '../leads/leads.service';

describe('IntelligenceService', () => {
  let service: IntelligenceService;

  const mockInsightRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data) => data),
    update: jest.fn(),
    count: jest.fn(),
  };

  const mockAnalyticsRepo = {
    save: jest.fn(),
    create: jest.fn((data) => data),
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockMsgRepo = { find: jest.fn(), createQueryBuilder: jest.fn(() => ({ getMany: jest.fn().mockResolvedValue([]) })) };
  const mockConvRepo = { find: jest.fn(), createQueryBuilder: jest.fn(() => ({ select: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]) })) };
  const mockLeadRepo = { find: jest.fn(), count: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn(() => ({ getMany: jest.fn().mockResolvedValue([]) })) };
  const mockAgentRepo = { find: jest.fn(), update: jest.fn() };
  const mockPlatformRepo = { save: jest.fn(), create: jest.fn((d) => d), find: jest.fn() };

  const mockKnowledgeService = { addText: jest.fn() };
  const mockAgentsService = { findByTenant: jest.fn().mockResolvedValue({ data: [] }) };
  const mockLeadsService = { findByTenant: jest.fn().mockResolvedValue({ data: [] }) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        { provide: getRepositoryToken(Insight), useValue: mockInsightRepo },
        { provide: getRepositoryToken(ConversationAnalytics), useValue: mockAnalyticsRepo },
        { provide: getRepositoryToken(Message), useValue: mockMsgRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
        { provide: getRepositoryToken(Lead), useValue: mockLeadRepo },
        { provide: getRepositoryToken(Agent), useValue: mockAgentRepo },
        { provide: getRepositoryToken(PlatformInsight), useValue: mockPlatformRepo },
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: AgentsService, useValue: mockAgentsService },
        { provide: LeadsService, useValue: mockLeadsService },
      ],
    }).compile();
    service = moduleRef.get<IntelligenceService>(IntelligenceService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordConversation', () => {
    it('should save analytics entry', async () => {
      await service.recordConversation('t1', 'c1', 'l1', 'Hello', 'Hi there', true, false, 'greeting');
      expect(mockAnalyticsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          conversationId: 'c1',
          leadId: 'l1',
          userMessage: 'Hello',
          agentReply: 'Hi there',
          hadKnowledge: true,
          hadProducts: false,
          detectedIntent: 'greeting',
          messageLength: 5,
        }),
      );
      expect(mockAnalyticsRepo.save).toHaveBeenCalled();
    });

    it('should handle null leadId', async () => {
      await service.recordConversation('t1', 'c1', null, 'Test', 'Reply', false, false, null);
      expect(mockAnalyticsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: null }),
      );
    });
  });

  describe('getInsights', () => {
    it('should return insights for a tenant', async () => {
      mockInsightRepo.find.mockResolvedValue([{ id: '1', tenantId: 't1' }]);
      const result = await service.getInsights('t1');
      expect(result).toHaveLength(1);
      expect(mockInsightRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1' }, order: { createdAt: 'DESC' }, take: 100 }),
      );
    });

    it('should filter by type when provided', async () => {
      mockInsightRepo.find.mockResolvedValue([]);
      await service.getInsights('t1', 'unanswered' as any);
      expect(mockInsightRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1', type: 'unanswered' } }),
      );
    });

    it('should filter by resolved when provided', async () => {
      mockInsightRepo.find.mockResolvedValue([]);
      await service.getInsights('t1', undefined, false);
      expect(mockInsightRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1', resolved: false } }),
      );
    });
  });

  describe('resolveInsight', () => {
    it('should mark insight as resolved', async () => {
      await service.resolveInsight('i1', 't1');
      expect(mockInsightRepo.update).toHaveBeenCalledWith({ id: 'i1', tenantId: 't1' }, { resolved: true });
    });
  });

  describe('getDashboard', () => {
    it('should return aggregated dashboard data', async () => {
      mockInsightRepo.count.mockResolvedValue(2);
      mockAnalyticsRepo.count.mockResolvedValue(10);
      mockLeadRepo.count.mockResolvedValue(5);

      const result = await service.getDashboard('t1');
      expect(result).toEqual(
        expect.objectContaining({
          totalAnalyzed: 10,
          unansweredCount: 2,
          trendsCount: 2,
          patternsCount: 2,
          suggestionsCount: 2,
        }),
      );
    });

    it('should return 0 conversion rate when no leads', async () => {
      mockInsightRepo.count.mockResolvedValue(0);
      mockAnalyticsRepo.count.mockResolvedValue(0);
      mockLeadRepo.count.mockResolvedValue(0);

      const result = await service.getDashboard('t1');
      expect(result.conversionRate).toBe(0);
      expect(result.unansweredRate).toBe(0);
    });
  });
});
