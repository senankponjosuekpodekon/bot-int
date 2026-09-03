import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Lead } from './lead.entity';
import { Business } from '../business/business.entity';

@Entity('lead_comments')
@Index(['leadId', 'createdAt'])
@Index(['tenantId', 'businessId'])
export class LeadComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column()
  authorId: string;

  @Column()
  authorName: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
