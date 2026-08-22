import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache.service';

export interface Session {
  userId: string;
  tenantId: string;
  tokenId: string;
  createdAt: string;
}

@Injectable()
export class SessionService {
  private indexKey(userId: string): string {
    return `sessions-index:${userId}`;
  }

  private sessionKey(userId: string, tokenId: string): string {
    return `session:${userId}:${tokenId}`;
  }

  constructor(private readonly cache: CacheService) {}

  async create(userId: string, tenantId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    const session: Session = {
      userId,
      tenantId,
      tokenId,
      createdAt: new Date().toISOString(),
    };
    await this.cache.set(this.sessionKey(userId, tokenId), session, ttlSeconds);

    const index = await this.cache.get<string[]>(this.indexKey(userId));
    const next = [...(index || []), tokenId];
    await this.cache.set(this.indexKey(userId), next, ttlSeconds + 86400);
  }

  async findByUser(userId: string): Promise<Session[]> {
    const index = await this.cache.get<string[]>(this.indexKey(userId));
    if (!index || index.length === 0) return [];

    const sessions: Session[] = [];
    for (const tokenId of index) {
      const session = await this.cache.get<Session>(this.sessionKey(userId, tokenId));
      if (session) sessions.push(session);
    }
    return sessions;
  }

  async remove(userId: string, tokenId: string): Promise<void> {
    await this.cache.del(this.sessionKey(userId, tokenId));

    const index = await this.cache.get<string[]>(this.indexKey(userId));
    if (index) {
      const next = index.filter((id) => id !== tokenId);
      await this.cache.set(this.indexKey(userId), next, 60 * 60 * 24 * 30);
    }
  }

  async get(userId: string, tokenId: string): Promise<Session | null> {
    return this.cache.get<Session>(this.sessionKey(userId, tokenId));
  }
}
