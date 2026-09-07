import { FlowActionExecutor, FlowActionContext } from './flow-action-executor';

describe('FlowActionExecutor', () => {
  let executor: FlowActionExecutor;
  let mockWebhookService: any;

  const context: FlowActionContext = {
    tenantId: 't-1',
    agentId: 'agent-1',
    flowId: 'flow-1',
    conversationId: 'conv-1',
    extractedData: { email: 'test@example.com' },
    summary: 'Email: test@example.com',
    channel: 'web',
  };

  beforeEach(() => {
    mockWebhookService = { trigger: jest.fn().mockResolvedValue(undefined) };
    executor = new FlowActionExecutor(mockWebhookService);
  });

  it('returns empty results when no actions are configured', async () => {
    const results = await executor.execute(undefined, context);
    expect(results).toEqual([]);
  });

  it('triggers a webhook action', async () => {
    const actions = [
      { type: 'webhook', config: { event: 'lead.created' } },
    ];

    const results = await executor.execute(actions, context);

    expect(mockWebhookService.trigger).toHaveBeenCalledWith(
      'lead.created',
      't-1',
      expect.objectContaining({
        agentId: 'agent-1',
        flowId: 'flow-1',
        conversationId: 'conv-1',
        extractedData: context.extractedData,
        summary: context.summary,
        channel: 'web',
      }),
    );
    expect(results).toEqual([{ action: 'webhook', success: true, details: { event: 'lead.created' } }]);
  });

  it('falls back to default webhook event when not configured', async () => {
    const actions = [{ type: 'webhook' }];
    await executor.execute(actions, context);
    expect(mockWebhookService.trigger).toHaveBeenCalledWith('conversation.closed', 't-1', expect.any(Object));
  });

  it('returns unknown action as failed', async () => {
    const actions = [{ type: 'unknown_thing' }];
    const results = await executor.execute(actions, context);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Unknown action type');
    expect(mockWebhookService.trigger).not.toHaveBeenCalled();
  });

  it('handles webhook errors without throwing', async () => {
    mockWebhookService.trigger.mockRejectedValue(new Error('network down'));
    const actions = [{ type: 'webhook' }];

    const results = await executor.execute(actions, context);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('network down');
  });

  it('performs log action without external calls', async () => {
    const actions = [{ type: 'log' }];
    const results = await executor.execute(actions, context);
    expect(results).toEqual([{ action: 'log', success: true }]);
    expect(mockWebhookService.trigger).not.toHaveBeenCalled();
  });
});
