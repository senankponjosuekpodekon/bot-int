import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Survey } from './survey.entity';

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  surveyId: string;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;

  @Column({ nullable: true })
  leadId: string;

  @Column({ nullable: true })
  visitorId: string;

  @Column({ nullable: true })
  conversationId: string;

  @Column({ type: 'jsonb', default: '[]' })
  answers: { questionId: string; value: string | string[] | number }[];

  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;
}
