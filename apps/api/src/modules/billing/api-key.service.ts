import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKey } from './api-key.entity';
import { BillingService } from './billing.service';
import { PlanType } from './subscription.entity';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly keyRepo: Repository<ApiKey>,
    private readonly billingService: BillingService,
  ) {}

  async create(tenantId: string, name: string, scopes: string[] = ['chat:send', 'chat:history', 'agents:read']): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const rawKey = `stia_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const prefix = rawKey.substring(0, 12);

    const apiKey = this.keyRepo.create({
      tenantId,
      name,
      keyHash,
      prefix,
      scopes,
      isActive: true,
    });
    await this.keyRepo.save(apiKey);

    return { apiKey, plainKey: rawKey };
  }

  async list(tenantId: string): Promise<ApiKey[]> {
    return this.keyRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async revoke(tenantId: string, id: string): Promise<void> {
    const key = await this.keyRepo.findOne({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');
    key.isActive = false;
    await this.keyRepo.save(key);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.keyRepo.delete({ id, tenantId });
  }

  async validate(rawKey: string): Promise<ApiKey | null> {
    if (!rawKey || !rawKey.startsWith('stia_')) return null;

    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.keyRepo.findOne({ where: { keyHash, isActive: true } });
    if (!apiKey) return null;

    // Update last used
    apiKey.lastUsedAt = new Date();
    apiKey.totalRequests += 1;
    await this.keyRepo.save(apiKey);

    return apiKey;
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async checkApiAccess(tenantId: string): Promise<boolean> {
    try {
      const usage = await this.billingService.getUsageStats(tenantId);
      return usage.apiAccess === true;
    } catch {
      return false;
    }
  }
}
