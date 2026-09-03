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
import { Agent } from '../agents/agent.entity';
import { Business } from '../business/business.entity';

@Entity('site_configs')
@Index(['tenantId', 'businessId', 'agentId'])
export class SiteConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ nullable: true })
  businessId?: string;

  @ManyToOne(() => Business, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'businessId' })
  business?: Business;

  @Column({ unique: true })
  slug: string;

  @Column({ default: true })
  isActive: boolean;

  // Business info
  @Column({ default: '' })
  businessName: string;

  @Column({ type: 'text', nullable: true })
  tagline: string;

  @Column({ type: 'text', nullable: true })
  aboutText: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    hours?: string;
  };

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  socialLinks: { platform: string; url: string }[];

  // Theme
  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  theme: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    font?: string;
  };

  // Sections to show
  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  sections: {
    showAbout?: boolean;
    showProducts?: boolean;
    showContact?: boolean;
    showFAQ?: boolean;
    showChat?: boolean;
    showHours?: boolean;
    showSocial?: boolean;
  };

  // FAQ entries
  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  faqs: { question: string; answer: string }[];

  // Custom domain
  @Column({ nullable: true })
  customDomain: string;

  @Column({ nullable: true })
  subdomain: string;

  @Column({ default: false })
  domainVerified: boolean;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
