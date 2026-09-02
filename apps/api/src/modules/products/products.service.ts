import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Agent } from '../agents/agent.entity';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  private async ensureAgentInTenant(tenantId: string, agentId?: string): Promise<void> {
    if (!agentId) return;
    const agent = await this.agentRepo.findOne({ where: { id: agentId, tenantId } });
    if (!agent) throw new NotFoundException('Agent not found');
  }

  async create(tenantId: string, data: Partial<Product>): Promise<Product> {
    await this.ensureAgentInTenant(tenantId, data.agentId);
    const product = this.productRepo.create({ ...data, tenantId });
    return this.productRepo.save(product);
  }

  async findByTenant(tenantId: string, params?: { category?: string; search?: string; page?: number; limit?: number; agentId?: string }): Promise<{ data: Product[]; total: number }> {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    if (params?.agentId) await this.ensureAgentInTenant(tenantId, params.agentId);

    const qb = this.productRepo
      .createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.isActive = :active', { active: true });

    if (params?.agentId) {
      qb.andWhere('(product.agentId = :agentId OR product.agentId IS NULL)', { agentId: params.agentId });
    }

    if (params?.category) {
      qb.andWhere('product.category = :category', { category: params.category });
    }

    if (params?.search) {
      qb.andWhere('(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${params.search}%`,
      });
    }

    qb.orderBy('product.createdAt', 'DESC').skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, tenantId: string, data: Partial<Product>): Promise<Product> {
    await this.ensureAgentInTenant(tenantId, data.agentId);
    await this.productRepo.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.productRepo.delete({ id, tenantId });
  }

  async getCategories(tenantId: string, agentId?: string): Promise<string[]> {
    if (agentId) await this.ensureAgentInTenant(tenantId, agentId);
    const qb = this.productRepo
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.category IS NOT NULL');
    if (agentId) {
      qb.andWhere('(product.agentId = :agentId OR product.agentId IS NULL)', { agentId });
    }
    const result = await qb.getRawMany();
    return result.map((r) => r.category).filter(Boolean);
  }

  async searchRelevant(tenantId: string, query: string, agentId?: string): Promise<Product[]> {
    if (agentId) await this.ensureAgentInTenant(tenantId, agentId);
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôöùûüç-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 8);

    if (keywords.length === 0) return [];

    const qb = this.productRepo
      .createQueryBuilder('product')
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.isActive = :active', { active: true });
    if (agentId) {
      qb.andWhere('(product.agentId = :agentId OR product.agentId IS NULL)', { agentId });
    }
    qb.andWhere(
      keywords
        .map((_, i) => `(LOWER(product.name) LIKE :kw${i} OR LOWER(product.description) LIKE :kw${i} OR LOWER(product.category) LIKE :kw${i})`)
        .join(' OR '),
      Object.fromEntries(keywords.map((kw, i) => [`kw${i}`, `%${kw}%`])),
    )
      .orderBy('product.price', 'ASC')
      .take(5);
    return qb.getMany();
  }

  async importFromShopify(tenantId: string, shopDomain: string, accessToken: string): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;
    let url: string | null = `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`;

    while (url) {
      try {
        const response = await axios.get(url, {
          headers: { 'X-Shopify-Access-Token': accessToken },
          timeout: 30000,
        });

        for (const item of response.data.products) {
          try {
            const variant = item.variants?.[0];
            const existing = await this.productRepo.findOne({
              where: { tenantId, sku: item.id?.toString() },
            });

            const productData: Partial<Product> = {
              name: item.title,
              description: item.body_html?.replace(/<[^>]+>/g, '').slice(0, 2000) || '',
              price: parseFloat(variant?.price || '0'),
              currency: 'EUR',
              stock: variant?.inventory_quantity ?? 0,
              sku: item.id?.toString(),
              category: item.product_type || 'General',
              imageUrl: item.image?.src || null,
              productUrl: `https://${shopDomain}/products/${item.handle}`,
              metadata: { vendor: item.vendor, tags: item.tags, handle: item.handle },
            };

            if (existing) {
              await this.productRepo.update(existing.id, productData);
            } else {
              await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
            }
            imported++;
          } catch {
            errors++;
          }
        }

        const linkHeader = response.headers['link'] || '';
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        url = nextMatch ? nextMatch[1] : null;
      } catch (err: any) {
        this.logger.error(`Shopify import failed: ${err?.message}`);
        throw new Error(`Shopify import failed: ${err?.message}`);
      }
    }

    this.logger.log(`Shopify import: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async importFromWooCommerce(tenantId: string, siteUrl: string, consumerKey: string, consumerSecret: string): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await axios.get(`${siteUrl}/wp-json/wc/v3/products`, {
          params: { per_page: 100, page },
          auth: { username: consumerKey, password: consumerSecret },
          timeout: 30000,
        });

        if (response.data.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of response.data) {
          try {
            const existing = await this.productRepo.findOne({
              where: { tenantId, sku: item.id?.toString() },
            });

            const productData: Partial<Product> = {
              name: item.name,
              description: (item.short_description || item.description || '').replace(/<[^>]+>/g, '').slice(0, 2000),
              price: parseFloat(item.price || item.regular_price || '0'),
              currency: 'EUR',
              stock: item.stock_quantity ?? 0,
              sku: item.id?.toString(),
              category: item.categories?.[0]?.name || 'General',
              imageUrl: item.images?.[0]?.src || null,
              productUrl: item.permalink || null,
              metadata: { type: item.type, tags: item.tags?.map((t: any) => t.name) },
            };

            if (existing) {
              await this.productRepo.update(existing.id, productData);
            } else {
              await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
            }
            imported++;
          } catch {
            errors++;
          }
        }

        page++;
        if (response.data.length < 100) hasMore = false;
      } catch (err: any) {
        this.logger.error(`WooCommerce import failed: ${err?.message}`);
        throw new Error(`WooCommerce import failed: ${err?.message}`);
      }
    }

    this.logger.log(`WooCommerce import: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async syncFromStoredConfig(tenantId: string, integration: any): Promise<{ imported: number; errors: number }> {
    if (integration.type === 'shopify') {
      return this.importFromShopify(tenantId, integration.config.shopDomain, integration.config.secretKey || integration.config.accessToken);
    }
    if (integration.type === 'woocommerce') {
      return this.importFromWooCommerce(tenantId, integration.config.siteUrl, integration.config.consumerKey, integration.config.consumerSecret);
    }
    throw new Error(`Unknown integration type: ${integration.type}`);
  }

  async handleShopifyWebhook(tenantId: string, topic: string, data: any): Promise<void> {
    const sku = data.id?.toString();
    if (!sku) return;

    const existing = await this.productRepo.findOne({ where: { tenantId, sku } });

    if (topic === 'products/delete') {
      if (existing) {
        existing.isActive = false;
        await this.productRepo.save(existing);
      }
      return;
    }

    const variant = data.variants?.[0];
    const productData: Partial<Product> = {
      name: data.title,
      description: data.body_html?.replace(/<[^>]+>/g, '').slice(0, 2000) || '',
      price: parseFloat(variant?.price || '0'),
      currency: 'EUR',
      stock: variant?.inventory_quantity ?? 0,
      sku,
      category: data.product_type || 'General',
      imageUrl: data.image?.src || null,
      productUrl: data.handle ? `https://shop/products/${data.handle}` : null,
      metadata: { vendor: data.vendor, tags: data.tags, handle: data.handle },
    };

    if (existing) {
      await this.productRepo.update(existing.id, productData);
    } else {
      await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
    }
  }

  async importFromShopifyPublicFeed(tenantId: string, shopUrl: string): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    const url = shopUrl.includes('myshopify.com')
      ? `https://${shopUrl.replace(/^https?:\/\//, '')}/products.json?limit=250`
      : `https://${shopUrl.replace(/^https?:\/\//, '')}/products.json?limit=250`;

    try {
      const response = await axios.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const products = response.data.products || [];

      for (const item of products) {
        try {
          const variant = item.variants?.[0];
          const existing = await this.productRepo.findOne({
            where: { tenantId, sku: item.id?.toString() },
          });

          const productData: Partial<Product> = {
            name: item.title,
            description: item.body_html?.replace(/<[^>]+>/g, '').slice(0, 2000) || '',
            price: parseFloat(variant?.price || '0'),
            currency: variant?.currency_code || 'EUR',
            stock: variant?.inventory_quantity ?? 0,
            sku: item.id?.toString(),
            category: item.product_type || 'General',
            imageUrl: item.image?.src || null,
            productUrl: `https://${shopUrl.replace(/^https?:\/\//, '')}/products/${item.handle}`,
            metadata: { vendor: item.vendor, tags: item.tags, handle: item.handle, source: 'public_feed' },
          };

          if (existing) {
            await this.productRepo.update(existing.id, productData);
          } else {
            await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
          }
          imported++;
        } catch {
          errors++;
        }
      }
    } catch (err: any) {
      this.logger.error(`Shopify public feed import failed: ${err?.message}`);
      throw new Error(`Impossible d'accéder au feed: ${err?.message}`);
    }

    this.logger.log(`Shopify public feed: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async importFromCsv(tenantId: string, csvContent: string, format?: 'shopify' | 'woocommerce' | 'generic'): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    const rows = this.parseCsv(csvContent);
    if (rows.length < 2) {
      throw new Error('CSV vide ou invalide');
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const detectedFormat = format || this.detectCsvFormat(headers);

    for (let i = 1; i < rows.length; i++) {
      try {
        const values = rows[i];
        if (values.length < 2) continue;

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        let productData: Partial<Product>;

        if (detectedFormat === 'shopify') {
          productData = {
            name: row['title'] || row['name'] || row['handle'] || `Produit ${i}`,
            description: (row['body (html)'] || row['body_html'] || row['description'] || '').replace(/<[^>]+>/g, '').slice(0, 2000),
            price: parseFloat(row['variant price'] || row['price'] || '0'),
            currency: 'EUR',
            stock: parseInt(row['variant inventory qty'] || row['inventory_quantity'] || '0') || 0,
            sku: row['variant sku'] || row['sku'] || `csv-${i}`,
            category: row['type'] || row['product_type'] || row['category'] || 'General',
            imageUrl: row['image src'] || row['image'] || null,
            productUrl: row['handle'] ? `${row['handle']}` : null,
            metadata: { vendor: row['vendor'], tags: row['tags'], source: 'csv_shopify' },
          };
        } else if (detectedFormat === 'woocommerce') {
          productData = {
            name: row['name'] || row['post_title'] || `Produit ${i}`,
            description: (row['short_description'] || row['description'] || '').replace(/<[^>]+>/g, '').slice(0, 2000),
            price: parseFloat(row['regular_price'] || row['price'] || '0'),
            currency: 'EUR',
            stock: parseInt(row['stock_quantity'] || row['stock'] || '0') || 0,
            sku: row['sku'] || row['id'] || `csv-${i}`,
            category: row['categories'] || row['category'] || 'General',
            imageUrl: row['images'] || row['image'] || null,
            productUrl: row['permalink'] || null,
            metadata: { type: row['type'], tags: row['tags'], source: 'csv_woo' },
          };
        } else {
          productData = {
            name: row['name'] || row['title'] || row['produit'] || `Produit ${i}`,
            description: row['description'] || row['desc'] || '',
            price: parseFloat(row['price'] || row['prix'] || row['montant'] || '0'),
            currency: row['currency'] || row['devise'] || 'EUR',
            stock: parseInt(row['stock'] || row['quantite'] || row['quantity'] || '0') || 0,
            sku: row['sku'] || row['id'] || row['reference'] || `csv-${i}`,
            category: row['category'] || row['categorie'] || 'General',
            imageUrl: row['image'] || row['image_url'] || row['imageurl'] || null,
            productUrl: row['url'] || row['product_url'] || row['link'] || null,
            metadata: { source: 'csv_generic' },
          };
        }

        if (!productData.name || productData.price < 0) {
          errors++;
          continue;
        }

        const existing = await this.productRepo.findOne({
          where: { tenantId, sku: productData.sku },
        });

        if (existing) {
          await this.productRepo.update(existing.id, productData);
        } else {
          await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
        }
        imported++;
      } catch {
        errors++;
      }
    }

    this.logger.log(`CSV import (${detectedFormat}): ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async importFromGoogleMerchantCsv(tenantId: string, csvContent: string): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    const rows = this.parseCsv(csvContent);
    if (rows.length < 2) throw new Error('CSV Google Merchant vide ou invalide');

    const headers = rows[0].map((h) => h.toLowerCase().trim());

    for (let i = 1; i < rows.length; i++) {
      try {
        const values = rows[i];
        if (values.length < 3) continue;

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const priceStr = (row['price'] || '').replace(/[^\d.]/g, '');
        const productData: Partial<Product> = {
          name: row['title'] || row['name'] || `Produit ${i}`,
          description: (row['description'] || '').replace(/<[^>]+>/g, '').slice(0, 2000),
          price: parseFloat(priceStr) || 0,
          currency: (row['price'] || '').match(/([A-Z]{3})/)?.[1] || 'EUR',
          stock: row['availability']?.toLowerCase().includes('in stock') ? 99 : 0,
          sku: row['id'] || row['mpn'] || row['gtin'] || `gmc-${i}`,
          category: row['product_type'] || row['google_product_category'] || 'General',
          imageUrl: row['image_link'] || row['additional_image_link'] || null,
          productUrl: row['link'] || null,
          metadata: {
            brand: row['brand'],
            gtin: row['gtin'],
            mpn: row['mpn'],
            condition: row['condition'],
            availability: row['availability'],
            shipping: row['shipping'],
            source: 'google_merchant',
          },
        };

        if (!productData.name || productData.price < 0) { errors++; continue; }

        const existing = await this.productRepo.findOne({ where: { tenantId, sku: productData.sku } });
        if (existing) {
          await this.productRepo.update(existing.id, productData);
        } else {
          await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
        }
        imported++;
      } catch {
        errors++;
      }
    }

    this.logger.log(`Google Merchant CSV: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async importFromSitemap(tenantId: string, sitemapUrl: string): Promise<{ imported: number; errors: number; scanned: number }> {
    let imported = 0;
    let errors = 0;
    let scanned = 0;

    try {
      const response = await axios.get(sitemapUrl, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(response.data, { xmlMode: true });

      const urls: string[] = [];
      $('url > loc').each((_, el) => {
        const url = $(el).text().trim();
        if (url && this.isProductUrl(url)) urls.push(url);
      });

      // Also check sitemap index (nested sitemaps)
      const sitemapLocs: string[] = [];
      $('sitemap > loc').each((_, el) => {
        sitemapLocs.push($(el).text().trim());
      });

      // Fetch nested sitemaps (max 3)
      for (const smUrl of sitemapLocs.slice(0, 3)) {
        try {
          const smResp = await axios.get(smUrl, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
          const $sm = cheerio.load(smResp.data, { xmlMode: true });
          $sm('url > loc').each((_, el) => {
            const url = $sm(el).text().trim();
            if (url && this.isProductUrl(url)) urls.push(url);
          });
        } catch { /* skip failed sub-sitemap */ }
      }

      scanned = urls.length;
      this.logger.log(`Sitemap: found ${scanned} product URLs`);

      // Scrape each product page (max 50 to avoid overload)
      for (const productUrl of urls.slice(0, 50)) {
        try {
          const product = await this.scrapeProductPage(productUrl);
          if (product) {
            const sku = product.sku || `sitemap-${Buffer.from(productUrl).toString('base64').slice(0, 16)}`;
            const existing = await this.productRepo.findOne({ where: { tenantId, sku } });
            const productData: any = { ...product, sku, productUrl, metadata: { ...product.metadata, source: 'sitemap' } };

            if (existing) {
              await this.productRepo.update(existing.id, productData);
            } else {
              await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
            }
            imported++;
          }
        } catch {
          errors++;
        }
      }
    } catch (err: any) {
      this.logger.error(`Sitemap import failed: ${err?.message}`);
      throw new Error(`Sitemap inaccessible: ${err?.message}`);
    }

    this.logger.log(`Sitemap: ${scanned} URLs scanned, ${imported} imported, ${errors} errors`);
    return { imported, errors, scanned };
  }

  private isProductUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('/product') || lower.includes('/products/') || lower.includes('/p/') ||
           lower.includes('/item/') || lower.includes('/produit') || lower.includes('/shop/') ||
           lower.includes('/store/') || lower.includes('/detail');
  }

  private async scrapeProductPage(url: string): Promise<Partial<Product> | null> {
    try {
      const response = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(response.data);

      const name = $('h1').first().text().trim() ||
                   $('[itemprop="name"]').text().trim() ||
                   $('title').text().trim() ||
                   $('meta[property="og:title"]').attr('content') || '';

      const description = $('[itemprop="description"]').text().trim() ||
                          $('meta[name="description"]').attr('content') ||
                          $('meta[property="og:description"]').attr('content') || '';

      const priceText = $('[itemprop="price"]').attr('content') ||
                        $('[itemprop="price"]').text().trim() ||
                        $('.price').first().text().trim() ||
                        $('[class*="price"]').first().text().trim() || '0';
      const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

      const imageUrl = $('[itemprop="image"]').attr('src') ||
                       $('meta[property="og:image"]').attr('content') ||
                       $('img').first().attr('src') || null;

      const sku = $('[itemprop="sku"]').attr('content') ||
                  $('[itemprop="sku"]').text().trim() ||
                  $('[data-sku]').attr('data-sku') || undefined;

      if (!name) return null;

      return {
        name: name.slice(0, 200),
        description: description.slice(0, 2000),
        price,
        currency: 'EUR',
        stock: 99,
        sku,
        category: 'General',
        imageUrl,
        metadata: { scrapedFrom: url },
      };
    } catch {
      return null;
    }
  }

  private detectCsvFormat(headers: string[]): 'shopify' | 'woocommerce' | 'generic' {
    if (headers.some((h) => h.includes('variant') || h.includes('body (html)') || h.includes('handle'))) {
      return 'shopify';
    }
    if (headers.some((h) => h.includes('regular_price') || h.includes('short_description') || h.includes('permalink'))) {
      return 'woocommerce';
    }
    return 'generic';
  }

  private parseCsv(content: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    content = content.replace(/^\uFEFF/, '');
    const len = content.length;

    while (i < len) {
      const char = content[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < len && content[i + 1] === '"') {
            current += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        current += char;
        i++;
      } else {
        if (char === '"') {
          inQuotes = true;
          i++;
        } else if (char === ',') {
          row.push(current.trim());
          current = '';
          i++;
        } else if (char === '\r' || char === '\n') {
          row.push(current.trim());
          rows.push(row);
          row = [];
          current = '';
          if (char === '\r' && i + 1 < len && content[i + 1] === '\n') i += 2; else i++;
        } else {
          current += char;
          i++;
        }
      }
    }
    if (row.length > 0 || current.length > 0) {
      row.push(current.trim());
      rows.push(row);
    }
    return rows;
  }
}
