import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ImportSourceType =
  | 'sitemap'
  | 'csv_url'
  | 'shopify'
  | 'woocommerce'
  | 'feed'
  | 'google_merchant'
  | 'manual';

@Entity('product_import_sources')
export class ProductImportSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 32 })
  source: ImportSourceType;

  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastImportAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
