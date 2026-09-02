import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductImport } from './product-import.entity';
import { ProductImportSource } from './product-import-source.entity';
import { Agent } from '../agents/agent.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsWebhookController } from './products-webhook.controller';
import { AutoSyncService } from './auto-sync.service';
import { QueueModule } from '../queue/queue.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SurveysModule } from '../surveys/surveys.module';
import { Integration } from '../integrations/integration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImport, ProductImportSource, Agent, Integration]),
    IntegrationsModule,
    SurveysModule,
    forwardRef(() => QueueModule),
  ],
  providers: [ProductsService, AutoSyncService],
  controllers: [ProductsController, ProductsWebhookController],
  exports: [ProductsService, AutoSyncService],
})
export class ProductsModule {}
