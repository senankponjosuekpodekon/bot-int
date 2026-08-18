import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { Lead } from '../leads/lead.entity';

export enum ConversationStatus {
  OPEN = 'open',
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
