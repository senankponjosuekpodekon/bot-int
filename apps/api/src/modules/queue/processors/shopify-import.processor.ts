import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { JobHandler } from '../queue.service';
import { CryptoService } from '../../../common/crypto.service';

@Injectable()
export class ShopifyImportProcessor implements JobHandler {
  queue = 'shopify-imports';
  private readonly logger = new Logger(ShopifyImportProcessor.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly crypto: CryptoService,
  ) {}

  async handle(data: Record<string, any>): Promise<any> {
    const { tenantId, shopDomain, accessToken, integrationType } = data;
    this.logger.log(`Starting ${integrationType} import for tenant ${tenantId}: ${shopDomain}`);

    if (integrationType === 'public_feed') {
      return this.productsService.importFromShopifyPublicFeed(tenantId, shopDomain);
    }
    const token = this.crypto.isEncrypted(accessToken) ? this.crypto.decrypt(accessToken) : accessToken;
    return this.productsService.importFromShopify(tenantId, shopDomain, token);
  }
}
