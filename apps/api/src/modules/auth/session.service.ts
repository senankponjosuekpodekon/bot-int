import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SessionEntity } from './session.entity';

export interface Session {
  userId: string;
  tenantId: string;
  tokenId: string;
  createdAt: string;
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repo: Repository<SessionEntity>,
  ) {}

  async create(userId: string, tenantId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.repo.save(this.repo.create({ userId, tenantId, tokenId, expiresAt }));
  }

  async findByUser(userId: string): Promise<Session[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const now = new Date();
    return rows
      .filter((r) => r.expiresAt > now)
      .map((r) => ({
        userId: r.userId,
        tenantId: r.tenantId,
        tokenId: r.tokenId,
        createdAt: r.createdAt.toISOString(),
      }));
  }

  async remove(userId: string, tokenId: string): Promise<void> {
    await this.repo.delete({ userId, tokenId });
  }

  async get(userId: string, tokenId: string): Promise<Session | null> {
    const row = await this.repo.findOne({ where: { userId, tokenId } });
    if (!row || row.expiresAt <= new Date()) return null;
    return {
      userId: row.userId,
      tenantId: row.tenantId,
      tokenId: row.tokenId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async cleanupExpired(): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(new Date()) });
  }
}
