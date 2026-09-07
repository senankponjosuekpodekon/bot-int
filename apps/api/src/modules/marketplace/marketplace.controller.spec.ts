import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;
  const mockService = {
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    findById: jest.fn().mockResolvedValue({ id: 'tmpl-1' }),
    publishFromAgent: jest.fn().mockResolvedValue({ id: 'tmpl-2' }),
    install: jest.fn().mockResolvedValue({ id: 'agent-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [{ provide: MarketplaceService, useValue: mockService }],
    }).compile();

    controller = module.get<MarketplaceController>(MarketplaceController);
    jest.clearAllMocks();
  });

  it('lists templates', async () => {
    const result = await controller.findAll({ category: 'sales', page: 1, limit: 10 } as any);
    expect(mockService.findAll).toHaveBeenCalledWith({ category: 'sales', page: 1, limit: 10, industry: undefined });
    expect(result.data).toEqual([]);
  });

  it('returns a template', async () => {
    const result = await controller.findOne('tmpl-1');
    expect(mockService.findById).toHaveBeenCalledWith('tmpl-1');
    expect(result.id).toBe('tmpl-1');
  });

  it('publishes a template for admin', async () => {
    const req = { user: { tenantId: 't-1' } } as any;
    const dto = { agentId: 'agent-1', category: 'support' } as any;
    const result = await controller.publish(req, dto);
    expect(mockService.publishFromAgent).toHaveBeenCalledWith('t-1', dto);
    expect(result.id).toBe('tmpl-2');
  });

  it('installs a template for tenant', async () => {
    const req = { user: { tenantId: 't-1' } } as any;
    const result = await controller.install(req, 'tmpl-1', {});
    expect(mockService.install).toHaveBeenCalledWith('tmpl-1', 't-1', undefined);
    expect(result.id).toBe('agent-1');
  });
});
