import { AgentToolsService } from './agent-tools.service';

describe('AgentToolsService', () => {
  const mockProducts: any = {
    findByTenant: jest.fn().mockResolvedValue({ data: [] }),
  };
  const mockPolicy: any = {
    canAutoExecute: jest.fn().mockReturnValue(true),
  };

  let service: AgentToolsService;

  beforeEach(() => {
    const mockLLM: any = { chat: jest.fn() };
    service = new AgentToolsService(mockLLM, mockProducts, mockPolicy);
    jest.clearAllMocks();
  });

  describe('getAvailableTools', () => {
    it('returns all core tools for an agent with no industry', () => {
      const tools = service.getAvailableTools();
      expect(tools.map((t) => t.name)).toContain('get_product_price');
      expect(tools.map((t) => t.name)).toContain('check_availability');
      expect(tools.map((t) => t.name)).toContain('calculator');
    });

    it('exposes get_product_price for ecommerce industry', () => {
      const tools = service.getAvailableTools({ industry: 'ecommerce' });
      expect(tools.map((t) => t.name)).toContain('get_product_price');
      expect(tools.map((t) => t.name)).not.toContain('check_availability');
    });

    it('exposes check_availability for medical industry', () => {
      const tools = service.getAvailableTools({ industry: 'medical' });
      expect(tools.map((t) => t.name)).toContain('check_availability');
      expect(tools.map((t) => t.name)).not.toContain('get_product_price');
    });

    it('is case-insensitive when matching industry', () => {
      const tools = service.getAvailableTools({ industry: 'Ecommerce' });
      expect(tools.map((t) => t.name)).toContain('get_product_price');
    });
  });

  describe('getToolsDescription', () => {
    it('does not mention third-party brand names in tool descriptions', () => {
      const desc = service.getToolsDescription();
      expect(desc).not.toMatch(/DuckDuckGo/i);
    });
  });

  describe('detectAndExecuteTools', () => {
    it('injects server-side tenantId and businessId into tool args', async () => {
      (service as any).llmService.chat = jest.fn().mockResolvedValue(
        JSON.stringify({
          calls: [{ tool: 'get_product_price', args: { product: 'foo', businessId: 'llm-business' } }],
        }),
      );

      await service.detectAndExecuteTools(
        'prix du foo',
        'tenant-123',
        ['get_product_price'],
        'business-abc',
        { id: 'agent-1', industry: 'ecommerce' },
      );

      expect(mockProducts.findByTenant).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({ search: 'foo', businessId: 'business-abc' }),
      );
    });

    it('does not expose forbidden tools for a medical agent', async () => {
      (service as any).llmService.chat = jest.fn();

      await service.detectAndExecuteTools(
        'prix du foo',
        'tenant-123',
        ['get_product_price'],
        'business-abc',
        { id: 'agent-2', industry: 'medical' },
      );

      expect(mockProducts.findByTenant).not.toHaveBeenCalled();
    });
  });
});
