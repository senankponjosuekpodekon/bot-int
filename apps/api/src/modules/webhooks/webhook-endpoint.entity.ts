import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('webhook_endpoints')
@Index(['tenantId', 'isActive'])
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  url: string;

  @Column({ type: 'text', array: true })
  events: string[];

  @Column({ type: 'text', nullable: true })
  secret: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
