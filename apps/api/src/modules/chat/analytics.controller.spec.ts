import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { ChatService } from './chat.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { Agent } from '../agents/agent.entity';

const mockRequest = (tenantId = 't-1') => ({ user: { tenantId } }) as any;

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const mockChatService = {
    getDashboardMetrics: jest.fn().mockResolvedValue({
      conversationsWithLead: 5,
      conversionRate: 10,
      averageIntentScore: 0.8,
    }),
  };

  const mockConvRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAgentRepo = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    mockConvRepo.count = jest.fn().mockResolvedValue(0);
    mockAgentRepo.count = jest.fn().mockResolvedValue(0);
    mockConvRepo.createQueryBuilder = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
        { provide: getRepositoryToken(Agent), useValue: mockAgentRepo },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('returns dashboard shape', async () => {
    const result = await controller.dashboard(mockRequest());
    expect(result).toHaveProperty('conversations');
    expect(result).toHaveProperty('leads');
    expect(result).toHaveProperty('products');
    expect(result).toHaveProperty('agents');
  });

  it('counts conversations by status', async () => {
    await controller.dashboard(mockRequest());
    expect(mockConvRepo.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: ConversationStatus.OPEN }),
    }));
    expect(mockConvRepo.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: ConversationStatus.HANDED_OFF }),
    }));
    expect(mockConvRepo.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: ConversationStatus.CLOSED }),
    }));
  });

  it('returns timeline', async () => {
    const result = await controller.timeline(mockRequest());
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns channel analytics', async () => {
    const builder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { channel: 'web', conversations: '10', leads: '3' },
        { channel: 'api', conversations: '5', leads: '0' },
      ]),
    };
    mockConvRepo.createQueryBuilder.mockReturnValue(builder);
    const result = await controller.channels(mockRequest(), '30');
    expect(result.summary.totalConversations).toBe(15);
    expect(result.summary.totalLeads).toBe(3);
    expect(result.channels).toHaveLength(2);
    expect(result.channels[0].conversionRate).toBe(30);
  });
});
