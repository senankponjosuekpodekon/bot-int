import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from '../agents/agent.entity';

@Entity('agent_feedback')
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
