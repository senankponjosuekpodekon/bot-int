import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PlanType {
  FREE = 'free',
  STARTER = 'starter',
  GROWTH = 'growth',
  SCALE = 'scale',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  FREE = 'free',
}

export const PLAN_LIMITS: Record<PlanType, {
  conversationsPerMonth: number;
  maxAgents: number;
  channels: string[];
  customDomain: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  mcpServer: boolean;
  outcomeTracking: boolean;
  overagePerConversation: number;
  priceMonthly: number;
  trialDays: number;
}> = {
  [PlanType.FREE]: {
    conversationsPerMonth: 50,
    maxAgents: 1,
    channels: ['web'],
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    mcpServer: false,
    outcomeTracking: false,
    overagePerConversation: 0,
    priceMonthly: 0,
    trialDays: 0,
  },
  [PlanType.STARTER]: {
    conversationsPerMonth: 1000,
    maxAgents: 3,
    channels: ['web', 'email'],
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    mcpServer: false,
    outcomeTracking: false,
    overagePerConversation: 8,
    priceMonthly: 7900,
    trialDays: 14,
  },
  [PlanType.GROWTH]: {
    conversationsPerMonth: 5000,
    maxAgents: 999,
    channels: ['web', 'email', 'sms', 'telegram'],
    customDomain: true,
    whiteLabel: false,
    apiAccess: true,
    mcpServer: false,
    outcomeTracking: false,
    overagePerConversation: 5,
    priceMonthly: 24900,
    trialDays: 14,
  },
  [PlanType.SCALE]: {
    conversationsPerMonth: 20000,
    maxAgents: 999,
    channels: ['web', 'email', 'sms', 'telegram', 'whatsapp'],
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
    mcpServer: true,
    outcomeTracking: true,
    overagePerConversation: 3,
    priceMonthly: 69900,
    trialDays: 14,
  },
  [PlanType.ENTERPRISE]: {
    conversationsPerMonth: 999999,
    maxAgents: 999,
    channels: ['web', 'email', 'sms', 'telegram', 'whatsapp'],
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
    mcpServer: true,
    outcomeTracking: true,
    overagePerConversation: 0,
    priceMonthly: 0,
    trialDays: 30,
  },
};

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @Column({ type: 'enum', enum: PlanType, default: PlanType.STARTER })
  plan: PlanType;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIALING })
  status: SubscriptionStatus;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  stripeSubscriptionId: string;

  @Column({ nullable: true })
  stripePriceId: string;

  @Column({ type: 'date', nullable: true })
  trialEndsAt: Date;

  @Column({ type: 'date', nullable: true })
  currentPeriodStart: Date;

  @Column({ type: 'date', nullable: true })
  currentPeriodEnd: Date;

  @Column({ type: 'date', nullable: true })
  canceledAt: Date;

  // Metering
  @Column({ type: 'int', default: 0 })
  conversationsThisMonth: number;

  @Column({ type: 'int', default: 0 })
  overageConversations: number;

  @Column({ type: 'date', nullable: true })
  meteringResetAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
