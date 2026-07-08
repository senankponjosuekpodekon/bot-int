import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum DocumentType {
  PDF = 'pdf',
  TEXT = 'text',
  URL = 'url',
}

@Entity('knowledge_documents')
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

  @CreateDateColumn()
  createdAt: Date;
}
