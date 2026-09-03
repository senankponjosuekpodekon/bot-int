import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { Business } from '../business/business.entity';

@Entity('agent_feedback')
@Index(['tenantId', 'businessId', 'agentId'])
export class AgentFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column({ type: 'text' })
  userMessage: string;

  @Column({ type: 'text' })
  originalReply: string;

  @Column({ type: 'text' })
  correctedReply: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ default: false })
  appliedToPrompt: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
