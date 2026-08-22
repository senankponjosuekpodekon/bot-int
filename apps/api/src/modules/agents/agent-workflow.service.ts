import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentWorkflow, WorkflowStatus, WorkflowStepType } from './agent-workflow.entity';
import { LLMService } from '../chat/llm.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentMemoryService } from './agent-memory.service';
import { MemoryScope } from './agent-memory.entity';
import { PaginatedResult } from '../../common/pagination.dto';

export interface WorkflowExecutionContext {
  tenantId: string;
  agentId: string;
  conversationId?: string;
  visitorId?: string;
  leadId?: string;
  userMessage: string;
  variables: Record<string, string>;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  completed: boolean;
  output: string;
  stepsExecuted: string[];
  handoff: boolean;
  notifications: string[];
}

@Injectable()
export class AgentWorkflowService {
  private readonly logger = new Logger(AgentWorkflowService.name);

  constructor(
    @InjectRepository(AgentWorkflow)
    private readonly workflowRepo: Repository<AgentWorkflow>,
    private readonly llmService: LLMService,
    private readonly toolsService: AgentToolsService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  async create(tenantId: string, data: Partial<AgentWorkflow>): Promise<AgentWorkflow> {
    return this.workflowRepo.save(
      this.workflowRepo.create({ ...data, tenantId }),
    );
  }

  async findByTenant(tenantId: string, page = 1, limit = 20): Promise<PaginatedResult<AgentWorkflow>> {
    const [data, total] = await this.workflowRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, tenantId: string): Promise<AgentWorkflow> {
    const workflow = await this.workflowRepo.findOne({ where: { id, tenantId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async update(id: string, tenantId: string, data: Partial<AgentWorkflow>): Promise<AgentWorkflow> {
    await this.workflowRepo.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.workflowRepo.delete({ id, tenantId });
  }

  async findByTrigger(tenantId: string, agentId: string, triggerType: string, value?: string): Promise<AgentWorkflow | null> {
    const qb = this.workflowRepo
      .createQueryBuilder('wf')
      .where('wf.tenantId = :tenantId', { tenantId })
      .andWhere('wf.agentId = :agentId', { agentId })
      .andWhere('wf.status = :status', { status: WorkflowStatus.ACTIVE })
      .andWhere('wf.trigger @> :trigger', { trigger: JSON.stringify({ type: triggerType }) });

    if (value) {
      qb.andWhere('wf.trigger @> :triggerValue', { triggerValue: JSON.stringify({ value }) });
    }

    return qb.getOne();
  }

  async execute(workflowId: string, ctx: WorkflowExecutionContext): Promise<WorkflowExecutionResult> {
    const workflow = await this.findById(workflowId, ctx.tenantId);
    const stepsExecuted: string[] = [];
    const notifications: string[] = [];
    let output = '';
    let handoff = false;
    let currentStep = workflow.steps.find((s) => s.id === workflow.steps[0]?.id);

    const maxIterations = 20;
    let iterations = 0;

    while (currentStep && iterations < maxIterations) {
      iterations++;
      stepsExecuted.push(currentStep.id);

      try {
        switch (currentStep.type) {
          case WorkflowStepType.LLM_CALL: {
            const prompt = this.interpolate(currentStep.config.prompt || '', ctx);
            const response = await this.llmService.chat([
              { role: 'system', content: prompt },
              { role: 'user', content: ctx.userMessage },
            ]);
            output = response;
            ctx.variables[currentStep.name] = response;
            break;
          }

          case WorkflowStepType.TOOL_CALL: {
            const toolResults = await this.toolsService.detectAndExecuteTools(
              ctx.userMessage,
              ctx.tenantId,
              currentStep.config.toolName ? [currentStep.config.toolName] : undefined,
            );
            if (toolResults.length > 0) {
              const combined = toolResults.map((r) => r.result).join('\n');
              ctx.variables[currentStep.name] = combined;
              output = combined;
            }
            break;
          }

          case WorkflowStepType.CONDITION: {
            const condition = currentStep.config.condition || '';
            const evaluated = this.evaluateCondition(condition, ctx);
            currentStep = evaluated
              ? workflow.steps.find((s) => s.id === currentStep!.nextStepId)
              : workflow.steps.find((s) => s.id === currentStep!.config.targetStepId);
            continue;
          }

          case WorkflowStepType.HANDOFF: {
            handoff = true;
            output = currentStep.config.message || 'Transferring to human agent';
            break;
          }

          case WorkflowStepType.NOTIFY: {
            notifications.push(currentStep.config.message || 'Notification sent');
            break;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Workflow step ${currentStep.id} failed: ${err?.message}`);
      }

      if (handoff) break;
      currentStep = currentStep.nextStepId
        ? workflow.steps.find((s) => s.id === currentStep!.nextStepId)
        : undefined;
    }

    if (ctx.visitorId) {
      try {
        await this.memoryService.remember(
          ctx.tenantId,
          MemoryScope.VISITOR,
          ctx.visitorId,
          `workflow_${workflow.id}`,
          output.slice(0, 500),
          ctx.agentId,
        );
      } catch {
        // Memory storage is optional
      }
    }

    return {
      workflowId: workflow.id,
      completed: !handoff,
      output,
      stepsExecuted,
      handoff,
      notifications,
    };
  }

  private interpolate(text: string, ctx: WorkflowExecutionContext): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx.variables[key] || '');
  }

  private evaluateCondition(condition: string, ctx: WorkflowExecutionContext): boolean {
    const interpolated = this.interpolate(condition, ctx).toLowerCase();
    if (interpolated.includes('intent_score') && ctx.variables.intentScore) {
      const score = parseInt(ctx.variables.intentScore, 10);
      const match = interpolated.match(/intent_score\s*>\s*(\d+)/);
      if (match) return score > parseInt(match[1], 10);
    }
    if (interpolated.includes('contains:')) {
      const term = interpolated.split('contains:')[1].trim();
      return ctx.userMessage.toLowerCase().includes(term);
    }
    return interpolated === 'true';
  }
}
