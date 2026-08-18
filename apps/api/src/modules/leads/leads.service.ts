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

  async findByTenant(tenantId: string, params?: { status?: LeadStatus; tag?: string; search?: string }): Promise<Lead[]> {
    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId })
      .orderBy('lead.createdAt', 'DESC');

    if (params?.status) {
      qb.andWhere('lead.status = :status', { status: params.status });
    }

    if (params?.tag) {
      qb.andWhere(`:${params.tag} = ANY(lead.tags)`, { [params.tag]: params.tag });
    }

    if (params?.search) {
      qb.andWhere('(lead.name ILIKE :search OR lead.email ILIKE :search OR lead.company ILIKE :search OR lead.phone ILIKE :search)', {
        search: `%${params.search}%`,
      });
    }

    return qb.getMany();
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

  async addTag(id: string, tenantId: string, tag: string): Promise<Lead> {
    const lead = await this.findById(id, tenantId);
    const tags = lead.tags || [];
    if (!tags.includes(tag)) tags.push(tag);
    await this.leadRepo.update(id, { tags });
    return this.findById(id, tenantId);
  }

  async removeTag(id: string, tenantId: string, tag: string): Promise<Lead> {
    const lead = await this.findById(id, tenantId);
    const tags = (lead.tags || []).filter((t) => t !== tag);
    await this.leadRepo.update(id, { tags });
    return this.findById(id, tenantId);
  }

  async getPipelineStats(tenantId: string): Promise<Record<string, number>> {
    const leads = await this.leadRepo.find({ where: { tenantId } });
    const stats: Record<string, number> = {
      total: leads.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
    };
    for (const lead of leads) {
      stats[lead.status] = (stats[lead.status] || 0) + 1;
    }
    const avgScore = leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length) : 0;
    stats.avgScore = avgScore;
    return stats;
  }

  async exportCsv(tenantId: string): Promise<string> {
    const leads = await this.leadRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    const headers = ['id', 'name', 'email', 'phone', 'company', 'status', 'score', 'source', 'tags', 'notes', 'createdAt'];
    const rows = leads.map((l) => {
      return [
        l.id,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        `"${(l.company || '').replace(/"/g, '""')}"`,
        l.status,
        l.score,
        `"${(l.source || '').replace(/"/g, '""')}"`,
        `"${(l.tags || []).join('; ')}"`,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        l.createdAt?.toISOString() || '',
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }
}
