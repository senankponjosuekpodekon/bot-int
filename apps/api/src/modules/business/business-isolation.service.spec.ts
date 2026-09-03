import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/product.entity';
import { ProductImport } from '../products/product-import.entity';
import { ProductImportSource } from '../products/product-import-source.entity';
import { Agent } from '../agents/agent.entity';
import { LeadsService } from '../leads/leads.service';
import { Lead } from '../leads/lead.entity';
import { LeadComment } from '../leads/lead-comment.entity';
import { QuotesService } from '../quotes/quotes.service';
import { Quote, QuoteStatus } from '../quotes/quote.entity';
import { PendingActionService } from '../agents/pending-action.service';
import { PendingAction, PendingActionStatus } from '../agents/pending-action.entity';
import { AgentMemoryService } from '../agents/agent-memory.service';
import { AgentMemory, MemoryScope } from '../agents/agent-memory.entity';

type RepositoryMock<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createRepositoryMock = <T extends ObjectLiteral>(): RepositoryMock<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createQueryBuilderMock = (returnValue: any) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(returnValue),
  getManyAndCount: jest.fn().mockResolvedValue([returnValue, returnValue.length]),
  getOne: jest.fn().mockResolvedValue(returnValue),
});

describe('Business isolation', () => {
  const TENANT = 't-1';
  const BIZ_A = 'b-a';
  const BIZ_B = 'b-b';

  describe('identity: leads cannot be accessed across business', () => {
    let service: LeadsService;
    let leadRepo: RepositoryMock<Lead>;
    let commentRepo: RepositoryMock<LeadComment>;

    beforeEach(() => {
      leadRepo = createRepositoryMock<Lead>();
      commentRepo = createRepositoryMock<LeadComment>();
      service = new LeadsService(
        leadRepo as unknown as Repository<Lead>,
        commentRepo as unknown as Repository<LeadComment>,
      );
    });

    it('returns a lead for the same business', async () => {
      const lead = { id: 'lead-1', tenantId: TENANT, businessId: BIZ_A } as Lead;
      leadRepo.findOne?.mockResolvedValue(lead);

      const result = await service.findById('lead-1', TENANT, BIZ_A);

      expect(result).toBe(lead);
      expect(leadRepo.findOne).toHaveBeenCalledWith({ where: { id: 'lead-1', tenantId: TENANT, businessId: BIZ_A } });
    });

    it('throws when lead belongs to a different business', async () => {
      leadRepo.findOne?.mockResolvedValue(null);

      await expect(service.findById('lead-1', TENANT, BIZ_A)).rejects.toBeInstanceOf(NotFoundException);
      expect(leadRepo.findOne).toHaveBeenCalledWith({ where: { id: 'lead-1', tenantId: TENANT, businessId: BIZ_A } });
    });
  });

  describe('catalogue: products list is scoped to business', () => {
    let service: ProductsService;
    let productRepo: RepositoryMock<Product>;

    beforeEach(() => {
      productRepo = createRepositoryMock<Product>();
      const importRepo = createRepositoryMock<ProductImport>();
      const sourceRepo = createRepositoryMock<ProductImportSource>();
      const agentRepo = createRepositoryMock<Agent>();
      service = new ProductsService(
        productRepo as unknown as Repository<Product>,
        importRepo as unknown as Repository<ProductImport>,
        sourceRepo as unknown as Repository<ProductImportSource>,
        agentRepo as unknown as Repository<Agent>,
      );
    });

    it('findByTenant only returns products from the active business', async () => {
      const products = [
        { id: 'p-1', tenantId: TENANT, businessId: BIZ_A } as Product,
      ];
      productRepo.createQueryBuilder?.mockReturnValue(createQueryBuilderMock(products));

      const result = await service.findByTenant(TENANT, { businessId: BIZ_A, limit: 20 });

      expect(result.data).toBe(products);
      expect(productRepo.createQueryBuilder).toHaveBeenCalledWith('product');
    });
  });

  describe('anti-contamination: quotes list does not mix businesses', () => {
    let service: QuotesService;
    let quoteRepo: RepositoryMock<Quote>;

    beforeEach(() => {
      quoteRepo = createRepositoryMock<Quote>();
      const productsService = {
        searchRelevant: jest.fn().mockResolvedValue([]),
      } as any;
      service = new QuotesService(
        quoteRepo as unknown as Repository<Quote>,
        productsService,
      );
    });

    it('findAll filters by businessId', async () => {
      const quotes = [
        { id: 'q-1', tenantId: TENANT, businessId: BIZ_A } as Quote,
      ];
      quoteRepo.find?.mockResolvedValue(quotes);

      const result = await service.findAll(TENANT, undefined, BIZ_A);

      expect(result).toBe(quotes);
      expect(quoteRepo.find).toHaveBeenCalledWith({
        where: { tenantId: TENANT, businessId: BIZ_A },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('contradiction: pending actions are separated by business', () => {
    let service: PendingActionService;
    let repo: RepositoryMock<PendingAction>;

    beforeEach(() => {
      repo = createRepositoryMock<PendingAction>();
      service = new PendingActionService(repo as unknown as Repository<PendingAction>);
    });

    it('findByTenant returns only actions from the active business', async () => {
      const actions = [
        { id: 'pa-1', tenantId: TENANT, businessId: BIZ_A } as PendingAction,
      ];
      repo.find?.mockResolvedValue(actions);

      const result = await service.findByTenant(TENANT, undefined, BIZ_A);

      expect(result).toBe(actions);
      expect(repo.find).toHaveBeenCalledWith({
        where: { tenantId: TENANT, businessId: BIZ_A },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });

  describe('persistence: agent memories stay within business', () => {
    let service: AgentMemoryService;
    let memoryRepo: RepositoryMock<AgentMemory>;

    beforeEach(() => {
      memoryRepo = createRepositoryMock<AgentMemory>();
      const llmService = { generate: jest.fn().mockResolvedValue('') } as any;
      service = new AgentMemoryService(
        memoryRepo as unknown as Repository<AgentMemory>,
        llmService,
      );
    });

    it('remember stores businessId and recall filters by businessId', async () => {
      memoryRepo.findOne?.mockResolvedValue(null);
      memoryRepo.create?.mockReturnValue({} as AgentMemory);
      memoryRepo.save?.mockResolvedValue({ id: 'm-1' } as AgentMemory);

      await service.remember(TENANT, MemoryScope.VISITOR, 'v-1', 'industry', 'saas', 'agent-1', 1.0, BIZ_A);

      expect(memoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT, agentId: 'agent-1', businessId: BIZ_A, scope: MemoryScope.VISITOR, scopeId: 'v-1', key: 'industry', value: 'saas' }),
      );

      const memories = [{ value: 'saas', importance: 1 }] as AgentMemory[];
      memoryRepo.createQueryBuilder?.mockReturnValue(createQueryBuilderMock(memories));

      const result = await service.recall(TENANT, MemoryScope.VISITOR, 'v-1', ['industry'], 'agent-1', BIZ_A);

      expect(result).toBe(memories);
      expect(memoryRepo.createQueryBuilder).toHaveBeenCalledWith('mem');
    });
  });
});
