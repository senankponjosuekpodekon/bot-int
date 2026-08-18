import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PlanType {
  STARTER = 'starter',
  GROWTH = 'growth',
  SCALE = 'scale',
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export const PLAN_LIMITS: Record<PlanType, {
  conversationsPerMonth: number;
  maxAgents: number;
  channels: string[];
  customDomain: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
}> = {
  [PlanType.STARTER]: {
    conversationsPerMonth: 2000,
    maxAgents: 1,
    channels: ['web', 'email'],
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
  },
  [PlanType.GROWTH]: {
    conversationsPerMonth: 10000,
    maxAgents: 999,
    channels: ['web', 'email', 'sms', 'telegram'],
    customDomain: true,
    whiteLabel: false,
    apiAccess: false,
  },
  [PlanType.SCALE]: {
    conversationsPerMonth: 999999,
    maxAgents: 999,
    channels: ['web', 'email', 'sms', 'telegram', 'whatsapp'],
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
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

  @Column({ type: 'date', nullable: true })
  meteringResetAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
