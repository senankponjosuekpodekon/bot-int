import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type InsightType = 'unanswered' | 'trend' | 'lead_pattern' | 'suggestion' | 'performance';

@Entity('intelligence_insights')
export class Insight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 30 })
  type: InsightType;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: '{}' })
  data: Record<string, any>;

  @Column({ default: false })
  resolved: boolean;

  @Column({ type: 'float', default: 0 })
  confidence: number;

  @CreateDateColumn()
  createdAt: Date;
}
