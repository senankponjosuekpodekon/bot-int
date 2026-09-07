import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FlowExecutionStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum FlowExecutionTrigger {
  INTENT = 'intent',
  MANUAL = 'manual',
  AUTO = 'auto',
}

@Entity('flow_executions')
@Index(['tenantId', 'flowId'])
@Index(['tenantId', 'createdAt'])
export class FlowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  flowId: string;

  @Column()
  agentId: string;

  @Column({ nullable: true })
  conversationId?: string;

  @Column({
    type: 'enum',
    enum: FlowExecutionStatus,
    default: FlowExecutionStatus.COMPLETED,
  })
  status: FlowExecutionStatus;

  @Column({
    type: 'enum',
    enum: FlowExecutionTrigger,
    default: FlowExecutionTrigger.MANUAL,
  })
  triggeredBy: FlowExecutionTrigger;

  @Column({ type: 'jsonb' })
  input: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  output?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;
}
