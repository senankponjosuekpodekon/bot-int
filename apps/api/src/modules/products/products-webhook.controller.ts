import { Body, Controller, Headers, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { SurveysService } from '../surveys/surveys.service';

@Controller('products/webhook')
export class ProductsWebhookController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly surveysService: SurveysService,
    private readonly config: ConfigService,
  ) {}

  private verifyShopifyWebhook(rawBody: string, hmacHeader: string): boolean {
    const secret = this.config.get<string>('SHOPIFY_WEBHOOK_SECRET');
    if (!secret) return false;

    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(computed),
        Buffer.from(hmacHeader),
      );
    } catch {
      return false;
    }
  }

  @Post('shopify/:tenantId')
  async shopifyWebhook(
    @Param('tenantId') tenantId: string,
    @Headers() headers: any,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const hmacHeader = headers['x-shopify-hmac-sha256'];
    if (!hmacHeader || !this.verifyShopifyWebhook(JSON.stringify(body), hmacHeader)) {
      throw new UnauthorizedException('Invalid Shopify webhook signature');
    }

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
