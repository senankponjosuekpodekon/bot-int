import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Product } from './product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsWebhookController } from './products-webhook.controller';
import { AutoSyncService } from './auto-sync.service';
import { ShopifyImportProcessor } from '../queue/processors/shopify-import.processor';
import { QueueModule } from '../queue/queue.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SurveysModule } from '../surveys/surveys.module';
import { Integration } from '../integrations/integration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Integration]),
    IntegrationsModule,
    SurveysModule,
    QueueModule,
    BullModule.registerQueue({ name: 'shopify-imports' }),
  ],
  providers: [ProductsService, AutoSyncService, ShopifyImportProcessor],
  controllers: [ProductsController, ProductsWebhookController],
  exports: [ProductsService, AutoSyncService],
})
export class ProductsModule {}
