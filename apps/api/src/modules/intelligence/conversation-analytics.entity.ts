import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('conversation_analytics')
export class ConversationAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  conversationId: string;

  @Column({ nullable: true })
  leadId: string;

  @Column({ type: 'text' })
  userMessage: string;

  @Column({ type: 'text' })
  agentReply: string;

  @Column({ default: false })
  hadKnowledge: boolean;

  @Column({ default: false })
  hadProducts: boolean;

  @Column({ default: false })
  converted: boolean;

  @Column({ type: 'int', default: 0 })
  messageLength: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  detectedIntent: string;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  @CreateDateColumn()
  createdAt: Date;
}
