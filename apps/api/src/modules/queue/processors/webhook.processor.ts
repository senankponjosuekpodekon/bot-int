import { Injectable, Logger } from '@nestjs/common';
import { WebhookService } from '../../webhooks/webhook.service';
import { JobHandler } from '../queue.service';

@Injectable()
export class WebhookProcessor implements JobHandler {
  queue = 'webhooks';
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookService: WebhookService) {}

  async handle(data: Record<string, any>): Promise<void> {
    const { tenantId, event, payload } = data;
    this.logger.log(`Delivering webhook ${event} for tenant ${tenantId}`);
    await this.webhookService.trigger(event, tenantId, payload);
  }
}
