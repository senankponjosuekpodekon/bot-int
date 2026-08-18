import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'stripe' | 'calendly' | 'email' | 'twilio' | 'telegram'

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
