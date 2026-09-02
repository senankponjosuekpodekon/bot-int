import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';
import { User, UserRole } from '../auth/user.entity';
import { PaginatedResult } from '../../common/pagination.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  async create(tenantId: string, data: Partial<Agent>): Promise<Agent> {
    const agent = this.agentRepo.create({ ...data, tenantId });
    return this.agentRepo.save(agent);
  }

  async findByTenant(tenantId: string, page = 1, limit = 20, user?: { id: string; role: UserRole }): Promise<PaginatedResult<Agent>> {
    const where: any = { tenantId };
    if (user?.role === UserRole.OPERATOR) {
      where.operatorId = user.id;
    }
    const [data, total] = await this.agentRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, tenantId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { id, tenantId } });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async update(id: string, tenantId: string, data: Partial<Agent>): Promise<Agent> {
    await this.agentRepo.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.agentRepo.delete({ id, tenantId });
  }
}
