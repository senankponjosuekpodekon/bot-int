import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionStatus, PlanType, PLAN_LIMITS } from './subscription.entity';
import { Conversation } from '../chat/conversation.entity';
import axios from 'axios';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    private readonly config: ConfigService,
  ) {}

  async getSubscription(tenantId: string): Promise<Subscription> {
    let sub = await this.subRepo.findOne({ where: { tenantId } });
    if (!sub) {
      sub = await this.createFree(tenantId);
    }
    return sub;
  }

  async createFree(tenantId: string): Promise<Subscription> {
    const existing = await this.subRepo.findOne({ where: { tenantId } });
    if (existing) return existing;

    const sub = this.subRepo.create({
      tenantId,
      plan: PlanType.FREE,
      status: SubscriptionStatus.FREE,
      conversationsThisMonth: 0,
      overageConversations: 0,
      meteringResetAt: new Date(),
    });
    return this.subRepo.save(sub);
  }

  async createTrial(tenantId: string, plan: PlanType = PlanType.GROWTH): Promise<Subscription> {
    const existing = await this.subRepo.findOne({ where: { tenantId } });
    if (existing && existing.status !== SubscriptionStatus.FREE) return existing;

    const limits = PLAN_LIMITS[plan];
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + limits.trialDays);

    if (existing) {
      existing.plan = plan;
      existing.status = SubscriptionStatus.TRIALING;
      existing.trialEndsAt = trialEnds;
      return this.subRepo.save(existing);
    }

    const sub = this.subRepo.create({
      tenantId,
      plan,
      status: SubscriptionStatus.TRIALING,
      trialEndsAt: trialEnds,
      conversationsThisMonth: 0,
      overageConversations: 0,
      meteringResetAt: new Date(),
    });
    return this.subRepo.save(sub);
  }

  async changePlan(tenantId: string, plan: PlanType): Promise<Subscription> {
    const sub = await this.getSubscription(tenantId);
    sub.plan = plan;
    return this.subRepo.save(sub);
  }

  async cancel(tenantId: string): Promise<Subscription> {
    const sub = await this.getSubscription(tenantId);
    sub.status = SubscriptionStatus.CANCELED;
    sub.canceledAt = new Date();

    if (sub.stripeSubscriptionId) {
      try {
        const secretKey = this.config.get('STRIPE_SECRET_KEY');
        if (secretKey) {
          await axios.delete(
            `https://api.stripe.com/v1/subscriptions/${sub.stripeSubscriptionId}`,
            { headers: { Authorization: `Bearer ${secretKey}` } },
          );
        }
      } catch (err: any) {
        this.logger.error(`Stripe cancel failed: ${err?.message}`);
      }
    }

    return this.subRepo.save(sub);
  }

  async createCheckoutSession(tenantId: string, plan: PlanType): Promise<{ url: string }> {
    const sub = await this.getSubscription(tenantId);
    const secretKey = this.config.get('STRIPE_SECRET_KEY');
    if (!secretKey) throw new BadRequestException('Stripe not configured');

    const priceMap: Record<PlanType, string> = {
      [PlanType.FREE]: '',
      [PlanType.STARTER]: this.config.get('STRIPE_PRICE_STARTER', ''),
      [PlanType.GROWTH]: this.config.get('STRIPE_PRICE_GROWTH', ''),
      [PlanType.SCALE]: this.config.get('STRIPE_PRICE_SCALE', ''),
      [PlanType.ENTERPRISE]: this.config.get('STRIPE_PRICE_ENTERPRISE', ''),
    };

    if (plan === PlanType.FREE) throw new BadRequestException('Free plan does not require checkout');
    if (plan === PlanType.ENTERPRISE) throw new BadRequestException('Contact sales for Enterprise plan');

    const priceId = priceMap[plan];
    if (!priceId) throw new BadRequestException(`No Stripe price configured for plan ${plan}`);

    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customerRes = await axios.post(
        'https://api.stripe.com/v1/customers',
        new URLSearchParams({ email: tenantId, name: tenantId }),
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );
      customerId = customerRes.data.id;
      sub.stripeCustomerId = customerId;
      await this.subRepo.save(sub);
    }

    const sessionRes = await axios.post(
      'https://api.stripe.com/v1/checkout/sessions',
      new URLSearchParams({
        customer: customerId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        mode: 'subscription',
        success_url: `${this.config.get('APP_URL', 'http://localhost:3000')}/dashboard/billing?success=1`,
        cancel_url: `${this.config.get('APP_URL', 'http://localhost:3000')}/dashboard/billing?canceled=1`,
      }),
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    return { url: sessionRes.data.url };
  }

  async handleStripeWebhook(event: any): Promise<void> {
    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.customer_email || session.metadata?.tenantId;
        if (!tenantId) return;
        const sub = await this.subRepo.findOne({ where: { tenantId } });
        if (sub) {
          sub.stripeSubscriptionId = session.subscription;
          sub.stripeCustomerId = session.customer;
          sub.status = SubscriptionStatus.ACTIVE;
          await this.subRepo.save(sub);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const sub = await this.subRepo.findOne({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          sub.status = this.mapStripeStatus(subscription.status);
          sub.currentPeriodStart = new Date(subscription.current_period_start * 1000);
          sub.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          if (subscription.cancel_at_period_end) {
            sub.canceledAt = new Date(subscription.current_period_end * 1000);
          }
          await this.subRepo.save(sub);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const sub = await this.subRepo.findOne({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          sub.status = SubscriptionStatus.CANCELED;
          sub.canceledAt = new Date();
          await this.subRepo.save(sub);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const sub = await this.subRepo.findOne({
          where: { stripeCustomerId: invoice.customer },
        });
        if (sub) {
          sub.status = SubscriptionStatus.PAST_DUE;
          await this.subRepo.save(sub);
        }
        break;
      }
    }
  }

  private mapStripeStatus(status: string): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      trialing: SubscriptionStatus.TRIALING,
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.UNPAID,
    };
    return map[status] || SubscriptionStatus.ACTIVE;
  }

  // ─── Metering: increment conversation count with overage ───
  async incrementUsage(tenantId: string): Promise<void> {
    const sub = await this.getSubscription(tenantId);
    const now = new Date();
    const limits = PLAN_LIMITS[sub.plan];

    // Reset monthly counter
    if (sub.meteringResetAt) {
      const resetDate = new Date(sub.meteringResetAt);
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        sub.conversationsThisMonth = 0;
        sub.overageConversations = 0;
        sub.meteringResetAt = now;
      }
    }

    sub.conversationsThisMonth += 1;

    // Track overage if above limit and plan supports it
    if (sub.conversationsThisMonth > limits.conversationsPerMonth && limits.overagePerConversation > 0) {
      sub.overageConversations += 1;
    }

    await this.subRepo.save(sub);
  }

  // ─── Check if tenant can send messages ───
  async checkQuota(tenantId: string): Promise<{ allowed: boolean; remaining: number; limit: number; overage?: boolean; overageRate?: number }> {
    const sub = await this.getSubscription(tenantId);
    const limits = PLAN_LIMITS[sub.plan];

    // Trial expired check
    if (sub.status === SubscriptionStatus.TRIALING && sub.trialEndsAt) {
      if (new Date() > new Date(sub.trialEndsAt)) {
        sub.status = SubscriptionStatus.PAST_DUE;
        await this.subRepo.save(sub);
        return { allowed: false, remaining: 0, limit: limits.conversationsPerMonth };
      }
    }

    // Canceled check
    if (sub.status === SubscriptionStatus.CANCELED) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    const remaining = limits.conversationsPerMonth - sub.conversationsThisMonth;

    // Free plan: hard limit, no overage
    if (sub.plan === PlanType.FREE || sub.status === SubscriptionStatus.FREE) {
      return {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        limit: limits.conversationsPerMonth,
      };
    }

    // Paid plans: allow overage if plan supports it
    if (remaining <= 0 && limits.overagePerConversation > 0) {
      return {
        allowed: true,
        remaining: 0,
        limit: limits.conversationsPerMonth,
        overage: true,
        overageRate: limits.overagePerConversation,
      };
    }

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: limits.conversationsPerMonth,
    };
  }

  async getUsageStats(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    const limits = PLAN_LIMITS[sub.plan];

    // Count actual conversations this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const actualConversations = await this.convRepo.count({
      where: { tenantId },
    });

    const trialDaysLeft = sub.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      plan: sub.plan,
      status: sub.status,
      conversationsUsed: sub.conversationsThisMonth,
      conversationsLimit: limits.conversationsPerMonth,
      conversationsRemaining: Math.max(0, limits.conversationsPerMonth - sub.conversationsThisMonth),
      maxAgents: limits.maxAgents,
      channels: limits.channels,
      customDomain: limits.customDomain,
      whiteLabel: limits.whiteLabel,
      apiAccess: limits.apiAccess,
      mcpServer: limits.mcpServer,
      outcomeTracking: limits.outcomeTracking,
      overageConversations: sub.overageConversations,
      overageRate: limits.overagePerConversation,
      overageCostCents: sub.overageConversations * limits.overagePerConversation,
      trialEndsAt: sub.trialEndsAt,
      trialDaysLeft,
      currentPeriodEnd: sub.currentPeriodEnd,
      actualConversations,
    };
  }
}
