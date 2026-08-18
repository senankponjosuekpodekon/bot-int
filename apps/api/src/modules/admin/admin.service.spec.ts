import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { User, UserRole } from '../auth/user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Subscription } from '../billing/subscription.entity';
import { Conversation } from '../chat/conversation.entity';
import { Agent } from '../agents/agent.entity';
import { Lead } from '../leads/lead.entity';

describe('AdminService', () => {
  let service: AdminService;

  const mockUserRepo = { count: jest.fn(), findOne: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
  const mockTenantRepo = { count: jest.fn(), findOne: jest.fn(), delete: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
  const mockSubRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
  const mockConvRepo = { count: jest.fn(), createQueryBuilder: jest.fn() };
  const mockAgentRepo = { count: jest.fn(), find: jest.fn() };
  const mockLeadRepo = { count: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepo },
        { provide: getRepositoryToken(Subscription), useValue: mockSubRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
        { provide: getRepositoryToken(Agent), useValue: mockAgentRepo },
        { provide: getRepositoryToken(Lead), useValue: mockLeadRepo },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPlatformStats', () => {
    it('should return aggregated stats', async () => {
      mockTenantRepo.count.mockResolvedValue(5);
      mockUserRepo.count.mockResolvedValue(12);
      mockAgentRepo.count.mockResolvedValue(8);
      mockConvRepo.count.mockResolvedValue(150);
      mockLeadRepo.count.mockResolvedValue(45);
      mockSubRepo.find.mockResolvedValue([
        { plan: 'growth', status: 'active', conversationsThisMonth: 100, overageConversations: 5 },
        { plan: 'free', status: 'free', conversationsThisMonth: 10, overageConversations: 0 },
      ]);
      mockTenantRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      });

      const result = await service.getPlatformStats();
      expect(result.tenants.total).toBe(5);
      expect(result.users.total).toBe(12);
      expect(result.conversations.total).toBe(150);
      expect(result.subscriptions.active).toBe(1);
      expect(result.subscriptions.planDistribution).toEqual({ growth: 1, free: 1 });
    });
  });

  describe('toggleTenantActive', () => {
    it('should toggle active status', async () => {
      const tenant = { id: 't1', isActive: true } as any;
      mockTenantRepo.findOne.mockResolvedValue(tenant);
      mockTenantRepo.save.mockResolvedValue({ ...tenant, isActive: false });

      const result = await service.toggleTenantActive('t1');
      expect(result.isActive).toBe(false);
    });
  });

  describe('changeUserRole', () => {
    it('should change user role', async () => {
      const user = { id: 'u1', role: UserRole.MANAGER } as any;
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue({ ...user, role: UserRole.ADMIN });

      const result = await service.changeUserRole('u1', UserRole.ADMIN);
      expect(result.role).toBe(UserRole.ADMIN);
    });
  });
});
