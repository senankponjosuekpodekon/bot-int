import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentMemory, MemoryScope } from './agent-memory.entity';
import { LLMService } from '../chat/llm.service';
import { LLMMessage } from '../chat/llm-provider.interface';

const MEMORY_TTL_DAYS = 90;
const LOW_IMPORTANCE_THRESHOLD = 0.5;

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    @InjectRepository(AgentMemory)
    private readonly memoryRepo: Repository<AgentMemory>,
    private readonly llmService: LLMService,
  ) {}

  async remember(
    tenantId: string,
    scope: MemoryScope,
    scopeId: string,
    key: string,
    value: string,
    agentId?: string,
    importance = 1.0,
    businessId?: string,
    source: 'stated' | 'inferred' = 'stated',
    confidence = 1.0,
    expiresAt?: Date,
  ): Promise<AgentMemory> {
    const where: any = { tenantId, scope, scopeId, key, source };
    if (businessId) where.businessId = businessId;
    if (agentId) where.agentId = agentId;
    const existing = await this.memoryRepo.findOne({ where });
    if (existing) {
      existing.value = value;
      existing.importance = importance;
      existing.confidence = confidence;
      existing.source = source;
      if (expiresAt !== undefined) existing.expiresAt = expiresAt;
      if (agentId) existing.agentId = agentId;
      if (businessId) existing.businessId = businessId;
      return this.memoryRepo.save(existing);
    }
    return this.memoryRepo.save(
      this.memoryRepo.create({ tenantId, agentId, businessId, scope, scopeId, key, value, importance, source, confidence, expiresAt }),
    );
  }

  async recall(
    tenantId: string,
    scope: MemoryScope,
    scopeId: string,
    keys?: string[],
    agentId?: string,
    businessId?: string,
    source?: 'stated' | 'inferred',
  ): Promise<AgentMemory[]> {
    const qb = this.memoryRepo
      .createQueryBuilder('mem')
      .where('mem.tenantId = :tenantId', { tenantId })
      .andWhere('mem.scope = :scope', { scope })
      .andWhere('mem.scopeId = :scopeId', { scopeId })
      .andWhere('(mem.expiresAt IS NULL OR mem.expiresAt > :now)', { now: new Date() });
    if (businessId) {
      qb.andWhere('mem.businessId = :businessId', { businessId });
    }
    if (agentId) {
      qb.andWhere('mem.agentId = :agentId', { agentId });
    }
    if (source) {
      qb.andWhere('mem.source = :source', { source });
    }
    qb.orderBy('mem.importance', 'DESC')
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
    agentId?: string,
    businessId?: string,
  ): Promise<string | null> {
    const memories = await this.recall(tenantId, scope, scopeId, undefined, agentId, businessId, 'stated');
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
    businessId?: string,
  ): Promise<Record<string, string>> {
    const facts: Record<string, string> = {};

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
        const value = pattern.extract(match);
        facts[pattern.key] = value;
        try {
          await this.remember(tenantId, scope, scopeId, pattern.key, value, agentId, 1.0, businessId, 'stated');
        } catch (err: any) {
          this.logger.warn(`Failed to store memory ${pattern.key}: ${err?.message}`);
        }
      }
    }

    try {
      const llmFacts = await this.extractWithLLM(userMessage, agentReply);
      for (const [key, value] of Object.entries(llmFacts)) {
        const normalized = String(value).trim();
        if (!normalized) continue;
        if (!this.isAllowedProfileKey(key)) continue;
        const existing = facts[key];
        if (!existing || normalized.length > existing.length || !normalized.includes(existing)) {
          facts[key] = normalized;
        }
        await this.remember(tenantId, scope, scopeId, key, normalized, agentId, 1.0, businessId, 'inferred', 0.8);
      }
    } catch (err: any) {
      this.logger.warn(`LLM profile extraction failed: ${err?.message}`);
    }

    return facts;
  }

  private async extractWithLLM(userMessage: string, agentReply: string): Promise<Record<string, string>> {
    const prompt = `You are a customer profiling assistant. Extract concrete facts about the customer from this conversation turn. Return strictly JSON.

Customer message: """${userMessage}"""
Assistant reply: """${agentReply}"""

Return only a JSON object where each key is a fact type and each value is the extracted information as a short string. Do not include keys for information that is not present.

Example:
{
  "name": "Sophie Martin",
  "email": "sophie@example.com",
  "phone": "+33 6 12 34 56 78",
  "company": "Boulangerie Martin",
  "budget": "2000€",
  "need": "un site vitrine avec commande en ligne",
  "problem": "trop de demandes par email, pas de chat en ligne",
  "location": "Lyon",
  "deadline": "dans 2 mois",
  "language": "fr",
  "role": "propriétaire",
  "industry": "restauration"
}

Allowed keys: name, email, phone, company, budget, need, problem, location, deadline, language, role, industry, preferences, decision_maker, competitors, interests, notes.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Extract the customer facts.' },
    ];
    const raw = await this.llmService.chat(messages);
    const json = this.extractJson(raw);
    return JSON.parse(json);
  }

  private isAllowedProfileKey(key: string): boolean {
    const allowed = new Set([
      'name', 'email', 'phone', 'company', 'budget', 'need', 'location',
      'deadline', 'language', 'role', 'industry', 'preferences',
      'decision_maker', 'competitors', 'interests', 'notes',
    ]);
    return allowed.has(key);
  }

  private extractJson(raw: string): string {
    const match = raw.match(/\{[\s\S]*?\}/);
    return match ? match[0] : raw;
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
