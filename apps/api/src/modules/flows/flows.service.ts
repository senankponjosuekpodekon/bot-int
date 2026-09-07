import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatFlow } from './chat-flow.entity';
import { FlowExecution, FlowExecutionStatus, FlowExecutionTrigger } from './flow-execution.entity';
import { FlowActionExecutor, FlowActionResult } from './flow-action-executor';

@Injectable()
export class FlowsService {
  constructor(
    @InjectRepository(ChatFlow)
    private readonly repo: Repository<ChatFlow>,
    @InjectRepository(FlowExecution)
    private readonly executionRepo: Repository<FlowExecution>,
    private readonly actionExecutor: FlowActionExecutor,
  ) {}

  async findByAgent(tenantId: string, agentId: string): Promise<ChatFlow[]> {
    return this.repo.find({ where: { tenantId, agentId, isActive: true } });
  }

  async findAll(tenantId: string): Promise<ChatFlow[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async findById(id: string, tenantId: string): Promise<ChatFlow> {
    const flow = await this.repo.findOne({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  async create(tenantId: string, data: Partial<ChatFlow>): Promise<ChatFlow> {
    const flow = this.repo.create({ ...data, tenantId });
    return this.repo.save(flow);
  }

  async update(id: string, tenantId: string, data: Partial<ChatFlow>): Promise<ChatFlow> {
    await this.repo.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }

  async detectFlowIntent(message: string): Promise<string | null> {
    const lower = message.toLowerCase();
    if (/devis|quote|estimation|prix|tarif|co[uû]te|combien/.test(lower)) return 'quote';
    if (/rendez-vous|rdv|appointment|meeting|consultation/.test(lower)) return 'appointment';
    if (/contact|coordonn[eé]e|t[eé]l[eé]phone|email|joindre/.test(lower)) return 'contact';
    if (/produit|service|catalogue|offre|disponible/.test(lower)) return 'products';
    return null;
  }

  async getFlowForIntent(tenantId: string, agentId: string, intent: string): Promise<ChatFlow | null> {
    const flows = await this.findByAgent(tenantId, agentId);
    return flows.find((f) => f.title.toLowerCase().includes(intent)) || flows[0] || null;
  }

  async processFlowResponse(
    tenantId: string,
    conversationId: string,
    flowId: string,
    responses: Record<string, string>,
    triggeredBy: FlowExecutionTrigger = FlowExecutionTrigger.MANUAL,
  ): Promise<{ summary: string; extractedData: Record<string, string>; actionResults: FlowActionResult[] }> {
    const flow = await this.repo.findOne({ where: { id: flowId, tenantId } });
    if (!flow) throw new NotFoundException('Flow not found');

    const summaryParts: string[] = [];
    const extractedData: Record<string, string> = {};
    let status = FlowExecutionStatus.COMPLETED;
    let errorMessage: string | undefined;
    let actionResults: FlowActionResult[] = [];

    try {
      for (const field of flow.fields) {
        const value = responses[field.id];
        if (value) {
          summaryParts.push(`${field.label}: ${value}`);
          extractedData[field.id] = value;
          if (field.type === 'email') extractedData['email'] = value;
          if (field.type === 'phone') extractedData['phone'] = value;
          if (field.id === 'name' || field.label.toLowerCase().includes('nom')) extractedData['name'] = value;
        }
      }

      const summary = summaryParts.join('\n');
      actionResults = await this.actionExecutor.execute(flow.actions, {
        tenantId,
        agentId: flow.agentId,
        flowId,
        conversationId,
        extractedData,
        summary,
      });
    } catch (err: any) {
      status = FlowExecutionStatus.FAILED;
      errorMessage = err?.message;
      throw err;
    } finally {
      await this.executionRepo.save(
        this.executionRepo.create({
          tenantId,
          flowId,
          agentId: flow.agentId,
          conversationId,
          status,
          triggeredBy,
          input: responses,
          output: { summary: summaryParts.join('\n'), extractedData, actionResults },
          errorMessage,
        }),
      );
    }

    return {
      summary: summaryParts.join('\n'),
      extractedData,
      actionResults,
    };
  }

  async findExecutions(
    tenantId: string,
    flowId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: FlowExecution[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: any = { tenantId };
    if (flowId) where.flowId = flowId;
    const [data, total] = await this.executionRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
