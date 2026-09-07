import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceTemplate } from './marketplace-template.entity';
import { AgentsService } from '../agents/agents.service';
import { BusinessService } from '../business/business.service';
import { Agent } from '../agents/agent.entity';

export interface FindTemplatesQuery {
  category?: string;
  industry?: string;
  page?: number;
  limit?: number;
}

export interface PublishTemplateDto {
  agentId: string;
  name?: string;
  description?: string;
  category?: string;
  industry?: string;
  isPublic?: boolean;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceTemplate)
    private readonly templateRepo: Repository<MarketplaceTemplate>,
    private readonly agentsService: AgentsService,
    private readonly businessService: BusinessService,
  ) {}

  async findAll(query: FindTemplatesQuery): Promise<{ data: MarketplaceTemplate[]; total: number; page: number; limit: number; totalPages: number }> {
    const { category, industry, page = 1, limit = 20 } = query;
    const where: any = { isPublic: true };
    if (category) where.category = category;
    if (industry) where.industry = industry;

    const [data, total] = await this.templateRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<MarketplaceTemplate> {
    const template = await this.templateRepo.findOne({ where: { id, isPublic: true } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async publishFromAgent(tenantId: string, dto: PublishTemplateDto): Promise<MarketplaceTemplate> {
    const agent = await this.agentsService.findById(dto.agentId, tenantId);

    const template = this.templateRepo.create({
      name: dto.name || agent.name,
      description: dto.description,
      category: dto.category,
      industry: dto.industry || agent.industry,
      agentType: agent.type,
      isPublic: dto.isPublic ?? true,
      sourceAgentId: agent.id,
      systemPrompt: agent.systemPrompt,
      personality: agent.personality,
      personalityConfig: agent.personalityConfig,
      iceBreakers: agent.iceBreakers,
    });

    return this.templateRepo.save(template);
  }

  async install(templateId: string, tenantId: string, businessId?: string): Promise<Agent> {
    const template = await this.findById(templateId);

    let targetBusinessId: string | undefined;
    if (businessId) {
      const business = await this.businessService.findById(businessId, tenantId);
      if (!business) throw new NotFoundException('Business not found');
      targetBusinessId = business.id;
    } else {
      const defaultBusiness = await this.businessService.getDefaultForTenant(tenantId);
      targetBusinessId = defaultBusiness.id;
    }

    return this.agentsService.create(tenantId, {
      name: template.name,
      businessId: targetBusinessId,
      type: template.agentType,
      industry: template.industry,
      personality: template.personality,
      systemPrompt: template.systemPrompt,
      personalityConfig: template.personalityConfig,
      iceBreakers: template.iceBreakers,
      isActive: true,
    });
  }
}
