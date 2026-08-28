import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendingAction, PendingActionStatus } from './pending-action.entity';
import { ToolRiskLevel } from './agent-tools.service';

@Injectable()
export class PendingActionService {
  constructor(
    @InjectRepository(PendingAction)
    private readonly repo: Repository<PendingAction>,
  ) {}

  async create(data: {
    tenantId: string;
    conversationId?: string;
    agentId?: string;
    toolName: string;
    args: Record<string, string>;
    riskLevel: ToolRiskLevel;
    reason?: string;
  }): Promise<PendingAction> {
    const action = this.repo.create({ ...data, status: PendingActionStatus.PENDING });
    return this.repo.save(action);
  }

  async findByTenant(tenantId: string, status?: PendingActionStatus): Promise<PendingAction[]> {
    return this.repo.find({
      where: status ? { tenantId, status } : { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async approve(id: string, tenantId: string, resolvedBy: string): Promise<PendingAction> {
    const action = await this.repo.findOne({ where: { id, tenantId } });
    if (!action) throw new NotFoundException('Pending action not found');
    if (action.status !== PendingActionStatus.PENDING) {
      throw new BadRequestException('This action has already been resolved');
    }
    action.status = PendingActionStatus.APPROVED;
    action.resolvedBy = resolvedBy;
    action.resolvedAt = new Date();
    return this.repo.save(action);
  }

  async reject(id: string, tenantId: string, resolvedBy: string): Promise<PendingAction> {
    const action = await this.repo.findOne({ where: { id, tenantId } });
    if (!action) throw new NotFoundException('Pending action not found');
    if (action.status !== PendingActionStatus.PENDING) {
      throw new BadRequestException('This action has already been resolved');
    }
    action.status = PendingActionStatus.REJECTED;
    action.resolvedBy = resolvedBy;
    action.resolvedAt = new Date();
    return this.repo.save(action);
  }
}
