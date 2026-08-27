# @stiamond/payment-sdk

Payment SDK for Stiamond SaaS products.

## Install

### From GitHub Packages

Configure your `.npmrc` at the root of the consuming project:

```ini
@stiamond:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
npm install @stiamond/payment-sdk
```

## Usage

```ts
import { PaymentSDK } from '@stiamond/payment-sdk';

const sdk = new PaymentSDK({
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  keys: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  },
});

const session = await sdk.stripe.createCheckoutSession({
  priceId: 'price_123',
  successUrl: 'https://app.stiamond.net/success',
  cancelUrl: 'https://app.stiamond.net/cancel',
});
```

## Build

```bash
npm install
npm run build
```

## Publish

```bash
npm run build
npm publish
```

Make sure `GITHUB_TOKEN` has `write:packages` scope.
