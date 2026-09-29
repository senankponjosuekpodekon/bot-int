import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { createHmac } from 'crypto';
import { CryptoService } from '../../common/crypto.service';
import { assertPublicHttpUrl } from '../../common/ssrf-guard';
import { QueueService } from '../queue/queue.service';
import { MetricsService } from '../../common/metrics.service';
import { WebhookEndpoint } from './webhook-endpoint.entity';

export type WebhookEvent = 'lead.created' | 'lead.updated' | 'conversation.created' | 'conversation.closed' | 'message.replied';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly webhookRepo: Repository<WebhookEndpoint>,
    private readonly crypto: CryptoService,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService,
    private readonly metrics: MetricsService,
  ) {}

  async create(tenantId: string, url: string, events: string[], secret?: string): Promise<WebhookEndpoint> {
    await assertPublicHttpUrl(url);
    const encryptedSecret = secret ? this.crypto.encrypt(secret) : null;
    const endpoint = this.webhookRepo.create({ tenantId, url, events, secret: encryptedSecret });
    return this.webhookRepo.save(endpoint);
  }

  async findByTenant(tenantId: string): Promise<WebhookEndpoint[]> {
    return this.webhookRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async update(id: string, tenantId: string, data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    if (data.url) {
      await assertPublicHttpUrl(data.url);
    }
    if (data.secret) {
      data.secret = this.crypto.encrypt(data.secret);
    }
    await this.webhookRepo.update({ id, tenantId }, data);
    return this.webhookRepo.findOne({ where: { id, tenantId } });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.webhookRepo.delete({ id, tenantId });
  }

  // Enqueues outbound delivery — retries are handled by the job queue.
  async trigger(event: WebhookEvent, tenantId: string, payload: Record<string, any>): Promise<void> {
    try {
      await this.queueService.addWebhook(tenantId, event, payload);
    } catch (err: any) {
      this.logger.error(`Webhook enqueue error: ${err?.message}`);
    }
  }

  // Called by the queue worker — fans out to every matching endpoint.
  async deliverAll(tenantId: string, event: string, payload: Record<string, any>): Promise<void> {
    try {
      const endpoints = await this.webhookRepo.find({
        where: { tenantId, isActive: true },
      });

      const matching = endpoints.filter((e) => e.events.includes(event));
      if (matching.length === 0) return;

      const body = {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      const results = await Promise.allSettled(matching.map((endpoint) => this.deliver(endpoint, event, body)));
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`${failed.length}/${results.length} webhook deliveries failed`);
      }
    } catch (err: any) {
      this.logger.error(`Webhook deliverAll error: ${err?.message}`);
      throw err;
    }
  }

  private async deliver(endpoint: WebhookEndpoint, event: string, body: Record<string, any>): Promise<void> {
    const payload = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
    };
    if (endpoint.secret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const secret = this.crypto.decrypt(endpoint.secret);
      const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
      headers['X-Webhook-Timestamp'] = timestamp;
      headers['X-Webhook-Signature'] = `t=${timestamp},v1=${signature}`;
    }

    try {
      await axios.post(endpoint.url, body, { headers, timeout: 10000 });
      this.metrics.incCounter('webhook_deliveries_total', { event, result: 'success' });
      this.logger.log(`Webhook ${event} delivered to ${endpoint.url}`);
    } catch (err: any) {
      this.metrics.incCounter('webhook_deliveries_total', { event, result: 'failed' });
      this.logger.warn(`Webhook ${event} failed for ${endpoint.url}: ${err?.message}`);
      throw err;
    }
  }
}
