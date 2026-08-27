import { PaymentEnvironment } from '../types';

export interface WiseServiceConfig {
  apiKey: string;
  environment: PaymentEnvironment;
}

export class WiseService {
  private config: WiseServiceConfig;

  constructor(config: WiseServiceConfig) {
    this.config = config;
  }

  async createTransfer(payload: { sourceCurrency: string; targetCurrency: string; amount: number }) {
    throw new Error('Wise integration not implemented yet');
  }
}
