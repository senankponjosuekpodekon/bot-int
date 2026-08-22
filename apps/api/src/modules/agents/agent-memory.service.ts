import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentMemory, MemoryScope } from './agent-memory.entity';

const MEMORY_TTL_DAYS = 90;
const LOW_IMPORTANCE_THRESHOLD = 0.5;

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    @InjectRepository(AgentMemory)
    private readonly memoryRepo: Repository<AgentMemory>,
  ) {}

  async remember(
    tenantId: string,
    scope: MemoryScope,
    scopeId: string,
    key: string,
    value: string,
    agentId?: string,
    importance = 1.0,
  ): Promise<AgentMemory> {
    const existing = await this.memoryRepo.findOne({
      where: { tenantId, scope, scopeId, key },
    });
    if (existing) {
      existing.value = value;
      existing.importance = importance;
      if (agentId) existing.agentId = agentId;
      return this.memoryRepo.save(existing);
    }
    return this.memoryRepo.save(
      this.memoryRepo.create({ tenantId, agentId, scope, scopeId, key, value, importance }),
    );
  }

  async recall(
    tenantId: string,
    scope: MemoryScope,
    scopeId: string,
    keys?: string[],
  ): Promise<AgentMemory[]> {
    const qb = this.memoryRepo
      .createQueryBuilder('mem')
      .where('mem.tenantId = :tenantId', { tenantId })
      .andWhere('mem.scope = :scope', { scope })
      .andWhere('mem.scopeId = :scopeId', { scopeId })
      .orderBy('mem.importance', 'DESC')
      .addOrderBy('mem.updatedAt', 'DESC');

    if (keys && keys.length > 0) {
      qb.andWhere('mem.key IN (:...keys)', { keys });
    }
    return qb.getMany();
  }

  async recallAsContext(
    tenantId: string,
    scope: MemoryScope,
    scopeId: string,
    limit = 10,
  ): Promise<string | null> {
    const memories = await this.recall(tenantId, scope, scopeId);
    if (memories.length === 0) return null;
    const top = memories.slice(0, limit);
    return top
      .map((m) => `- ${m.key}: ${m.value}`)
      .join('\n');
  }

  async forget(tenantId: string, scope: MemoryScope, scopeId: string, key?: string): Promise<void> {
    const where: any = { tenantId, scope, scopeId };
    if (key) where.key = key;
    await this.memoryRepo.delete(where);
  }

  async extractAndStore(
    tenantId: string,
    scope: MemoryScope,
    scopeId: string,
    userMessage: string,
    agentReply: string,
    agentId?: string,
  ): Promise<void> {
    const lowerMsg = userMessage.toLowerCase();

    const patterns: { key: string; regex: RegExp; extract: (m: RegExpMatchArray) => string }[] = [
      { key: 'name', regex: /(?:je suis|mon nom est|je m'appelle|m'appelle|my name is|i am|i'm)\s+([a-zA-ZÀ-ÿ'-]+)/i, extract: (m) => m[1].trim() },
      { key: 'email', regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i, extract: (m) => m[1].trim() },
      { key: 'phone', regex: /(?:mon (?:numéro|tel|téléphone)|my phone|call me|contact me at)\s*[:\s]*([+0-9\s().-]{8,})/i, extract: (m) => m[1].trim() },
      { key: 'company', regex: /(?:je travaille (?:chez|pour)|mon entreprise|my company|i work at)\s+([a-zA-Z0-9&'-]+)/i, extract: (m) => m[1].trim() },
      { key: 'budget', regex: /(?:budget|je peux (?:dépenser|payer)|i can (?:spend|afford))\s*[:\s]*([0-9\s.,]+(?:€|euros?|\$|dollars?|chf)?)/i, extract: (m) => m[1].trim() },
      { key: 'location', regex: /(?:je suis à|j'habite à|je vis à|i live in|i'm in|located in)\s+([a-zA-ZÀ-ÿ'-]+)/i, extract: (m) => m[1].trim() },
      { key: 'need', regex: /(?:je (?:cherche|veux|souhaite|besoin)|i (?:need|want|looking for))\s+(.{5,80})/i, extract: (m) => m[1].trim() },
    ];

    for (const pattern of patterns) {
      const match = userMessage.match(pattern.regex);
      if (match && pattern.extract(match)) {
        try {
          await this.remember(tenantId, scope, scopeId, pattern.key, pattern.extract(match), agentId);
        } catch (err: any) {
          this.logger.warn(`Failed to store memory ${pattern.key}: ${err?.message}`);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async cleanupExpiredMemories(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MEMORY_TTL_DAYS);

    try {
      const result = await this.memoryRepo
        .createQueryBuilder('mem')
        .delete()
        .where('mem.importance < :threshold', { threshold: LOW_IMPORTANCE_THRESHOLD })
        .andWhere('mem.updatedAt < :cutoff', { cutoff: cutoffDate })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired low-importance memories (older than ${MEMORY_TTL_DAYS} days)`);
      }
    } catch (err: any) {
      this.logger.warn(`Memory cleanup failed: ${err?.message}`);
    }
  }
}
