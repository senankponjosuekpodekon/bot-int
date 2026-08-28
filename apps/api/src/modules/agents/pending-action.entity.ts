import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ToolRiskLevel } from './agent-tools.service';

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
export class PendingAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  conversationId?: string;

  @Column({ nullable: true })
  agentId?: string;

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
