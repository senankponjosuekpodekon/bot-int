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

export interface BusinessProfile {
  tagline?: string;
  about?: string;
  sellingPoints?: string[];
  complianceNote?: string;
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  language?: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

@Entity('businesses')
@Index(['tenantId', 'isDefault'])
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  profile: BusinessProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
