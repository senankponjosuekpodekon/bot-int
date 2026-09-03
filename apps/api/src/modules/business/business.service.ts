import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './business.entity';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  async getDefaultForTenant(tenantId: string): Promise<Business> {
    const existing = await this.businessRepo.findOne({
      where: { tenantId, isDefault: true },
    });
    if (existing) return existing;

    const count = await this.businessRepo.count({ where: { tenantId } });
    const business = this.businessRepo.create({
      tenantId,
      name: count === 0 ? 'Default business' : `Business ${count + 1}`,
      isDefault: true,
    });
    return this.businessRepo.save(business);
  }

  async findByTenant(tenantId: string): Promise<Business[]> {
    return this.businessRepo.find({
      where: { tenantId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Business | null> {
    return this.businessRepo.findOne({ where: { id, tenantId } });
  }
}
