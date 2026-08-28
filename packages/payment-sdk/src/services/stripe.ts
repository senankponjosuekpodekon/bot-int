import Stripe from 'stripe';
import { PaymentEnvironment, CheckoutSessionPayload } from '../types';

export interface StripeServiceConfig {
  secretKey: string;
  environment: PaymentEnvironment;
}

export class StripeService {
  private client: Stripe;
  public environment: PaymentEnvironment;

  constructor(config: StripeServiceConfig) {
    this.client = new Stripe(config.secretKey, {
      apiVersion: '2024-04-10',
      appInfo: {
        name: 'stiamond-payment-sdk',
        version: '0.1.0',
      },
    });
    this.environment = config.environment;
  }

  async createCheckoutSession(payload: CheckoutSessionPayload) {
    return this.client.checkout.sessions.create({
      mode: payload.mode ?? 'subscription',
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
      line_items: [{ price: payload.priceId, quantity: 1 }],
      customer: payload.customerId,
      metadata: payload.metadata,
    });
  }

  async createCustomer(email: string, name?: string) {
    return this.client.customers.create({ email, name });
  }

  async getSubscription(subscriptionId: string) {
    return this.client.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.client.subscriptions.cancel(subscriptionId);
  }

  async getCustomer(customerId: string) {
    return this.client.customers.retrieve(customerId);
  }

  constructEvent(payload: string | Buffer, signature: string, webhookSecret: string) {
    return this.client.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
