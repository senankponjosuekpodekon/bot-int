import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { WebhookService } from '../../webhooks/webhook.service';

@Processor('webhooks')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookService: WebhookService) {
    super();
  }

  async process(job: Job<{ tenantId: string; event: string; payload: Record<string, any> }>): Promise<void> {
    const { tenantId, event, payload } = job.data;
    this.logger.log(`Delivering webhook ${event} for tenant ${tenantId}`);
    await this.webhookService.trigger(event as any, tenantId, payload);
  }
}
