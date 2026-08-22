import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { WebhookProcessor } from './processors/webhook.processor';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 86400, count: 100 },
          removeOnFail: { age: 604800, count: 500 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'webhooks' }, { name: 'shopify-imports' }),
    WebhooksModule,
  ],
  providers: [QueueService, WebhookProcessor],
  exports: [QueueService],
})
export class QueueModule {}
