import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteConfig } from './site-config.entity';
import { SiteService } from './site.service';
import { SiteController, SitePublicController } from './site.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([SiteConfig]), ProductsModule],
  providers: [SiteService],
  controllers: [SiteController, SitePublicController],
  exports: [SiteService],
})
export class SiteModule {}
