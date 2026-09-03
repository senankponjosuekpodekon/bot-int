import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '../business/business.entity';

export enum WorkflowStepType {
  LLM_CALL = 'llm_call',
  TOOL_CALL = 'tool_call',
  CONDITION = 'condition',
  HANDOFF = 'handoff',
  NOTIFY = 'notify',
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('agent_workflows')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'agentId'])
@Index(['tenantId', 'businessId', 'agentId'])
export class AgentWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  agentId: string;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: '[]' })
  steps: {
    id: string;
    type: WorkflowStepType;
    name: string;
    config: {
      prompt?: string;
      toolName?: string;
      condition?: string;
      targetStepId?: string;
      message?: string;
      channel?: string;
    };
    nextStepId?: string;
  }[];

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
  status: WorkflowStatus;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  trigger: {
    type: 'manual' | 'keyword' | 'funnel_stage' | 'intent_score';
    value?: string;
    threshold?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
