import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { JobHandler } from '../queue.service';

@Injectable()
export class ShopifyImportProcessor implements JobHandler {
  queue = 'shopify-imports';
  private readonly logger = new Logger(ShopifyImportProcessor.name);

  constructor(private readonly productsService: ProductsService) {}

  async handle(data: Record<string, any>): Promise<any> {
    const { tenantId, shopDomain, accessToken, integrationType } = data;
    this.logger.log(`Starting ${integrationType} import for tenant ${tenantId}: ${shopDomain}`);

    if (integrationType === 'public_feed') {
      return this.productsService.importFromShopifyPublicFeed(tenantId, shopDomain);
    }
    return this.productsService.importFromShopify(tenantId, shopDomain, accessToken);
  }
}
