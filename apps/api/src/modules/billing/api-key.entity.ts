import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  keyHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  prefix: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'int', default: 0 })
  totalRequests: number;

  @Column({ type: 'json', nullable: true })
  scopes: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
