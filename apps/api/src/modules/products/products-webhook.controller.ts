import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { SurveysService } from '../surveys/surveys.service';

@Controller('products/webhook')
export class ProductsWebhookController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly surveysService: SurveysService,
  ) {}

  @Post('shopify/:tenantId')
  async shopifyWebhook(
    @Param('tenantId') tenantId: string,
    @Headers() headers: any,
    @Body() body: any,
  ) {
    const topic = headers['x-shopify-topic'] || '';

    if (topic.startsWith('orders/') || topic === 'orders/create') {
      const customerEmail = body?.customer?.email || body?.email || '';
      const customerName = body?.customer?.first_name
        ? `${body.customer.first_name} ${body.customer.last_name || ''}`.trim()
        : '';
      if (customerEmail) {
        try {
          await this.surveysService.triggerPostPurchaseByOrder(tenantId, customerEmail, customerName);
        } catch {
          // Survey trigger is optional
        }
      }
      return { received: true, action: 'survey_triggered' };
    }

    await this.productsService.handleShopifyWebhook(tenantId, topic, body);
    return { received: true };
  }
}
