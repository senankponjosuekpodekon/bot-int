import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../../common/metrics.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { Queue as BullQueue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { JobEntity, JobStatus } from './job.entity';
import { CryptoService } from '../../common/crypto.service';

export interface JobHandler {
  queue: string;
  handle(data: Record<string, any>): Promise<any>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private handlers = new Map<string, JobHandler>();
  private pollTimer: NodeJS.Timeout | null = null;
  private baseIntervalMs = 5000;
  private maxIntervalMs = Number(process.env.QUEUE_POLL_MAX_INTERVAL_MS || 60000);
  private currentDelayMs = 0;
  private redis: Redis | null = null;
  private readonly bullQueues = new Map<string, BullQueue>();
  private readonly workers = new Map<string, Worker>();
  private backlogTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    private readonly dataSource: DataSource,
    private readonly crypto: CryptoService,
    private readonly metrics: MetricsService,
    config: ConfigService,
  ) {
    // BullMQ when REDIS_URL is configured (multi-instance safe); otherwise the
    // DB-backed FOR UPDATE SKIP LOCKED poller below stays the fallback.
    const redisUrl = config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
      this.logger.log('Queue backend: Redis (BullMQ)');
    } else {
      this.logger.log('Queue backend: Postgres polling (set REDIS_URL for BullMQ)');
    }
  }

  private get useBull(): boolean {
    return !!this.redis;
  }

  private bullQueue(name: string): BullQueue {
    let q = this.bullQueues.get(name);
    if (!q) {
      q = new BullQueue(name, { connection: this.redis as Redis });
      this.bullQueues.set(name, q);
    }
    return q;
  }

  registerHandler(handler: JobHandler): void {
    this.handlers.set(handler.queue, handler);
    if (this.useBull) {
      const worker = new Worker(
        handler.queue,
        async (job) => {
          const start = Date.now();
          try {
            const result = await handler.handle(job.data);
            this.metrics.incCounter('queue_jobs_total', { queue: job.queueName, result: 'completed' });
            this.metrics.observeDuration('queue_job_duration_ms', Date.now() - start, { queue: job.queueName });
            return result;
          } catch (err) {
            this.metrics.incCounter('queue_jobs_total', { queue: job.queueName, result: 'failed' });
            throw err;
          }
        },
        { connection: this.redis as Redis, concurrency: Number(process.env.QUEUE_CONCURRENCY || 5) },
      );
      worker.on('error', (err) => this.logger.error(`Worker ${handler.queue} error: ${err?.message}`));
      this.workers.set(handler.queue, worker);
    }
    this.logger.log(`Registered handler for queue: ${handler.queue}`);
  }

  startWorker(intervalMs = 5000): void {
    if (this.useBull) {
      if (this.backlogTimer) return;
      const sample = async () => {
        for (const [name, q] of this.bullQueues) {
          try {
            const counts = await q.getJobCounts('waiting', 'delayed', 'active');
            this.metrics.setGauge('queue_backlog', (counts.waiting || 0) + (counts.delayed || 0), { queue: name });
          } catch { /* metrics are best-effort */ }
        }
      };
      sample().catch(() => undefined);
      this.backlogTimer = setInterval(sample, 15000);
      this.backlogTimer.unref();
      this.logger.log('BullMQ workers running (concurrency=' + (process.env.QUEUE_CONCURRENCY || 5) + ')');
      return;
    }
    if (this.pollTimer) return;
    this.baseIntervalMs = intervalMs;
    this.currentDelayMs = intervalMs;

    // Adaptive backoff: poll at base rate while jobs flow, slow exponentially
    // (up to QUEUE_POLL_MAX_INTERVAL_MS) when the queue is empty. This is what
    // lets an idle API stop hammering the DB every 5s.
    const tick = async () => {
      let didWork = false;
      try {
        didWork = await this.poll();
      } catch (err: any) {
        this.logger.error(`Queue poll error: ${err?.message}`);
      }
      this.currentDelayMs = didWork
        ? this.baseIntervalMs
        : Math.min(this.currentDelayMs * 2, this.maxIntervalMs);
      this.pollTimer = setTimeout(tick, this.currentDelayMs);
      this.pollTimer.unref();
    };

    this.pollTimer = setTimeout(tick, this.currentDelayMs);
    this.pollTimer.unref();
    this.logger.log(`Queue worker started (base: ${intervalMs}ms, max backoff: ${this.maxIntervalMs}ms)`);
  }

  async stopWorker(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.backlogTimer) {
      clearInterval(this.backlogTimer);
      this.backlogTimer = null;
    }
    for (const worker of this.workers.values()) await worker.close().catch(() => undefined);
    this.workers.clear();
    for (const q of this.bullQueues.values()) await q.close().catch(() => undefined);
    this.bullQueues.clear();
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
      this.redis = null;
    }
  }

  async addWebhook(tenantId: string, event: string, payload: Record<string, any>): Promise<JobEntity | null> {
    return this.enqueue('webhooks', 'webhook.trigger', { tenantId, event, payload }, tenantId);
  }

  async addShopifyImport(
    tenantId: string,
    shopDomain: string,
    accessToken: string,
    integrationType: 'shopify' | 'public_feed' = 'shopify',
  ): Promise<JobEntity | null> {
    // Never persist plaintext credentials in jobs.data
    const encryptedToken = this.crypto.encrypt(accessToken);
    return this.enqueue('shopify-imports', 'shopify.import', { tenantId, shopDomain, accessToken: encryptedToken, integrationType }, tenantId);
  }

  async enqueue(
    queue: string,
    name: string,
    data: Record<string, any>,
    tenantId?: string,
    delayMs = 0,
  ): Promise<JobEntity | null> {
    if (this.useBull) {
      await this.bullQueue(queue).add(name, { ...data, tenantId }, {
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400 },
      });
      return null;
    }
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

  private async poll(): Promise<boolean> {
    if (this.handlers.size === 0) return false;

    // Drain up to batchSize jobs per tick instead of a single job — keeps webhooks
    // flowing even when a slower queue (e.g. shopify imports) has backlog.
    const batchSize = Number(process.env.QUEUE_BATCH_SIZE || 5);
    let didWork = false;
    for (let i = 0; i < batchSize; i++) {
      const job = await this.claimNextJob();
      if (!job) break;
      didWork = true;

      const handler = this.handlers.get(job.queue);
      if (!handler) {
        this.logger.warn(`No handler for queue ${job.queue}, marking job ${job.id} as failed`);
        await this.markFailed(job, `No handler registered for queue: ${job.queue}`);
        this.metrics.incCounter('queue_jobs_total', { queue: job.queue, result: 'failed' });
        continue;
      }

      const start = Date.now();
      try {
        await handler.handle(job.data);
        await this.markCompleted(job);
        this.metrics.incCounter('queue_jobs_total', { queue: job.queue, result: 'completed' });
        this.metrics.observeDuration('queue_job_duration_ms', Date.now() - start, { queue: job.queue });
      } catch (err: any) {
        this.logger.error(`Job ${job.id} (${job.queue}) failed: ${err?.message}`);
        await this.handleFailure(job, err?.message || 'Unknown error');
        this.metrics.incCounter('queue_jobs_total', { queue: job.queue, result: 'failed' });
      }
    }
    if (!didWork) this.recordBacklog().catch(() => undefined);
    return didWork;
  }

  private async recordBacklog(): Promise<void> {
    const rows: { queue: string; count: string }[] = await this.jobRepo.query(
      `SELECT "queue", COUNT(*)::int AS count FROM "jobs" WHERE "status" = 'pending' GROUP BY "queue"`,
    );
    for (const r of rows) this.metrics.setGauge('queue_backlog', Number(r.count), { queue: r.queue });
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
