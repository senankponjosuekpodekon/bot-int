import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookService, WebhookEndpoint } from './webhook.service';
import { WebhooksController } from './webhooks.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEndpoint]), forwardRef(() => QueueModule)],
  providers: [WebhookService],
  controllers: [WebhooksController],
  exports: [WebhookService],
})
export class WebhooksModule {}
