import { Test, TestingModule } from '@nestjs/testing';
import { WidgetController } from './widget.controller';
import { ChatService } from './chat.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Agent } from '../agents/agent.entity';
import { Conversation } from './conversation.entity';

describe('WidgetController', () => {
  let controller: WidgetController;

  const mockAgentRepo = {
    findOne: jest.fn(),
  };

  const mockConvRepo = {
    findOne: jest.fn(),
  };

  const mockChatService = {
    sendMessage: jest.fn().mockResolvedValue({ reply: 'Hello', conversationId: 'conv-1' }),
    getHistory: jest.fn().mockResolvedValue({ conversation: { id: 'conv-1' }, messages: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WidgetController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: getRepositoryToken(Agent), useValue: mockAgentRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
      ],
    }).compile();

    controller = module.get<WidgetController>(WidgetController);
  });

  it('serves embed.js as javascript', async () => {
    const res = { setHeader: jest.fn(), send: jest.fn() } as any;
    await controller.getEmbedScript(res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('botint-widget'));
  });

  it('returns 404 for missing agent config', async () => {
    mockAgentRepo.findOne.mockResolvedValue(null);
    await expect(controller.getWidgetConfig('missing')).rejects.toThrow('Agent not found');
  });

  it('sends a widget message', async () => {
    mockAgentRepo.findOne.mockResolvedValue({ id: 'agent-1', tenantId: 't-1', name: 'Bot' });
    const result = await controller.widgetSend({
      agentId: 'agent-1',
      message: 'Hi',
    } as any);
    expect(mockChatService.sendMessage).toHaveBeenCalledWith(
      't-1',
      'agent-1',
      'Hi',
      undefined,
      undefined,
      true,
      { utmParams: undefined, referrerUrl: undefined, landingPageUrl: undefined },
      expect.any(Object),
    );
    expect(result).toEqual({ reply: 'Hello', conversationId: 'conv-1' });
  });

  it('returns conversation history', async () => {
    mockConvRepo.findOne.mockResolvedValue({ id: 'conv-1', tenantId: 't-1' });
    const result = await controller.getHistory('conv-1');
    expect(mockChatService.getHistory).toHaveBeenCalledWith('conv-1', 't-1');
    expect(result).toEqual({ conversation: { id: 'conv-1' }, messages: [] });
  });

  it('serves an html demo page for an agent', async () => {
    mockAgentRepo.findOne.mockResolvedValue({ id: 'agent-1', tenantId: 't-1', name: 'Bot' });
    const res = { setHeader: jest.fn(), send: jest.fn() } as any;
    const req = { headers: { host: 'localhost:3001', 'x-forwarded-proto': 'http' } } as any;
    await controller.getDemoPage('agent-1', req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('agent-1'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Bot'));
  });

  it('returns 404 for missing agent demo', async () => {
    mockAgentRepo.findOne.mockResolvedValue(null);
    const res = { setHeader: jest.fn(), send: jest.fn() } as any;
    const req = { headers: { host: 'localhost:3001' } } as any;
    await expect(controller.getDemoPage('missing', req, res)).rejects.toThrow('Agent not found');
  });
});
