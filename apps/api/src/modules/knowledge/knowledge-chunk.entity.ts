import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnowledgeDocument } from './knowledge-document.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @ManyToOne(() => KnowledgeDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: KnowledgeDocument;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  embedding: string;

  @Column({ type: 'int', default: 0 })
  chunkIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
