import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PlatformMetricType =
  | 'prompt_performance'
  | 'flow_completion'
  | 'intent_distribution'
  | 'conversion_factor'
  | 'response_quality';

@Entity('platform_insights')
export class PlatformInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  metricType: PlatformMetricType;

  @Column({ type: 'varchar', length: 100 })
  metricKey: string;

  @Column({ type: 'float', default: 0 })
  value: number;

  @Column({ type: 'int', default: 0 })
  sampleCount: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
