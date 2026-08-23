import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TenantPlan {
  BASIC = 'basic',
  PRO = 'pro',
  BUSINESS = 'business',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'enum', enum: TenantPlan, default: TenantPlan.BASIC })
  plan: TenantPlan;

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
