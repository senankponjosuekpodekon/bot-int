import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MemoryScope {
  VISITOR = 'visitor',
  LEAD = 'lead',
  TENANT = 'tenant',
}

@Entity('agent_memories')
@Index(['tenantId', 'scope', 'scopeId'])
@Index(['tenantId', 'agentId'])
export class AgentMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  agentId: string;

  @Column({ type: 'enum', enum: MemoryScope, default: MemoryScope.VISITOR })
  scope: MemoryScope;

  @Column()
  scopeId: string;

  @Column()
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'float', default: 1.0 })
  importance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
