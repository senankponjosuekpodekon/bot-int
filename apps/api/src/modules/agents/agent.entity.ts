import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum AgentType {
  SALES = 'sales',
  SUPPORT = 'support',
  HR = 'hr',
  GENERAL = 'general',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AgentType, default: AgentType.GENERAL })
  type: AgentType;

  @Column({ nullable: true })
  industry?: string;

  @Column({ type: 'text', nullable: true })
  personality: string;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ type: 'jsonb', nullable: true })
  iceBreakers: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  personalityConfig: {
    tone?: 'professional' | 'friendly' | 'formal' | 'casual';
    discloseAI?: boolean;
    aiDisclosureMessage?: string;
    pacingEnabled?: boolean;
    minDelayMs?: number;
    maxDelayMs?: number;
    businessHours?: { start: string; end: string; days: number[] };
    autoReplyMode?: 'always' | 'business_hours' | 'off_hours_only';
    audience?: 'all' | 'new_only' | 'returning_only';
    escalationTopics?: string[];
    forbiddenTopics?: string[];
    toolsEnabled?: boolean;
    memoryEnabled?: boolean;
    subAgents?: { agentId: string; name: string; keywords: string[] }[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
