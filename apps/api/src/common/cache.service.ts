import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL: number;
  private client: Redis | null = null;
  private useRedis = false;

  constructor(private configService: ConfigService) {
    this.defaultTTL = this.configService.get<number>('CACHE_TTL', 300);
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      try {
        this.client = new Redis(redisUrl);
        this.useRedis = true;
      } catch {
        // fall back to in-memory if Redis cannot be reached
      }
    }

    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis && this.client) {
      const data = await this.client.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    }

    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTTL;

    if (this.useRedis && this.client) {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return;
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.useRedis && this.client) {
      await this.client.del(key);
      return;
    }
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.useRedis && this.client) {
      const keys: string[] = [];
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      for await (const chunk of stream) {
        keys.push(...(chunk as string[]));
      }
      if (keys.length) {
        await this.client.del(...keys);
      }
      return;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    if (this.useRedis && this.client) {
      await this.client.flushdb();
      return;
    }
    this.cache.clear();
  }

  onModuleDestroy() {
    this.client?.disconnect();
    this.client = null;
  }

  private startCleanupInterval(): void {
    if (this.useRedis) return;
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }
}
