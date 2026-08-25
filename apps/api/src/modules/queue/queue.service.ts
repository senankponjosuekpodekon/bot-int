import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { JobEntity, JobStatus } from './job.entity';

export interface JobHandler {
  queue: string;
  handle(data: Record<string, any>): Promise<any>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private handlers = new Map<string, JobHandler>();
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    private readonly dataSource: DataSource,
  ) {}

  registerHandler(handler: JobHandler): void {
    this.handlers.set(handler.queue, handler);
    this.logger.log(`Registered handler for queue: ${handler.queue}`);
  }

  startWorker(intervalMs = 5000): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.poll().catch((err) => {
      this.logger.error(`Queue poll error: ${err?.message}`);
    }), intervalMs);
    this.logger.log(`Queue worker started (interval: ${intervalMs}ms)`);
  }

  stopWorker(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async addWebhook(tenantId: string, event: string, payload: Record<string, any>): Promise<JobEntity> {
    return this.enqueue('webhooks', 'webhook.trigger', { tenantId, event, payload }, tenantId);
  }

  async addShopifyImport(
    tenantId: string,
    shopDomain: string,
    accessToken: string,
    integrationType: 'shopify' | 'public_feed' = 'shopify',
  ): Promise<JobEntity> {
    return this.enqueue('shopify-imports', 'shopify.import', { tenantId, shopDomain, accessToken, integrationType }, tenantId);
  }

  async enqueue(
    queue: string,
    name: string,
    data: Record<string, any>,
    tenantId?: string,
    delayMs = 0,
  ): Promise<JobEntity> {
    const availableAt = delayMs > 0 ? new Date(Date.now() + delayMs) : new Date();
    const job = this.jobRepo.create({
      queue,
      name,
      data,
      tenantId: tenantId || null,
      delayMs,
      availableAt,
      status: 'pending',
    });
    return this.jobRepo.save(job);
  }

  private async poll(): Promise<void> {
    if (this.handlers.size === 0) return;

    const job = await this.claimNextJob();
    if (!job) return;

    const handler = this.handlers.get(job.queue);
    if (!handler) {
      this.logger.warn(`No handler for queue ${job.queue}, marking job ${job.id} as failed`);
      await this.markFailed(job, `No handler registered for queue: ${job.queue}`);
      return;
    }

    try {
      await handler.handle(job.data);
      await this.markCompleted(job);
    } catch (err: any) {
      this.logger.error(`Job ${job.id} (${job.queue}) failed: ${err?.message}`);
      await this.handleFailure(job, err?.message || 'Unknown error');
    }
  }

  private async claimNextJob(): Promise<JobEntity | null> {
    const queues = Array.from(this.handlers.keys());
    if (queues.length === 0) return null;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();
      const raw: any[] = await queryRunner.query(
        `SELECT * FROM "jobs"
         WHERE "status" = $1
           AND ("availableAt" IS NULL OR "availableAt" <= $2)
           AND "queue" = ANY($3::text[])
         ORDER BY "createdAt" ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        ['pending', now, queues],
      );

      if (!raw || raw.length === 0) {
        await queryRunner.commitTransaction();
        return null;
      }

      const row = raw[0];
      await queryRunner.query(
        `UPDATE "jobs" SET "status" = $1, "startedAt" = $2, "attempts" = "attempts" + 1, "updatedAt" = $3 WHERE "id" = $4`,
        ['active', now, now, row.id],
      );

      await queryRunner.commitTransaction();

      return this.jobRepo.create({
        id: row.id,
        tenantId: row.tenantId,
        queue: row.queue,
        name: row.name,
        data: row.data,
        attempts: (row.attempts || 0) + 1,
        maxAttempts: row.maxAttempts || 3,
        delayMs: row.delayMs || 0,
        availableAt: row.availableAt,
        startedAt: now,
        status: 'active' as JobStatus,
        createdAt: row.createdAt,
        updatedAt: now,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async markCompleted(job: JobEntity): Promise<void> {
    await this.jobRepo.update(job.id, {
      status: 'completed',
      completedAt: new Date(),
    });
  }

  private async markFailed(job: JobEntity, error: string): Promise<void> {
    await this.jobRepo.update(job.id, {
      status: 'failed',
      failedAt: new Date(),
      error,
    });
  }

  private async handleFailure(job: JobEntity, error: string): Promise<void> {
    if (job.attempts < job.maxAttempts) {
      const backoffMs = Math.min(2000 * Math.pow(2, job.attempts - 1), 60000);
      await this.jobRepo.update(job.id, {
        status: 'pending',
        startedAt: null,
        availableAt: new Date(Date.now() + backoffMs),
        error,
      });
    } else {
      await this.markFailed(job, error);
    }
  }

  async cleanupOldJobs(olderThanDays = 7): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000);
    await this.jobRepo.delete({
      status: 'completed',
      completedAt: LessThan(cutoff),
    });
    await this.jobRepo.delete({
      status: 'failed',
      failedAt: LessThan(cutoff),
    });
  }
}
