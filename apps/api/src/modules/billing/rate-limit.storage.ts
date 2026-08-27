export interface RateLimitStorage {
  isAllowed(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export class MemoryRateLimitStorage implements RateLimitStorage {
  private readonly requests = new Map<string, number[]>();

  async isAllowed(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);
    if (recent.length >= limit) return false;
    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}

export class RedisRateLimitStorage implements RateLimitStorage {
  private client: any;
  private enabled = false;

  constructor(url: string) {
    try {
      // @ts-ignore
      const Redis = require('ioredis');
      this.client = new Redis(url, {
        connectTimeout: 1000,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      this.enabled = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('ioredis not installed, falling back to in-memory rate limit');
    }
  }

  async isAllowed(key: string, limit: number, windowMs: number): Promise<boolean> {
    if (!this.enabled) {
      return new MemoryRateLimitStorage().isAllowed(key, limit, windowMs);
    }
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rate:${key}`;

    try {
      const pipeline = this.client.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zrange(redisKey, 0, -1, 'WITHSCORES');
      const [[,], [, rangeResult]] = (await pipeline.exec()) || [];
      const timestamps: string[] = rangeResult || [];
      if (timestamps.length / 2 >= limit) return false;

      await this.client.zadd(redisKey, now, `${now}:${Math.random()}`);
      await this.client.pexpire(redisKey, windowMs);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Redis rate limit failed, falling back to memory', err);
      return new MemoryRateLimitStorage().isAllowed(key, limit, windowMs);
    }
  }
}

export const RATE_LIMIT_STORAGE = 'RATE_LIMIT_STORAGE';
