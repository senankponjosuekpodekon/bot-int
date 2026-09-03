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
    businessId?: string;
    toolName: string;
    args: Record<string, string>;
    riskLevel: ToolRiskLevel;
    reason?: string;
  }): Promise<PendingAction> {
    const action = this.repo.create({ ...data, status: PendingActionStatus.PENDING });
    return this.repo.save(action);
  }

  async findById(id: string, tenantId: string, businessId?: string): Promise<PendingAction> {
    const where: any = { id, tenantId };
    if (businessId) where.businessId = businessId;
    const action = await this.repo.findOne({ where });
    if (!action) throw new NotFoundException('Pending action not found');
    return action;
  }

  async findByTenant(tenantId: string, status?: PendingActionStatus, businessId?: string): Promise<PendingAction[]> {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (businessId) where.businessId = businessId;
    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async approve(id: string, tenantId: string, resolvedBy: string, businessId?: string): Promise<PendingAction> {
    const where: any = { id, tenantId };
    if (businessId) where.businessId = businessId;
    const action = await this.repo.findOne({ where });
    if (!action) throw new NotFoundException('Pending action not found');
    if (action.status !== PendingActionStatus.PENDING) {
      throw new BadRequestException('This action has already been resolved');
    }
    action.status = PendingActionStatus.APPROVED;
    action.resolvedBy = resolvedBy;
    action.resolvedAt = new Date();
    return this.repo.save(action);
  }

  async reject(id: string, tenantId: string, resolvedBy: string, businessId?: string): Promise<PendingAction> {
    const where: any = { id, tenantId };
    if (businessId) where.businessId = businessId;
    const action = await this.repo.findOne({ where });
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
