import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductsService } from './products.service';
import { AutoSyncService } from './auto-sync.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) price: number;
  @IsString() @IsOptional() currency?: string;
  @Type(() => Number) @IsNumber() stock: number;
  @IsString() @IsOptional() sku?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsString() @IsOptional() productUrl?: string;
}

class ImportShopifyDto {
  @IsString() @IsNotEmpty() shopDomain: string;
  @IsString() @IsNotEmpty() accessToken: string;
}

class ImportWooCommerceDto {
  @IsString() @IsNotEmpty() siteUrl: string;
  @IsString() @IsNotEmpty() consumerKey: string;
  @IsString() @IsNotEmpty() consumerSecret: string;
}

class ImportPublicFeedDto {
  @IsString() @IsNotEmpty() shopUrl: string;
}

class ImportCsvDto {
  @IsString() @IsNotEmpty() csvContent: string;
  @IsString() @IsOptional() format?: string;
}

class ImportSitemapDto {
  @IsString() @IsNotEmpty() sitemapUrl: string;
}

class ListProductsDto {
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() search?: string;
  @Type(() => Number) @IsOptional() page?: number;
  @Type(() => Number) @IsOptional() limit?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly autoSyncService: AutoSyncService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Post()
  create(@Request() req, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req, @Query() query: ListProductsDto) {
    return this.productsService.findByTenant(req.user.tenantId, query);
  }

  @Get('categories')
  getCategories(@Request() req) {
    return this.productsService.getCategories(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.productsService.findById(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.productsService.delete(id, req.user.tenantId);
  }

  @Post('import/shopify')
  importShopify(@Request() req, @Body() dto: ImportShopifyDto) {
    return this.productsService.importFromShopify(req.user.tenantId, dto.shopDomain, dto.accessToken);
  }

  @Post('import/woocommerce')
  importWooCommerce(@Request() req, @Body() dto: ImportWooCommerceDto) {
    return this.productsService.importFromWooCommerce(req.user.tenantId, dto.siteUrl, dto.consumerKey, dto.consumerSecret);
  }

  @Post('import/feed')
  importPublicFeed(@Request() req, @Body() dto: ImportPublicFeedDto) {
    return this.productsService.importFromShopifyPublicFeed(req.user.tenantId, dto.shopUrl);
  }

  @Post('import/csv')
  importCsv(@Request() req, @Body() dto: ImportCsvDto) {
    return this.productsService.importFromCsv(req.user.tenantId, dto.csvContent, dto.format as any);
  }

  @Post('import/google-merchant')
  importGoogleMerchant(@Request() req, @Body() dto: ImportCsvDto) {
    return this.productsService.importFromGoogleMerchantCsv(req.user.tenantId, dto.csvContent);
  }

  @Post('import/sitemap')
  importSitemap(@Request() req, @Body() dto: ImportSitemapDto) {
    return this.productsService.importFromSitemap(req.user.tenantId, dto.sitemapUrl);
  }

  @Post('sync')
  async sync(@Request() req) {
    const tenantId = req.user.tenantId;
    const integrations = await this.integrationsService.findAll(tenantId);
    const results: any[] = [];
    for (const integration of integrations) {
      if (integration.type === 'shopify' || integration.type === 'woocommerce') {
        try {
          const result = await this.productsService.syncFromStoredConfig(tenantId, integration);
          results.push({ type: integration.type, ...result });
        } catch (err: any) {
          results.push({ type: integration.type, error: err.message });
        }
      }
    }
    return results;
  }

  @Post('auto-sync')
  async triggerAutoSync(@Request() req) {
    return this.autoSyncService.syncTenant(req.user.tenantId);
  }
}
