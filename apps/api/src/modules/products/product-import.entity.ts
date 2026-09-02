import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ImportSource =
  | 'csv'
  | 'csv_url'
  | 'sitemap'
  | 'google_merchant'
  | 'shopify'
  | 'woocommerce'
  | 'feed'
  | 'autosync'
  | 'manual';

export type ImportStatus = 'success' | 'partial' | 'error';

@Entity('product_imports')
export class ProductImport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 32 })
  source: ImportSource;

  @Column({ type: 'varchar', length: 16 })
  status: ImportStatus;

  @Column({ type: 'int', default: 0 })
  created: number;

  @Column({ type: 'int', default: 0 })
  updated: number;

  @Column({ type: 'int', default: 0 })
  errors: number;

  @Column({ type: 'int', nullable: true })
  scanned?: number;

  @Column({ type: 'jsonb', nullable: true })
  details: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  completedAt: Date;
}
