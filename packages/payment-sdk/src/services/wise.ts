import { PaymentEnvironment } from '../types';

export interface WiseServiceConfig {
  apiKey: string;
  environment: PaymentEnvironment;
  baseUrl?: string;
}

export interface WiseTransferPayload {
  sourceCurrency: string;
  targetCurrency: string;
  amount: number;
  customerTransactionId?: string;
}

export class WiseService {
  private config: WiseServiceConfig;

  constructor(config: WiseServiceConfig) {
    this.config = config;
  }

  private get baseUrl() {
    return this.config.baseUrl || (this.config.environment === 'production'
      ? 'https://api.wise.com'
      : 'https://api.sandbox.transferwise.tech');
  }

  async createTransfer(payload: WiseTransferPayload) {
    const customerTransactionId = payload.customerTransactionId || crypto.randomUUID();

    const res = await fetch(`${this.baseUrl}/v1/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceCurrency: payload.sourceCurrency,
        targetCurrency: payload.targetCurrency,
        sourceAmount: payload.amount,
        customerTransactionId,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wise createTransfer failed: ${res.status} ${text}`);
    }

    return res.json();
  }
}
