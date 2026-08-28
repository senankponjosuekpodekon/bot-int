import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { McpController } from './mcp.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyGuard } from './api-key.guard';
import { Subscription } from './subscription.entity';
import { ApiKey } from './api-key.entity';
import { Conversation } from '../chat/conversation.entity';
import { AgentsModule } from '../agents/agents.module';
import { ChatModule } from '../chat/chat.module';
import {
  MemoryRateLimitStorage,
  RedisRateLimitStorage,
  RATE_LIMIT_STORAGE,
} from './rate-limit.storage';
import { PaymentSDK } from '@stiamond/payment-sdk';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, ApiKey, Conversation]),
    forwardRef(() => AgentsModule),
    forwardRef(() => ChatModule),
    ConfigModule,
  ],
  providers: [
    BillingService,
    ApiKeyService,
    ApiKeyGuard,
    {
      provide: 'PAYMENT_SDK',
      useFactory: (config: ConfigService) =>
        new PaymentSDK({
          environment: config.get('NODE_ENV') === 'production' ? 'production' : 'development',
          keys: {
            stripeSecretKey: config.get<string>('STRIPE_SECRET_KEY'),
            monerooApiKey: config.get<string>('MONEROO_API_KEY'),
            wiseApiKey: config.get<string>('WISE_API_KEY'),
            coinbaseApiKey: config.get<string>('COINBASE_API_KEY'),
          },
        }),
      inject: [ConfigService],
    },
    {
      provide: RATE_LIMIT_STORAGE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        return redisUrl ? new RedisRateLimitStorage(redisUrl) : new MemoryRateLimitStorage();
      },
      inject: [ConfigService],
    },
  ],
  controllers: [BillingController, BillingWebhookController, ApiKeyController, McpController],
  exports: [BillingService, ApiKeyService, ApiKeyGuard, RATE_LIMIT_STORAGE],
})
export class BillingModule {}
