import { PaymentEnvironment } from '../types';

export interface CoinbaseServiceConfig {
  apiKey: string;
  environment: PaymentEnvironment;
  baseUrl?: string;
}

export interface CoinbaseChargePayload {
  amount: number;
  currency: string;
  description?: string;
  name?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export class CoinbaseService {
  private config: CoinbaseServiceConfig;

  constructor(config: CoinbaseServiceConfig) {
    this.config = config;
  }

  private get baseUrl() {
    return this.config.baseUrl || (this.config.environment === 'production'
      ? 'https://api.commerce.coinbase.com'
      : 'https://api.commerce.coinbase.com');
  }

  async createCharge(payload: CoinbaseChargePayload) {
    const body = {
      name: payload.name || payload.description || 'Crypto payment',
      description: payload.description || 'Crypto payment',
      local_price: {
        amount: payload.amount.toString(),
        currency: payload.currency,
      },
      pricing_type: 'fixed_price',
      metadata: payload.metadata,
      ...(payload.customerEmail ? { customer_email: payload.customerEmail } : {}),
    };

    const res = await fetch(`${this.baseUrl}/charges`, {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': this.config.apiKey,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Coinbase createCharge failed: ${res.status} ${text}`);
    }

    return res.json();
  }
}
