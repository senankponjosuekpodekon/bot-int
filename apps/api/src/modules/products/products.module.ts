import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsWebhookController } from './products-webhook.controller';
import { AutoSyncService } from './auto-sync.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SurveysModule } from '../surveys/surveys.module';
import { Integration } from '../integrations/integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Integration]), IntegrationsModule, SurveysModule],
  providers: [ProductsService, AutoSyncService],
  controllers: [ProductsController, ProductsWebhookController],
  exports: [ProductsService, AutoSyncService],
})
export class ProductsModule {}
