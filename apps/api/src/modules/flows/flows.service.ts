import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatFlow } from './chat-flow.entity';

@Injectable()
export class FlowsService {
  constructor(
    @InjectRepository(ChatFlow)
    private readonly repo: Repository<ChatFlow>,
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
  ): Promise<{ summary: string; extractedData: Record<string, string> }> {
    const flow = await this.repo.findOne({ where: { id: flowId, tenantId } });
    if (!flow) throw new NotFoundException('Flow not found');

    const summaryParts: string[] = [];
    const extractedData: Record<string, string> = {};

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

    return {
      summary: summaryParts.join('\n'),
      extractedData,
    };
  }
}
