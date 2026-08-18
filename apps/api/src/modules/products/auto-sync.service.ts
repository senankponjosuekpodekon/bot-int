import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '../integrations/integration.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class AutoSyncService {
  private readonly logger = new Logger(AutoSyncService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
    private readonly productsService: ProductsService,
  ) {}

  // Auto-sync every 6 hours
  @Cron('0 */6 * * *')
  async autoSyncAll(): Promise<void> {
    this.logger.log('Starting scheduled product auto-sync...');
    let totalSynced = 0;
    let totalErrors = 0;

    const integrations = await this.integrationRepo.find({
      where: { type: 'shopify' },
    });
    const wooIntegrations = await this.integrationRepo.find({
      where: { type: 'woocommerce' },
    });

    const allIntegrations = [...integrations, ...wooIntegrations];

    for (const integration of allIntegrations) {
      if (!integration.enabled) continue;
      try {
        const result = await this.productsService.syncFromStoredConfig(
          integration.tenantId,
          integration,
        );
        totalSynced += result.imported;
        totalErrors += result.errors;
        this.logger.log(
          `Synced tenant ${integration.tenantId} (${integration.type}): ${result.imported} imported, ${result.errors} errors`,
        );
      } catch (err: any) {
        this.logger.error(
          `Sync failed for tenant ${integration.tenantId} (${integration.type}): ${err?.message}`,
        );
      }
    }

    this.logger.log(`Auto-sync complete: ${totalSynced} products synced, ${totalErrors} errors`);
  }

  // Manual trigger for a single tenant
  async syncTenant(tenantId: string): Promise<{ imported: number; errors: number }> {
    const integrations = await this.integrationRepo.find({
      where: { tenantId, type: 'shopify' },
    });
    const wooIntegrations = await this.integrationRepo.find({
      where: { tenantId, type: 'woocommerce' },
    });

    const allIntegrations = [...integrations, ...wooIntegrations].filter((i) => i.enabled);
    if (allIntegrations.length === 0) {
      throw new Error('No enabled e-commerce integration found for this tenant');
    }

    let totalImported = 0;
    let totalErrors = 0;

    for (const integration of allIntegrations) {
      try {
        const result = await this.productsService.syncFromStoredConfig(tenantId, integration);
        totalImported += result.imported;
        totalErrors += result.errors;
      } catch (err: any) {
        this.logger.error(`Manual sync failed: ${err?.message}`);
        totalErrors++;
      }
    }

    return { imported: totalImported, errors: totalErrors };
  }
}
