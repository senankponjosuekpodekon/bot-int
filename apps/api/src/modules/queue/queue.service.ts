import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('webhooks') private readonly webhookQueue: Queue,
    @InjectQueue('shopify-imports') private readonly shopifyQueue: Queue,
  ) {}

  async addWebhook(tenantId: string, event: string, payload: Record<string, any>) {
    return this.webhookQueue.add('webhook.trigger', { tenantId, event, payload });
  }

  async addShopifyImport(
    tenantId: string,
    shopDomain: string,
    accessToken: string,
    integrationType: 'shopify' | 'public_feed' = 'shopify',
  ) {
    return this.shopifyQueue.add('shopify.import', { tenantId, shopDomain, accessToken, integrationType });
  }
}
