import { Module, OnModuleInit, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { JobEntity } from './job.entity';
import { WebhookProcessor } from './processors/webhook.processor';
import { ShopifyImportProcessor } from './processors/shopify-import.processor';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity]),
    WebhooksModule,
    forwardRef(() => ProductsModule),
  ],
  providers: [QueueService, WebhookProcessor, ShopifyImportProcessor],
  exports: [QueueService],
})
export class QueueModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly queueService: QueueService,
    private readonly webhookProcessor: WebhookProcessor,
    private readonly shopifyImportProcessor: ShopifyImportProcessor,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.queueService.registerHandler(this.webhookProcessor);
    this.queueService.registerHandler(this.shopifyImportProcessor);
    const intervalMs = this.configService.get<number>('QUEUE_POLL_INTERVAL_MS', 5000);
    this.queueService.startWorker(intervalMs);
  }

  onModuleDestroy(): void {
    this.queueService.stopWorker();
  }
}
