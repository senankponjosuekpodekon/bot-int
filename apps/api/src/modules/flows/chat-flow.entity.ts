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

export type FlowFieldType = 'buttons' | 'dropdown' | 'text' | 'email' | 'phone' | 'date' | 'number';

@Entity('chat_flows')
@Index(['tenantId', 'businessId', 'agentId'])
export class ChatFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  agentId: string;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  fields: {
    id: string;
    type: FlowFieldType;
    label: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
  }[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
