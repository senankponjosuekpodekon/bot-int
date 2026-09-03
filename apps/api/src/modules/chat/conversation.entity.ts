import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from '../business/business.entity';
import { Agent } from '../agents/agent.entity';
import { Lead } from '../leads/lead.entity';

export enum ConversationStatus {
  OPEN = 'open',
  HANDED_OFF = 'handed_off',
  CLOSED = 'closed',
}

export enum ConversationState {
  GREETING = 'greeting',
  COLLECTING = 'collecting',
  ANSWERING = 'answering',
  HANDED_OFF = 'handed_off',
  CLOSED = 'closed',
}

export enum ConversationChannel {
  WEB = 'web',
  WHATSAPP = 'whatsapp',
  API = 'api',
  EMAIL = 'email',
  SMS = 'sms',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
}

export enum FunnelStage {
  AWARENESS = 'awareness',
  INTEREST = 'interest',
  QUALIFICATION = 'qualification',
  CONSIDERATION = 'consideration',
  DECISION = 'decision',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum AcquisitionChannel {
  ORGANIC = 'organic',
  META_ADS = 'meta_ads',
  GOOGLE_ADS = 'google_ads',
  DIRECT = 'direct',
  REFERRAL = 'referral',
  EMAIL = 'email',
  SOCIAL = 'social',
  QR_CODE = 'qr_code',
  LANDING_PAGE = 'landing_page',
  WEB_CHAT = 'web_chat',
  PUBLIC_LINK = 'public_link',
  UNKNOWN = 'unknown',
}

@Entity('conversations')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'funnelStage'])
@Index(['tenantId', 'acquisitionChannel'])
@Index(['agentId', 'visitorId'])
@Index(['tenantId', 'businessId', 'agentId'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column({ nullable: true })
  visitorId: string;

  @Column({ nullable: true })
  leadId?: string;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;

  @Column({
    type: 'enum',
    enum: ConversationChannel,
    default: ConversationChannel.WEB,
  })
  channel: ConversationChannel;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.OPEN,
  })
  status: ConversationStatus;

  @Column({
    type: 'enum',
    enum: AcquisitionChannel,
    default: AcquisitionChannel.UNKNOWN,
  })
  acquisitionChannel: AcquisitionChannel;

  @Column({
    type: 'enum',
    enum: FunnelStage,
    default: FunnelStage.AWARENESS,
  })
  funnelStage: FunnelStage;

  @Column({ type: 'int', default: 0 })
  intentScore: number;

  // Fit score: how well this conversation matches the ideal customer profile
  // (data completeness: budget, timeline, decision-maker, contact info) — 0-100.
  @Column({ type: 'int', default: 0 })
  fitScore: number;

  // Purchase probability: derived from intent score + funnel stage — 0-1.
  @Column({ type: 'float', default: 0 })
  purchaseProbability: number;

  // Internal flag: fitScore >= 80 AND purchaseProbability >= 0.7 — used to trigger
  // a 'lead.updated' webhook/CRM notification exactly once when the lead becomes hot.
  @Column({ default: false })
  isHotLead: boolean;

  @Column({ type: 'varchar', length: 5, nullable: true })
  language?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  lastDetectedIntent?: string;

  @Column({ type: 'float', nullable: true })
  lastConfidence?: number;

  @Column({
    type: 'enum',
    enum: ConversationState,
    default: ConversationState.ANSWERING,
  })
  state: ConversationState;

  @Column({ type: 'jsonb', nullable: true })
  formState: {
    flowId?: string;
    currentStep?: number;
    collectedFields?: Record<string, string>;
    missingFields?: string[];
  };

  @Column({ type: 'text', nullable: true })
  contextSummary?: string;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  utmParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  @Column({ nullable: true })
  referrerUrl: string;

  @Column({ nullable: true })
  landingPageUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  stageHistory: string[];

  @Column({ type: 'jsonb', nullable: true })
  clientInfo?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
