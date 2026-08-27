import { Controller, Post, Req, Res, Headers, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingWebhookController {
  constructor(
    private readonly billingService: BillingService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature header');

    const secret = this.config.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Stripe webhook secret not configured');

    try {
      const rawBody = (req as any).rawBody as Buffer | undefined;
      const payload = rawBody || Buffer.from(JSON.stringify(req.body));
      const event = this.verifyWebhookSignature(payload, signature, secret);
      await this.billingService.handleStripeWebhook(event);
      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
  }

  // Stripe allows /webhooks as well as /webhook
  @Post('webhooks')
  async handleWebhooks(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.handleWebhook(req, res, signature);
  }

  private verifyWebhookSignature(payload: Buffer, header: string, secret: string): any {
    const parts = header.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      throw new Error('Invalid signature header format');
    }

    const timestamp = timestampPart.split('=')[1];
    const providedSignature = signaturePart.split('=')[1];

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    if (providedSignature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (age > 300) {
      throw new Error('Webhook timestamp too old');
    }

    return JSON.parse(payload.toString());
  }
}
