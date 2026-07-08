import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';

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

  async findByTenant(tenantId: string): Promise<Agent[]> {
    return this.agentRepo.find({ where: { tenantId } });
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
