import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AgentType } from '../agents/agent.entity';

@Entity('marketplace_templates')
@Index(['category'])
@Index(['industry'])
export class MarketplaceTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  industry?: string;

  @Column({
    type: 'enum',
    enum: AgentType,
    default: AgentType.GENERAL,
  })
  agentType: AgentType;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ nullable: true })
  sourceAgentId?: string;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ type: 'text', nullable: true })
  personality?: string;

  @Column({ type: 'jsonb', nullable: true })
  personalityConfig?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  iceBreakers?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
