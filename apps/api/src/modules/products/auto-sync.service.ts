import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from '../integrations/integration.entity';
import { ProductImportSource } from '../products/product-import-source.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class AutoSyncService {
  private readonly logger = new Logger(AutoSyncService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepo: Repository<Integration>,
    @InjectRepository(ProductImportSource)
    private readonly sourceRepo: Repository<ProductImportSource>,
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

  @Cron('*/5 * * * *')
  async autoSyncSources(): Promise<void> {
    this.logger.log('Starting scheduled source sync...');
    let totalSynced = 0;
    let totalErrors = 0;

    const now = Date.now();
    const sources = await this.sourceRepo.find({ where: { enabled: true } });
    for (const source of sources) {
      const freq = (source.config?.frequencyMinutes || 360) * 60 * 1000;
      const last = source.lastImportAt ? new Date(source.lastImportAt).getTime() : 0;
      if (last && now - last < freq) continue;

      try {
        let result: { imported: number; errors: number } | undefined;
        if (source.source === 'sitemap') {
          result = await this.productsService.importFromSitemap(
            source.tenantId,
            source.config.sitemapUrl,
            source.config.agentId,
            source.config.maxPages,
          );
        } else if (source.source === 'csv_url') {
          result = await this.productsService.importFromCsvUrl(
            source.tenantId,
            source.config.csvUrl,
            source.config.format,
            source.config.storeDomain,
            source.config.agentId,
          );
        }
        if (result) {
          totalSynced += result.imported;
          totalErrors += result.errors;
        }
        source.lastImportAt = new Date();
        await this.sourceRepo.save(source);
        this.logger.log(`Synced source ${source.id}: ${result?.imported ?? 0} imported, ${result?.errors ?? 0} errors`);
      } catch (err: any) {
        this.logger.error(`Source sync failed for ${source.id}: ${err?.message}`);
      }
    }

    this.logger.log(`Scheduled source sync complete: ${totalSynced} products synced, ${totalErrors} errors`);
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
    const sitemapSources = await this.sourceRepo.find({
      where: { tenantId, source: 'sitemap', enabled: true },
    });
    const csvUrlSources = await this.sourceRepo.find({
      where: { tenantId, source: 'csv_url', enabled: true },
    });

    if (allIntegrations.length === 0 && sitemapSources.length === 0 && csvUrlSources.length === 0) {
      throw new Error('No enabled e-commerce integration, sitemap or CSV URL source found for this tenant');
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

    for (const source of sitemapSources) {
      try {
        const result = await this.productsService.importFromSitemap(
          tenantId,
          source.config.sitemapUrl,
          source.config.agentId,
          source.config.maxPages,
        );
        totalImported += result.imported;
        totalErrors += result.errors;
        source.lastImportAt = new Date();
        await this.sourceRepo.save(source);
      } catch (err: any) {
        this.logger.error(`Manual sitemap sync failed: ${err?.message}`);
        totalErrors++;
      }
    }

    for (const source of csvUrlSources) {
      try {
        const result = await this.productsService.importFromCsvUrl(
          tenantId,
          source.config.csvUrl,
          source.config.format,
          source.config.storeDomain,
          source.config.agentId,
        );
        totalImported += result.imported;
        totalErrors += result.errors;
        source.lastImportAt = new Date();
        await this.sourceRepo.save(source);
      } catch (err: any) {
        this.logger.error(`Manual CSV URL sync failed: ${err?.message}`);
        totalErrors++;
      }
    }

    return { imported: totalImported, errors: totalErrors };
  }
}
