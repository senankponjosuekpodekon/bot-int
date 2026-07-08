import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  async create(tenantId: string, data: Partial<Lead>): Promise<Lead> {
    const lead = this.leadRepo.create({ ...data, tenantId });
    return this.leadRepo.save(lead);
  }

  async findByTenant(tenantId: string): Promise<Lead[]> {
    return this.leadRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateStatus(id: string, tenantId: string, status: LeadStatus): Promise<Lead> {
    await this.leadRepo.update({ id, tenantId }, { status });
    return this.findById(id, tenantId);
  }

  async update(id: string, tenantId: string, data: Partial<Lead>): Promise<Lead> {
    await this.leadRepo.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }
}
