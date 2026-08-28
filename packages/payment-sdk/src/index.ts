import { PaymentSDKConfig } from './types';
import { StripeService, StripeServiceConfig } from './services/stripe';
import { MonerooService, MonerooServiceConfig } from './services/moneroo';
import { WiseService, WiseServiceConfig } from './services/wise';
import { CoinbaseService, CoinbaseServiceConfig } from './services/coinbase';
import { ManualPaymentService, ManualPaymentConfig } from './services/manual';

export * from './types';
export { StripeService, MonerooService, WiseService, CoinbaseService, ManualPaymentService };
export type { StripeServiceConfig, MonerooServiceConfig, WiseServiceConfig, CoinbaseServiceConfig, ManualPaymentConfig };
export { ManualPaymentRecord, ManualPaymentPayload } from './services/manual';
export type { ManualPaymentPayload as ManualPaymentPayloadType } from './services/manual';

export class PaymentSDK {
  public stripe: StripeService | null;
  public moneroo: MonerooService;
  public wise: WiseService;
  public coinbase: CoinbaseService;
  public manual: ManualPaymentService;
  public environment: string;

  constructor(config: PaymentSDKConfig) {
    this.environment = config.environment;

    this.stripe = config.keys.stripeSecretKey
      ? new StripeService({
          secretKey: config.keys.stripeSecretKey,
          environment: config.environment,
        })
      : null;

    this.moneroo = new MonerooService({
      apiKey: config.keys.monerooApiKey ?? '',
      environment: config.environment,
      baseUrl: config.baseUrls?.moneroo,
    });

    this.wise = new WiseService({
      apiKey: config.keys.wiseApiKey ?? '',
      environment: config.environment,
      baseUrl: config.baseUrls?.wise,
    });

    this.coinbase = new CoinbaseService({
      apiKey: config.keys.coinbaseApiKey ?? '',
      environment: config.environment,
      baseUrl: config.baseUrls?.coinbase,
    });

    this.manual = new ManualPaymentService({ environment: config.environment });
  }
}
