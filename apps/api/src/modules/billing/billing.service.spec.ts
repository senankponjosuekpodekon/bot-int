import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BillingService } from './billing.service';
import { Subscription, PlanType, SubscriptionStatus } from './subscription.entity';
import { Conversation } from '../chat/conversation.entity';

describe('BillingService', () => {
  let service: BillingService;
  let subRepo: jest.Mocked<Repository<Subscription>>;
  let convRepo: jest.Mocked<Repository<Conversation>>;

  const mockSubRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConvRepo = {
    count: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, fallback?: any) => fallback),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(Subscription), useValue: mockSubRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
        { provide: ConfigService, useValue: mockConfig },
        { provide: 'PAYMENT_SDK', useValue: null },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    subRepo = module.get(getRepositoryToken(Subscription));
    convRepo = module.get(getRepositoryToken(Conversation));
  });

  afterEach(() => jest.clearAllMocks());

  describe('getSubscription', () => {
    it('should return existing subscription', async () => {
      const sub = { tenantId: 't1', plan: PlanType.GROWTH } as Subscription;
      mockSubRepo.findOne.mockResolvedValue(sub as any);

      const result = await service.getSubscription('t1');
      expect(result).toEqual(sub);
      expect(mockSubRepo.findOne).toHaveBeenCalledWith({ where: { tenantId: 't1' } });
    });

    it('should create free subscription if none exists', async () => {
      const created = { tenantId: 't1', plan: PlanType.FREE, status: SubscriptionStatus.FREE };
      mockSubRepo.findOne.mockResolvedValue(null); // getSubscription + createFree both call findOne
      mockSubRepo.create.mockReturnValue(created as any);
      mockSubRepo.save.mockResolvedValue(created as any);

      const result = await service.getSubscription('t1');
      expect(result.plan).toBe(PlanType.FREE);
    });
  });

  describe('checkQuota', () => {
    it('should allow when within limit', async () => {
      const sub = {
        tenantId: 't1',
        plan: PlanType.GROWTH,
        status: SubscriptionStatus.ACTIVE,
        conversationsThisMonth: 100,
        trialEndsAt: null,
      } as any;
      mockSubRepo.findOne.mockResolvedValue(sub);
      mockSubRepo.save.mockResolvedValue(sub);

      const result = await service.checkQuota('t1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4900);
    });

    it('should block free plan at limit', async () => {
      const sub = {
        tenantId: 't1',
        plan: PlanType.FREE,
        status: SubscriptionStatus.FREE,
        conversationsThisMonth: 50,
        trialEndsAt: null,
      } as any;
      mockSubRepo.findOne.mockResolvedValue(sub);

      const result = await service.checkQuota('t1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should allow overage for paid plans', async () => {
      const sub = {
        tenantId: 't1',
        plan: PlanType.GROWTH,
        status: SubscriptionStatus.ACTIVE,
        conversationsThisMonth: 5000,
        trialEndsAt: null,
      } as any;
      mockSubRepo.findOne.mockResolvedValue(sub);

      const result = await service.checkQuota('t1');
      expect(result.allowed).toBe(true);
      expect(result.overage).toBe(true);
    });

    it('should block canceled subscription', async () => {
      const sub = {
        tenantId: 't1',
        plan: PlanType.GROWTH,
        status: SubscriptionStatus.CANCELED,
        conversationsThisMonth: 0,
        trialEndsAt: null,
      } as any;
      mockSubRepo.findOne.mockResolvedValue(sub);

      const result = await service.checkQuota('t1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('handleStripeWebhook', () => {
    it('should activate subscription on invoice.payment_succeeded', async () => {
      const sub = {
        id: 'sub-1',
        stripeSubscriptionId: 'sub_stripe_1',
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: null,
      } as any;
      mockSubRepo.findOne.mockResolvedValue(sub);
      mockSubRepo.save.mockResolvedValue(sub);

      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_stripe_1',
            period_end: 1893456000,
          },
        },
      };

      await service.handleStripeWebhook(event);
      expect(mockSubRepo.findOne).toHaveBeenCalledWith({ where: { stripeSubscriptionId: 'sub_stripe_1' } });
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(sub.currentPeriodEnd).toEqual(new Date(1893456000 * 1000));
      expect(mockSubRepo.save).toHaveBeenCalledWith(sub);
    });
  });

  describe('incrementUsage', () => {
    it('should increment and track overage', async () => {
      const sub = {
        tenantId: 't1',
        plan: PlanType.STARTER,
        conversationsThisMonth: 1000,
        overageConversations: 0,
        meteringResetAt: new Date(),
      } as any;
      mockSubRepo.findOne.mockResolvedValue(sub);
      mockSubRepo.save.mockResolvedValue(sub);

      await service.incrementUsage('t1');
      expect(sub.conversationsThisMonth).toBe(1001);
      expect(sub.overageConversations).toBe(1);
    });

    it('should reset monthly counter on new month', async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 1);

      const sub = {
        tenantId: 't1',
        plan: PlanType.GROWTH,
        conversationsThisMonth: 5000,
        overageConversations: 100,
        meteringResetAt: oldDate,
      } as any;
      mockSubRepo.findOne.mockResolvedValue(sub);
      mockSubRepo.save.mockResolvedValue(sub);

      await service.incrementUsage('t1');
      expect(sub.conversationsThisMonth).toBe(1);
      expect(sub.overageConversations).toBe(0);
    });
  });
});
