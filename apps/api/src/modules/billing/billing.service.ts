import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionStatus, PlanType, PLAN_LIMITS } from './subscription.entity';
import { Conversation } from '../chat/conversation.entity';
import { PaymentSDK, ManualPaymentRecord } from '@stiamond/payment-sdk';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    private readonly config: ConfigService,
    @Inject('PAYMENT_SDK')
    private readonly paymentSdk: PaymentSDK | null,
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

    if (sub.stripeSubscriptionId && this.paymentSdk?.stripe) {
      try {
        await this.paymentSdk.stripe.cancelSubscription(sub.stripeSubscriptionId);
      } catch (err: any) {
        this.logger.error(`Stripe cancel failed: ${err?.message}`);
      }
    }

    return this.subRepo.save(sub);
  }

  async createCheckoutSession(tenantId: string, plan: PlanType): Promise<{ url: string }> {
    const sub = await this.getSubscription(tenantId);
    if (!this.paymentSdk?.stripe) throw new BadRequestException('Stripe not configured');

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
      const customer = await this.paymentSdk.stripe.createCustomer(tenantId, tenantId);
      customerId = customer.id;
      sub.stripeCustomerId = customerId;
      await this.subRepo.save(sub);
    }

    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const session = await this.paymentSdk.stripe.createCheckoutSession({
      priceId,
      customerId,
      successUrl: `${appUrl}/dashboard/billing?success=1`,
      cancelUrl: `${appUrl}/dashboard/billing?canceled=1`,
      mode: 'subscription',
    });

    return { url: session.url };
  }

  async createManualPayment(tenantId: string, plan: PlanType, payload: { amount: number; currency: string; reference?: string; description?: string }) {
    const sub = await this.getSubscription(tenantId);
    if (!this.paymentSdk) throw new BadRequestException('Payment SDK not configured');

    const payment = await this.paymentSdk.manual.createPayment({
      amount: payload.amount,
      currency: payload.currency,
      description: payload.description,
      reference: payload.reference,
    });

    sub.plan = plan;
    sub.status = SubscriptionStatus.ACTIVE;
    await this.subRepo.save(sub);

    return payment;
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
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const sub = await this.subRepo.findOne({
          where: { stripeSubscriptionId: invoice.subscription },
        });
        if (sub) {
          sub.status = SubscriptionStatus.ACTIVE;
          if (invoice.period_end) {
            sub.currentPeriodEnd = new Date(invoice.period_end * 1000);
          }
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
    if (this.config.get<string>('BILLING_BYPASS_QUOTA', 'false') === 'true') {
      return { allowed: true, remaining: 999999, limit: 999999 };
    }
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

  // ─── List all available plans with UI-ready details ───
  // Single source of truth: the numeric limits are read from PLAN_LIMITS.
  getPlans() {
    const planNames: Record<PlanType, string> = {
      [PlanType.FREE]: 'Free',
      [PlanType.STARTER]: 'Starter',
      [PlanType.GROWTH]: 'Growth',
      [PlanType.SCALE]: 'Scale',
      [PlanType.ENTERPRISE]: 'Enterprise',
    };
    const planIcons: Record<PlanType, string> = {
      [PlanType.FREE]: 'sparkles',
      [PlanType.STARTER]: 'zap',
      [PlanType.GROWTH]: 'crown',
      [PlanType.SCALE]: 'building2',
      [PlanType.ENTERPRISE]: 'building2',
    };
    const planColors: Record<PlanType, string> = {
      [PlanType.FREE]: 'gray',
      [PlanType.STARTER]: 'blue',
      [PlanType.GROWTH]: 'indigo',
      [PlanType.SCALE]: 'purple',
      [PlanType.ENTERPRISE]: 'dark',
    };
    const staticFeatures: Record<PlanType, string[]> = {
      [PlanType.FREE]: ['Funnel tracking'],
      [PlanType.STARTER]: ['Funnel tracking'],
      [PlanType.GROWTH]: ['Multi-canal'],
      [PlanType.SCALE]: ['MCP Server', 'White-label', 'Outcome tracking', 'SLA 99.9%'],
      [PlanType.ENTERPRISE]: ['Volume custom', 'Dedicated MCP', 'Outcome pricing', 'White-label', 'Account manager'],
    };

    return (Object.values(PlanType) as PlanType[]).map((plan) => {
      const limits = PLAN_LIMITS[plan];
      const price = plan === PlanType.ENTERPRISE ? null : limits.priceMonthly / 100;
      const features = [
        limits.maxAgents === 999 ? 'Agents illimités' : `${limits.maxAgents} agent${limits.maxAgents > 1 ? 's' : ''}`,
        `${limits.conversationsPerMonth.toLocaleString('fr-FR')} conv/mois`,
        ...limits.channels.map((c) => c === 'web' ? 'Web chat' : c.charAt(0).toUpperCase() + c.slice(1)),
        ...(staticFeatures[plan] || []),
      ];
      if (limits.overagePerConversation > 0) {
        features.push(`${(limits.overagePerConversation / 100).toFixed(2).replace('.', ',')}€/conv overage`);
      }
      if (limits.customDomain) features.push('Domaine custom');
      if (limits.whiteLabel) features.push('White-label');
      if (limits.apiAccess) features.push('API access');
      if (limits.mcpServer) features.push('MCP Server');
      if (limits.outcomeTracking) features.push('Outcome tracking');
      return {
        id: plan,
        name: planNames[plan],
        price,
        icon: planIcons[plan],
        color: planColors[plan],
        features,
      };
    });
  }
}
