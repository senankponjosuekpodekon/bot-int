import { Test } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChatService } from '../chat/chat.service';
import { AgentsService } from '../agents/agents.service';
import { WebhookService } from '../webhooks/webhook.service';
import { ConversationChannel } from '../chat/conversation.entity';
import { ApiKeyGuard } from '../billing/api-key.guard';

class GuardMock implements CanActivate {
  canActivate() {
    return true;
  }
}

describe('ChannelsController', () => {
  let controller: ChannelsController;
  let chatService: any;
  let agentsService: any;
  let webhookService: any;

  const mockTenant = { tenantId: 't-1', apiKeyId: 'key-1' };

  beforeEach(async () => {
    chatService = {
      sendMessage: jest.fn().mockResolvedValue({ conversationId: 'c-1', reply: 'hello', leadId: 'l-1', funnelStage: 'new', intentScore: 0.5 }),
      getConversations: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      getHistory: jest.fn().mockResolvedValue([]),
    };
    agentsService = {
      findByTenant: jest.fn().mockResolvedValue({ data: [{ id: 'a-1', name: 'Agent', type: 'sales', isActive: true }] }),
    };
    webhookService = {
      create: jest.fn().mockResolvedValue({ id: 'we-1', url: 'https://example.com/hook' }),
      findByTenant: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      trigger: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [
        { provide: ChatService, useValue: chatService },
        { provide: AgentsService, useValue: agentsService },
        { provide: WebhookService, useValue: webhookService },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue(new GuardMock())
      .compile();

    controller = module.get<ChannelsController>(ChannelsController);
  });

  it('lists agents scoped to tenant', async () => {
    const result = await controller.listAgents({ user: mockTenant } as any);
    expect(agentsService.findByTenant).toHaveBeenCalledWith('t-1', 1, 100);
    expect(result).toEqual([{ id: 'a-1', name: 'Agent', type: 'sales', isActive: true }]);
  });

  it('sends message and returns conversation metadata', async () => {
    const result = await controller.sendMessage({ user: mockTenant } as any, {
      agentId: 'a-1',
      message: 'hello',
      channel: 'api',
    } as any);

    expect(chatService.sendMessage).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ conversationId: 'c-1', channel: ConversationChannel.API }));
  });

  it('registers webhook via WebhookService', async () => {
    const result = await controller.registerWebhook({ user: mockTenant } as any, { url: 'https://example.com/hook', events: 'lead.created,conversation.closed' } as any);

    expect(webhookService.create).toHaveBeenCalledWith('t-1', 'https://example.com/hook', ['lead.created', 'conversation.closed']);
    expect(result).toEqual(expect.objectContaining({ status: 'registered', id: 'we-1' }));
  });

  it('deletes a single webhook by id', async () => {
    await controller.removeWebhook({ user: mockTenant } as any, 'we-1');
    expect(webhookService.delete).toHaveBeenCalledWith('we-1', 't-1');
  });
});
