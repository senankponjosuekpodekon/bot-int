import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import axios from 'axios';
import { CryptoService } from '../../common/crypto.service';
import { IntegrationsService } from '../integrations/integrations.service';

export type WebhookEvent = 'lead.created' | 'lead.updated' | 'conversation.created' | 'conversation.closed' | 'message.replied';

@Entity('webhook_endpoints')
@Index(['tenantId', 'isActive'])
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  url: string;

  @Column({ type: 'text', array: true })
  events: string[];

  @Column({ type: 'text', nullable: true })
  secret: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly webhookRepo: Repository<WebhookEndpoint>,
    private readonly crypto: CryptoService,
  ) {}

  async create(tenantId: string, url: string, events: string[], secret?: string): Promise<WebhookEndpoint> {
    const encryptedSecret = secret ? this.crypto.encrypt(secret) : null;
    const endpoint = this.webhookRepo.create({ tenantId, url, events, secret: encryptedSecret });
    return this.webhookRepo.save(endpoint);
  }

  async findByTenant(tenantId: string): Promise<WebhookEndpoint[]> {
    return this.webhookRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async update(id: string, tenantId: string, data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    if (data.secret) {
      data.secret = this.crypto.encrypt(data.secret);
    }
    await this.webhookRepo.update({ id, tenantId }, data);
    return this.webhookRepo.findOne({ where: { id, tenantId } });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.webhookRepo.delete({ id, tenantId });
  }

  async trigger(event: WebhookEvent, tenantId: string, payload: Record<string, any>): Promise<void> {
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

      await Promise.allSettled(
        matching.map(async (endpoint) => {
          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'X-Webhook-Event': event,
            };
            if (endpoint.secret) {
              headers['X-Webhook-Signature'] = this.crypto.decrypt(endpoint.secret);
            }

            await axios.post(endpoint.url, body, {
              headers,
              timeout: 10000,
            });
            this.logger.log(`Webhook ${event} delivered to ${endpoint.url}`);
          } catch (err: any) {
            this.logger.warn(`Webhook ${event} failed for ${endpoint.url}: ${err?.message}`);
          }
        }),
      );
    } catch (err: any) {
      this.logger.error(`Webhook trigger error: ${err?.message}`);
    }
  }
}
