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
import { ToolRiskLevel } from './agent-tools.service';
import { Business } from '../business/business.entity';

export enum PendingActionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// A WRITE/EXECUTE tool call that the agent requested but could not execute on its own.
// A human operator must review and approve/reject it before anything is actually done.
@Entity('pending_actions')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'conversationId'])
@Index(['tenantId', 'businessId', 'agentId'])
export class PendingAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  conversationId?: string;

  @Column({ nullable: true })
  agentId?: string;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column()
  toolName: string;

  @Column({ type: 'jsonb', default: '{}' })
  args: Record<string, string>;

  @Column({ type: 'enum', enum: ToolRiskLevel })
  riskLevel: ToolRiskLevel;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'enum', enum: PendingActionStatus, default: PendingActionStatus.PENDING })
  status: PendingActionStatus;

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
