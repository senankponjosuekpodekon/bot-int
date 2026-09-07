import { NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceTemplate } from './marketplace-template.entity';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let mockTemplateRepo: any;
  let mockAgentsService: any;
  let mockBusinessService: any;

  beforeEach(() => {
    mockTemplateRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'tmpl-1' })),
    };

    mockAgentsService = {
      findById: jest.fn(),
      create: jest.fn(),
    };

    mockBusinessService = {
      findById: jest.fn(),
      getDefaultForTenant: jest.fn(),
    };

    service = new MarketplaceService(mockTemplateRepo, mockAgentsService, mockBusinessService);
  });

  describe('findAll', () => {
    it('returns paginated public templates', async () => {
      const templates = [{ id: 'tmpl-1', name: 'Sales Bot' }] as MarketplaceTemplate[];
      mockTemplateRepo.findAndCount.mockResolvedValue([templates, 1]);

      const result = await service.findAll({ category: 'sales' });

      expect(result.data).toBe(templates);
      expect(result.total).toBe(1);
      expect(mockTemplateRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true, category: 'sales' },
          take: 20,
          skip: 0,
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns a public template', async () => {
      const template = { id: 'tmpl-1', name: 'Support Bot', isPublic: true } as MarketplaceTemplate;
      mockTemplateRepo.findOne.mockResolvedValue(template);

      const result = await service.findById('tmpl-1');

      expect(result).toBe(template);
      expect(mockTemplateRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tmpl-1', isPublic: true } });
    });

    it('throws NotFoundException for unknown template', async () => {
      await expect(service.findById('tmpl-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publishFromAgent', () => {
    it('creates a template from an existing agent', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Agent A',
        industry: 'retail',
        type: 'sales',
        systemPrompt: 'you are helpful',
        personality: 'friendly',
        personalityConfig: { tone: 'friendly' },
        iceBreakers: ['hi'],
      };
      mockAgentsService.findById.mockResolvedValue(agent);

      const result = await service.publishFromAgent('t-1', {
        agentId: 'agent-1',
        name: 'Public Template',
        category: 'sales',
      });

      expect(result.name).toBe('Public Template');
      expect(result.sourceAgentId).toBe('agent-1');
      expect(result.systemPrompt).toBe('you are helpful');
      expect(mockTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Public Template',
          category: 'sales',
          industry: 'retail',
          agentType: 'sales',
          isPublic: true,
        }),
      );
      expect(mockTemplateRepo.save).toHaveBeenCalled();
    });
  });

  describe('install', () => {
    it('installs a template into the tenant default business', async () => {
      const template = {
        id: 'tmpl-1',
        name: 'Sales Bot',
        agentType: 'sales',
        industry: 'retail',
        systemPrompt: 'prompt',
        personality: 'nice',
        personalityConfig: {},
        iceBreakers: [],
      } as MarketplaceTemplate;
      mockTemplateRepo.findOne.mockResolvedValue(template);
      mockBusinessService.getDefaultForTenant.mockResolvedValue({ id: 'biz-1' });
      mockAgentsService.create.mockResolvedValue({ id: 'agent-2' });

      const result = await service.install('tmpl-1', 't-1');

      expect(result.id).toBe('agent-2');
      expect(mockAgentsService.create).toHaveBeenCalledWith(
        't-1',
        expect.objectContaining({
          name: 'Sales Bot',
          businessId: 'biz-1',
          type: 'sales',
          isActive: true,
        }),
      );
    });

    it('throws when business is not in tenant', async () => {
      const template = { id: 'tmpl-1', isPublic: true } as MarketplaceTemplate;
      mockTemplateRepo.findOne.mockResolvedValue(template);
      mockBusinessService.findById.mockResolvedValue(null);

      await expect(service.install('tmpl-1', 't-1', 'biz-x')).rejects.toThrow(NotFoundException);
    });
  });
});
