import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';
import { User } from '../auth/user.entity';
import { Agent } from '../agents/agent.entity';
import { Conversation } from '../chat/conversation.entity';
import { Message } from '../chat/message.entity';
import { Lead } from '../leads/lead.entity';
import { KnowledgeDocument } from '../knowledge/knowledge-document.entity';
import { Product } from '../products/product.entity';
import { Quote } from '../quotes/quote.entity';
import { AgentMemory } from '../agents/agent-memory.entity';
import { AgentWorkflow } from '../agents/agent-workflow.entity';
import { AgentFeedback } from '../chat/agent-feedback.entity';
import { Subscription } from '../billing/subscription.entity';
import { ApiKey } from '../billing/api-key.entity';
import { Integration } from '../integrations/integration.entity';

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(KnowledgeDocument)
    private readonly docRepo: Repository<KnowledgeDocument>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Quote)
    private readonly quoteRepo: Repository<Quote>,
    @InjectRepository(AgentMemory)
    private readonly memoryRepo: Repository<AgentMemory>,
    @InjectRepository(AgentWorkflow)
    private readonly workflowRepo: Repository<AgentWorkflow>,
    @InjectRepository(AgentFeedback)
    private readonly feedbackRepo: Repository<AgentFeedback>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
  ) {}

  async exportTenantData(tenantId: string): Promise<Record<string, any>> {
    const [
      users,
      agents,
      conversations,
      messages,
      leads,
      documents,
      products,
      quotes,
      memories,
      workflows,
      feedback,
      subscriptions,
      apiKeys,
      integrations,
      auditLogs,
    ] = await Promise.all([
      this.userRepo.find({ where: { tenantId }, select: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'] }),
      this.agentRepo.find({ where: { tenantId } }),
      this.convRepo.find({ where: { tenantId } }),
      this.msgRepo.find({ where: { conversation: { tenantId } }, relations: ['conversation'] }),
      this.leadRepo.find({ where: { tenantId } }),
      this.docRepo.find({ where: { tenantId } }),
      this.productRepo.find({ where: { tenantId } }),
      this.quoteRepo.find({ where: { tenantId } }),
      this.memoryRepo.find({ where: { tenantId } }),
      this.workflowRepo.find({ where: { tenantId } }),
      this.feedbackRepo.find({ where: { tenantId } }),
      this.subRepo.find({ where: { tenantId } }),
      this.apiKeyRepo.find({ where: { tenantId }, select: ['id', 'name', 'prefix', 'isActive', 'scopes', 'createdAt'] }),
      this.integrationRepo.find({ where: { tenantId } }),
      this.auditRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 500 }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      tenantId,
      users,
      agents,
      conversations,
      messages,
      leads,
      knowledgeDocuments: documents,
      products,
      quotes,
      agentMemories: memories,
      agentWorkflows: workflows,
      feedback,
      subscriptions,
      apiKeys,
      integrations,
      auditLogs,
    };
  }

  async deleteTenantData(tenantId: string): Promise<{ success: boolean; deletedCounts: Record<string, number> }> {
    const counts: Record<string, number> = {};

    const tables: [string, Repository<any> | { delete: (criteria: any) => Promise<{ affected?: number }> }][] = [
      ['auditLogs', this.auditRepo],
      ['apiKeys', this.apiKeyRepo],
      ['integrations', this.integrationRepo],
      ['subscriptions', this.subRepo],
      ['feedback', this.feedbackRepo],
      ['agentWorkflows', this.workflowRepo],
      ['agentMemories', this.memoryRepo],
      ['quotes', this.quoteRepo],
      ['products', this.productRepo],
      ['knowledgeDocuments', this.docRepo],
      ['leads', this.leadRepo],
      ['messages', {
        delete: async () => {
          const result = await this.msgRepo
            .createQueryBuilder('msg')
            .innerJoin('msg.conversation', 'conv')
            .where('conv.tenantId = :tenantId', { tenantId })
            .delete()
            .execute();
          return { affected: result.affected };
        },
      }],
      ['conversations', this.convRepo],
      ['agents', this.agentRepo],
      ['users', this.userRepo],
    ];

    for (const [name, repo] of tables) {
      if (name === 'messages') {
        const result = await (repo as any).delete({});
        counts[name] = result.affected || 0;
      } else {
        const result = await (repo as Repository<any>).delete({ tenantId });
        counts[name] = result.affected || 0;
      }
    }

    this.logger.log(`Tenant ${tenantId} data deleted: ${JSON.stringify(counts)}`);
    return { success: true, deletedCounts: counts };
  }

  async logAudit(
    tenantId: string,
    action: AuditAction | string,
    resource: string,
    resourceId?: string,
    userId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
  ): Promise<void> {
    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId,
        action,
        resource,
        resourceId,
        userId,
        details,
        ipAddress,
      }),
    );
  }

  async getAuditLog(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.auditRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip,
      take: Math.min(limit, 200),
    });
    return {
      data,
      meta: { page, limit, total, hasMore: skip + data.length < total },
    };
  }
}
