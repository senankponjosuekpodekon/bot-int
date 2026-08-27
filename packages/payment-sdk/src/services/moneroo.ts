import { PaymentEnvironment, ChargePayload } from '../types';

export interface MonerooServiceConfig {
  apiKey: string;
  environment: PaymentEnvironment;
  baseUrl?: string;
}

export class MonerooService {
  private config: MonerooServiceConfig;

  constructor(config: MonerooServiceConfig) {
    this.config = config;
  }

  private get baseUrl() {
    return this.config.baseUrl || (this.config.environment === 'production'
      ? 'https://api.moneroo.io'
      : 'https://api.moneroo.io');
  }

  async createPayment(payload: ChargePayload) {
    const res = await fetch(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: payload.amount,
        currency: payload.currency,
        description: payload.description,
        customer_email: payload.customerEmail,
        metadata: payload.metadata,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Moneroo createPayment failed: ${res.status} ${text}`);
    }

    return res.json();
  }
}
