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
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { UserRole } from '../auth/user.entity';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AutoSyncService } from './auto-sync.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CacheService } from '../../common/cache.service';
import { QueueService } from '../queue/queue.service';
import { UpdateProductDto } from './dto/update-product.dto';

class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @Min(0) price: number;
  @IsString() @IsOptional() currency?: string;
  @Type(() => Number) stock: number;
  @IsString() @IsOptional() sku?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsString() @IsOptional() productUrl?: string;
  @IsString() @IsOptional() agentId?: string;
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
  @IsString() @IsOptional() storeDomain?: string;
  @IsString() @IsOptional() agentId?: string;
}

class ImportSitemapDto {
  @IsString() @IsNotEmpty() sitemapUrl: string;
  @IsString() @IsOptional() agentId?: string;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(500) maxPages?: number;
}

class ListProductsDto {
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() search?: string;
  @Type(() => Number) @IsOptional() page?: number;
  @Type(() => Number) @IsOptional() limit?: number;
  @IsString() @IsOptional() agentId?: string;
}

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly autoSyncService: AutoSyncService,
    private readonly integrationsService: IntegrationsService,
    private readonly cacheService: CacheService,
    private readonly queueService: QueueService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(@Request() req, @Body() dto: CreateProductDto) {
    await this.cacheService.delPattern(`products:${req.user.tenantId}:*`);
    return this.productsService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  async findAll(@Request() req, @Query() query: ListProductsDto) {
    const cacheKey = `products:${req.user.tenantId}:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.productsService.findByTenant(req.user.tenantId, query);
    await this.cacheService.set(cacheKey, result, 60);
    return result;
  }

  @Get('categories')
  @ApiOperation({ summary: 'List product categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories(@Request() req, @Query('agentId') agentId?: string) {
    const cacheKey = `products:${req.user.tenantId}:${agentId || 'all'}:categories`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.productsService.getCategories(req.user.tenantId, agentId);
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.productsService.findById(id, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update product by ID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    await this.cacheService.delPattern(`products:${req.user.tenantId}:*`);
    return this.productsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete product by ID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async remove(@Request() req, @Param('id') id: string) {
    await this.cacheService.delPattern(`products:${req.user.tenantId}:*`);
    return this.productsService.delete(id, req.user.tenantId);
  }

  @Post('import/shopify')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import products from Shopify' })
  @ApiResponse({ status: 201, description: 'Products import queued' })
  async importShopify(@Request() req, @Body() dto: ImportShopifyDto) {
    await this.cacheService.delPattern(`products:${req.user.tenantId}:*`);
    await this.queueService.addShopifyImport(req.user.tenantId, dto.shopDomain, dto.accessToken, 'shopify');
    return { queued: true, shopDomain: dto.shopDomain };
  }

  @Post('import/woocommerce')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import products from WooCommerce' })
  @ApiResponse({ status: 201, description: 'Products imported' })
  importWooCommerce(@Request() req, @Body() dto: ImportWooCommerceDto) {
    return this.productsService.importFromWooCommerce(req.user.tenantId, dto.siteUrl, dto.consumerKey, dto.consumerSecret);
  }

  @Post('import/feed')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import products from public feed' })
  @ApiResponse({ status: 201, description: 'Products imported' })
  importPublicFeed(@Request() req, @Body() dto: ImportPublicFeedDto) {
    return this.productsService.importFromShopifyPublicFeed(req.user.tenantId, dto.shopUrl);
  }

  @Post('import/csv')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import products from CSV' })
  @ApiResponse({ status: 201, description: 'Products imported' })
  importCsv(@Request() req, @Body() dto: ImportCsvDto) {
    return this.productsService.importFromCsv(req.user.tenantId, dto.csvContent, dto.format as any, dto.storeDomain, dto.agentId);
  }

  @Post('import/google-merchant')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import products from Google Merchant CSV' })
  @ApiResponse({ status: 201, description: 'Products imported' })
  importGoogleMerchant(@Request() req, @Body() dto: ImportCsvDto) {
    return this.productsService.importFromGoogleMerchantCsv(req.user.tenantId, dto.csvContent, dto.agentId);
  }

  @Post('import/sitemap')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import products from sitemap' })
  @ApiResponse({ status: 201, description: 'Products imported' })
  importSitemap(@Request() req, @Body() dto: ImportSitemapDto) {
    return this.productsService.importFromSitemap(req.user.tenantId, dto.sitemapUrl, dto.agentId, dto.maxPages);
  }

  @Post('sync')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sync products from all integrations' })
  @ApiResponse({ status: 200, description: 'Sync results' })
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Trigger auto-sync for tenant' })
  @ApiResponse({ status: 200, description: 'Auto-sync results' })
  async triggerAutoSync(@Request() req) {
    return this.autoSyncService.syncTenant(req.user.tenantId);
  }
}
