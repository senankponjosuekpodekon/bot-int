import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { Business } from '../business/business.entity';

export enum SurveyType {
  PRE_PURCHASE = 'pre_purchase',
  POST_PURCHASE = 'post_purchase',
}

export enum QuestionType {
  SCALE_1_5 = 'scale_1_5',
  NPS_1_10 = 'nps_1_10',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT = 'text',
  TEXTAREA = 'textarea',
  DEMOGRAPHIC_AGE = 'demographic_age',
  DEMOGRAPHIC_LOCATION = 'demographic_location',
}

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  skipLogic?: {
    dependsOn: string;
    operator: 'equals' | 'contains' | 'not_equals';
    value: string;
  };
  variant?: 'A' | 'B';
}

export interface SurveyResponseAnswer {
  questionId: string;
  value: string | string[] | number;
}

@Entity('surveys')
@Index(['tenantId', 'businessId', 'agentId'])
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SurveyType,
    default: SurveyType.PRE_PURCHASE,
  })
  type: SurveyType;

  @Column({ type: 'jsonb', default: '[]' })
  questions: SurveyQuestion[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  triggerConfig: {
    delaySeconds?: number;
    showOnPages?: string[];
    showAfterMessages?: number;
    emailSubject?: string;
    emailTemplate?: string;
  };

  @Column({ default: 0 })
  responseCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
