import { PaymentSDKConfig } from './types';
import { StripeService, StripeServiceConfig } from './services/stripe';
import { MonerooService, MonerooServiceConfig } from './services/moneroo';
import { WiseService, WiseServiceConfig } from './services/wise';

export * from './types';
export { StripeService, MonerooService, WiseService };
export type { StripeServiceConfig, MonerooServiceConfig, WiseServiceConfig };

export class PaymentSDK {
  public stripe: StripeService;
  public moneroo: MonerooService;
  public wise: WiseService;
  public environment: string;

  constructor(config: PaymentSDKConfig) {
    this.environment = config.environment;

    if (!config.keys.stripeSecretKey) {
      throw new Error('Stripe secret key is required');
    }

    const stripeConfig: StripeServiceConfig = {
      secretKey: config.keys.stripeSecretKey,
      environment: config.environment,
    };

    this.stripe = new StripeService(stripeConfig);
    this.moneroo = new MonerooService({
      apiKey: config.keys.monerooApiKey ?? '',
      environment: config.environment,
    });
    this.wise = new WiseService({
      apiKey: config.keys.wiseApiKey ?? '',
      environment: config.environment,
    });
  }
}
