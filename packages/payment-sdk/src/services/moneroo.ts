import { PaymentEnvironment } from '../types';

export interface MonerooServiceConfig {
  apiKey: string;
  environment: PaymentEnvironment;
}

export class MonerooService {
  private config: MonerooServiceConfig;

  constructor(config: MonerooServiceConfig) {
    this.config = config;
  }

  async createPayment(payload: { amount: number; currency: string }) {
    throw new Error('Moneroo integration not implemented yet');
  }
}
