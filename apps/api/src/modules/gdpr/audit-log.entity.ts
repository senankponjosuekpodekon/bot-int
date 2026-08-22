import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  SHARE = 'share',
  ESCALATE = 'escalate',
}

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'action'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 50 })
  action: AuditAction | string;

  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ nullable: true })
  resourceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;
}
