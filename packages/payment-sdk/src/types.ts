export type PaymentEnvironment = 'development' | 'production';

export interface PaymentSDKConfig {
  environment: PaymentEnvironment;
  keys: {
    stripeSecretKey?: string;
    monerooApiKey?: string;
    wiseApiKey?: string;
    coinbaseApiKey?: string;
  };
  baseUrls?: {
    moneroo?: string;
    wise?: string;
    coinbase?: string;
  };
}

export interface CheckoutSessionPayload {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  mode?: 'subscription' | 'payment';
  metadata?: Record<string, string>;
}

export interface ChargePayload {
  amount: number;
  currency: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, string>;
}
