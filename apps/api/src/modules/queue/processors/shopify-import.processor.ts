import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProductsService } from '../../products/products.service';

@Processor('shopify-imports')
export class ShopifyImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ShopifyImportProcessor.name);

  constructor(private readonly productsService: ProductsService) {
    super();
  }

  async process(
    job: Job<{ tenantId: string; shopDomain: string; accessToken: string; integrationType: 'shopify' | 'public_feed' }>,
  ): Promise<any> {
    const { tenantId, shopDomain, accessToken, integrationType } = job.data;
    this.logger.log(`Starting ${integrationType} import for tenant ${tenantId}: ${shopDomain}`);

    if (integrationType === 'public_feed') {
      return this.productsService.importFromShopifyPublicFeed(tenantId, shopDomain);
    }
    return this.productsService.importFromShopify(tenantId, shopDomain, accessToken);
  }
}
