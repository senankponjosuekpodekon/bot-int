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
import { Tenant } from '../tenants/tenant.entity';
import { Business } from '../business/business.entity';
import { Agent } from '../agents/agent.entity';

@Entity('products')
@Index(['tenantId', 'businessId', 'agentId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  agentId?: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent?: Agent;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: any) => (value == null ? value : Number(value)),
    },
  })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ nullable: true })
  sku: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  productUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
