import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum AgentType {
  SALES = 'sales',
  SUPPORT = 'support',
  HR = 'hr',
  GENERAL = 'general',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AgentType, default: AgentType.GENERAL })
  type: AgentType;

  @Column({ type: 'text', nullable: true })
  personality: string;

  @Column({ type: 'text' })
  systemPrompt: string;

  @Column({ type: 'jsonb', nullable: true })
  iceBreakers: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
