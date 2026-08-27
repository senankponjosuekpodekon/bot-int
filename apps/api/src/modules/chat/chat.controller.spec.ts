import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: Partial<ChatService>;

  const mockRequest = (tenantId = 'tenant-1') => ({ user: { tenantId } }) as any;

  beforeEach(async () => {
    chatService = {
      getConversations: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      getDashboardMetrics: jest.fn().mockResolvedValue({
        totalConversations: 42,
        totalMessages: 128,
        handoffs: 3,
        conversionRate: 12,
        topIntents: [{ intent: 'pricing', count: 8 }],
      }),
      takeConversation: jest.fn().mockResolvedValue({ id: 'conv-1', status: 'open' }),
      operatorReply: jest.fn().mockResolvedValue({ id: 'msg-1', role: 'assistant', content: 'Hello' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: chatService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('returns operator inbox', async () => {
    const req = mockRequest();
    const query = { page: 1, limit: 20 } as any;
    await controller.getOperatorInbox(req, query);
    expect(chatService.getConversations).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ status: 'handed_off' }));
  });

  it('takes over a conversation', async () => {
    const req = mockRequest();
    const result = await controller.takeConversation(req, 'conv-1');
    expect(chatService.takeConversation).toHaveBeenCalledWith('conv-1', 'tenant-1');
    expect(result).toEqual({ id: 'conv-1', status: 'open' });
  });

  it('returns analytics', async () => {
    const req = mockRequest();
    const result = await controller.getAnalytics(req, '2024-01-01', '2024-01-31');
    expect(chatService.getDashboardMetrics).toHaveBeenCalledWith('tenant-1', '2024-01-01', '2024-01-31');
    expect(result.totalConversations).toBe(42);
  });

  it('posts an operator reply', async () => {
    const req = mockRequest();
    const result = await controller.operatorReply(req, 'conv-1', { message: 'How can I help?' } as any);
    expect(chatService.operatorReply).toHaveBeenCalledWith('conv-1', 'tenant-1', 'How can I help?');
    expect(result).toEqual({ id: 'msg-1', role: 'assistant', content: 'Hello' });
  });
});
