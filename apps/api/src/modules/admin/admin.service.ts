import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from '../auth/user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Subscription, PlanType, SubscriptionStatus } from '../billing/subscription.entity';
import { Conversation } from '../chat/conversation.entity';
import { Agent } from '../agents/agent.entity';
import { Lead } from '../leads/lead.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  // ─── Platform Stats ───
  async getPlatformStats() {
    const [tenants, users, agents, conversations, leads, subs] = await Promise.all([
      this.tenantRepo.count(),
      this.userRepo.count(),
      this.agentRepo.count(),
      this.convRepo.count(),
      this.leadRepo.count(),
      this.subRepo.find(),
    ]);

    const totalConversations = conversations;

    const planDistribution = subs.reduce((acc, s) => {
      acc[s.plan] = (acc[s.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activeSubs = subs.filter((s) => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIALING).length;
    const totalConversationsUsed = subs.reduce((sum, s) => sum + s.conversationsThisMonth, 0);
    const totalOverage = subs.reduce((sum, s) => sum + s.overageConversations, 0);

    // Revenue estimate (monthly)
    const revenueByPlan: Record<string, number> = {};
    for (const s of subs) {
      if (s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIALING) {
        const planLimits = this.getPlanPrice(s.plan);
        revenueByPlan[s.plan] = (revenueByPlan[s.plan] || 0) + planLimits;
      }
    }
    const estimatedMrr = Object.values(revenueByPlan).reduce((a, b) => a + b, 0);

    // New tenants in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newTenants = await this.tenantRepo
      .createQueryBuilder('tenant')
      .where('tenant.createdAt > :date', { date: thirtyDaysAgo })
      .getCount();

    return {
      tenants: { total: tenants, newLast30Days: newTenants },
      users: { total: users },
      agents: { total: agents },
      conversations: { total: totalConversations, usedThisMonth: totalConversationsUsed },
      leads: { total: leads },
      subscriptions: {
        total: subs.length,
        active: activeSubs,
        planDistribution,
        totalOverageConversations: totalOverage,
      },
      revenue: {
        estimatedMrr, // in cents
        byPlan: revenueByPlan,
      },
    };
  }

  // ─── Tenant Management ───
  async listTenants(page = 1, limit = 20, search?: string) {
    const qb = this.tenantRepo.createQueryBuilder('tenant');

    if (search) {
      qb.where('tenant.name ILIKE :search OR tenant.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('tenant.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tenants, total] = await qb.getManyAndCount();

    // Enrich with subscription info
    const tenantIds = tenants.map((t) => t.id);
    const subs = await this.subRepo.find({ where: { tenantId: In(tenantIds) } });
    const subMap = new Map(subs.map((s) => [s.tenantId, s]));

    const userCounts = await this.userRepo
      .createQueryBuilder('user')
      .select('user.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'count')
      .where('user.tenantId IN (:...ids)', { ids: tenantIds })
      .groupBy('user.tenantId')
      .getRawMany();

    const userCountMap = new Map<string, number>();
    for (const row of userCounts as any[]) {
      userCountMap.set(row.tenantId, parseInt(row.count));
    }

    return {
      data: tenants.map((t) => ({
        ...t,
        subscription: subMap.get(t.id),
        userCount: userCountMap.get(t.id) || 0,
      })),
      total,
      page,
      limit,
    };
  }

  async getTenantDetail(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [users, sub, agents, convCount, leadCount] = await Promise.all([
      this.userRepo.find({ where: { tenantId: id } }),
      this.subRepo.findOne({ where: { tenantId: id } }),
      this.agentRepo.find({ where: { tenantId: id } }),
      this.convRepo.count({ where: { tenantId: id } }),
      this.leadRepo.count({ where: { tenantId: id } }),
    ]);

    return {
      tenant,
      users: users.map((u) => ({ ...u, password: undefined })),
      subscription: sub,
      agents,
      stats: {
        users: users.length,
        agents: agents.length,
        conversations: convCount,
        leads: leadCount,
      },
    };
  }

  async toggleTenantActive(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    tenant.isActive = !tenant.isActive;
    return this.tenantRepo.save(tenant);
  }

  async changeTenantPlan(id: string, plan: PlanType): Promise<Subscription> {
    let sub = await this.subRepo.findOne({ where: { tenantId: id } });
    if (!sub) {
      sub = this.subRepo.create({
        tenantId: id,
        plan,
        status: SubscriptionStatus.ACTIVE,
        conversationsThisMonth: 0,
        overageConversations: 0,
        meteringResetAt: new Date(),
      });
    } else {
      sub.plan = plan;
      if (sub.status === SubscriptionStatus.FREE) {
        sub.status = SubscriptionStatus.ACTIVE;
      }
    }
    return this.subRepo.save(sub);
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Cascade will handle users, agents, conversations etc.
    await this.tenantRepo.delete(id);
  }

  // ─── User Management ───
  async listUsers(page = 1, limit = 20, tenantId?: string) {
    const qb = this.userRepo.createQueryBuilder('user');

    if (tenantId) {
      qb.where('user.tenantId = :tenantId', { tenantId });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u) => ({ ...u, password: undefined })),
      total,
      page,
      limit,
    };
  }

  async toggleUserActive(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async changeUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    return this.userRepo.save(user);
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    tenantId: string;
  }): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      tenantId: data.tenantId,
    });
    return this.userRepo.save(user);
  }

  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }

  // ─── Platform-wide conversation listing ───
  async listConversations(page = 1, limit = 20, tenantId?: string) {
    const qb = this.convRepo.createQueryBuilder('conv')
      .leftJoinAndSelect('conv.agent', 'agent')
      .leftJoinAndSelect('conv.lead', 'lead')
      .orderBy('conv.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (tenantId) {
      qb.where('conv.tenantId = :tenantId', { tenantId });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  private getPlanPrice(plan: PlanType): number {
    const prices: Record<PlanType, number> = {
      [PlanType.FREE]: 0,
      [PlanType.STARTER]: 7900,
      [PlanType.GROWTH]: 24900,
      [PlanType.SCALE]: 69900,
      [PlanType.ENTERPRISE]: 0,
    };
    return prices[plan] || 0;
  }
}
