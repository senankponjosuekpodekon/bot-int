import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type FlowFieldType = 'buttons' | 'dropdown' | 'text' | 'email' | 'phone' | 'date' | 'number';

@Entity('chat_flows')
export class ChatFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  agentId: string;

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
}
