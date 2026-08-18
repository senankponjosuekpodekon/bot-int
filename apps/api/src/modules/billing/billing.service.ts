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
      sub = await this.createTrial(tenantId);
    }
    return sub;
  }

  async createTrial(tenantId: string): Promise<Subscription> {
    const existing = await this.subRepo.findOne({ where: { tenantId } });
    if (existing) return existing;

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    const sub = this.subRepo.create({
      tenantId,
      plan: PlanType.GROWTH,
      status: SubscriptionStatus.TRIALING,
      trialEndsAt: trialEnds,
      conversationsThisMonth: 0,
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
      [PlanType.STARTER]: this.config.get('STRIPE_PRICE_STARTER', ''),
      [PlanType.GROWTH]: this.config.get('STRIPE_PRICE_GROWTH', ''),
      [PlanType.SCALE]: this.config.get('STRIPE_PRICE_SCALE', ''),
    };

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

  // ─── Metering: increment conversation count ───
  async incrementUsage(tenantId: string): Promise<void> {
    const sub = await this.getSubscription(tenantId);
    const now = new Date();

    // Reset monthly counter
    if (sub.meteringResetAt) {
      const resetDate = new Date(sub.meteringResetAt);
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        sub.conversationsThisMonth = 0;
        sub.meteringResetAt = now;
      }
    }

    sub.conversationsThisMonth += 1;
    await this.subRepo.save(sub);
  }

  // ─── Check if tenant can send messages ───
  async checkQuota(tenantId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
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
      trialEndsAt: sub.trialEndsAt,
      trialDaysLeft,
      currentPeriodEnd: sub.currentPeriodEnd,
      actualConversations,
    };
  }
}
