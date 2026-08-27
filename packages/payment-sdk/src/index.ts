import { PaymentSDKConfig } from './types';
import { StripeService, StripeServiceConfig } from './services/stripe';
import { MonerooService, MonerooServiceConfig } from './services/moneroo';
import { WiseService, WiseServiceConfig } from './services/wise';
import { CoinbaseService, CoinbaseServiceConfig } from './services/coinbase';

export * from './types';
export { StripeService, MonerooService, WiseService, CoinbaseService };
export type { StripeServiceConfig, MonerooServiceConfig, WiseServiceConfig, CoinbaseServiceConfig };

export class PaymentSDK {
  public stripe: StripeService;
  public moneroo: MonerooService;
  public wise: WiseService;
  public coinbase: CoinbaseService;
  public environment: string;

  constructor(config: PaymentSDKConfig) {
    this.environment = config.environment;

    const hasAnyKey =
      config.keys.stripeSecretKey ||
      config.keys.monerooApiKey ||
      config.keys.wiseApiKey ||
      config.keys.coinbaseApiKey;

    if (!hasAnyKey) {
      throw new Error('At least one payment provider key is required');
    }

    const stripeSecretKey = config.keys.stripeSecretKey;
    if (!stripeSecretKey) {
      // Provide a stub if no key, but this will fail on actual usage
      this.stripe = new StripeService({
        secretKey: '',
        environment: config.environment,
      });
    } else {
      this.stripe = new StripeService({
        secretKey: stripeSecretKey,
        environment: config.environment,
      });
    }

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
  }
}
