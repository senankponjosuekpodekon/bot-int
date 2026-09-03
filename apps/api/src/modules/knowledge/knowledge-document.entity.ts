import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Business } from '../business/business.entity';

export enum DocumentType {
  PDF = 'pdf',
  TEXT = 'text',
  URL = 'url',
  DOCX = 'docx',
}

export enum KnowledgeScope {
  AGENT = 'agent',
  BUSINESS = 'business',
}

@Entity('knowledge_documents')
@Index(['tenantId', 'businessId', 'agentId'])
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ nullable: true })
  filename: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  embeddingId: string;

  @Column({ nullable: true })
  agentId: string;

  @Column({ default: true })
  shared: boolean;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column({ type: 'enum', enum: KnowledgeScope, default: KnowledgeScope.AGENT })
  scope: KnowledgeScope;

  @CreateDateColumn()
  createdAt: Date;
}
