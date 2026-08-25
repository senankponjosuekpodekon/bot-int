import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed';

@Entity('jobs')
@Index(['status', 'availableAt'])
@Index(['tenantId'])
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string | null;

  @Column()
  queue: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: '{}' })
  data: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ type: 'int', default: 0 })
  delayMs: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  availableAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: JobStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
