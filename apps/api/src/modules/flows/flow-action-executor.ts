import { Injectable, Logger } from '@nestjs/common';
import { WebhookService, WebhookEvent } from '../webhooks/webhook.service';

export interface FlowAction {
  type: string;
  config?: Record<string, any>;
}

export interface FlowActionContext {
  tenantId: string;
  agentId: string;
  flowId: string;
  conversationId: string;
  extractedData: Record<string, string>;
  summary: string;
  channel?: string;
}

export interface FlowActionResult {
  action: string;
  success: boolean;
  details?: Record<string, any>;
  error?: string;
}

@Injectable()
export class FlowActionExecutor {
  private readonly logger = new Logger(FlowActionExecutor.name);

  constructor(private readonly webhookService?: WebhookService) {}

  async execute(actions: FlowAction[] | undefined, context: FlowActionContext): Promise<FlowActionResult[]> {
    const results: FlowActionResult[] = [];
    if (!actions || actions.length === 0) return results;

    for (const action of actions) {
      try {
        const result = await this.executeOne(action, context);
        results.push(result);
      } catch (err: any) {
        this.logger.warn(`Flow action ${action.type} failed for flow ${context.flowId}: ${err?.message}`);
        results.push({ action: action.type, success: false, error: err?.message });
      }
    }

    return results;
  }

  private async executeOne(action: FlowAction, context: FlowActionContext): Promise<FlowActionResult> {
    const { tenantId, agentId, flowId, conversationId, extractedData, summary, channel } = context;

    switch (action.type) {
      case 'webhook': {
        if (!this.webhookService) {
          return { action: 'webhook', success: false, error: 'WebhookService not available' };
        }
        const event = (action.config?.event as WebhookEvent) || 'conversation.closed';
        const payload = {
          agentId,
          flowId,
          conversationId,
          channel,
          extractedData,
          summary,
          ...action.config?.payload,
        };
        await this.webhookService.trigger(event, tenantId, payload);
        return { action: 'webhook', success: true, details: { event } };
      }

      case 'log': {
        this.logger.log(`Flow ${flowId} completed for conversation ${conversationId}: ${summary}`);
        return { action: 'log', success: true };
      }

      default: {
        this.logger.warn(`Unknown flow action type: ${action.type}`);
        return { action: action.type, success: false, error: `Unknown action type ${action.type}` };
      }
    }
  }
}
