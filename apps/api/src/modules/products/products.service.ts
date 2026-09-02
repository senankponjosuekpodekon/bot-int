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

  async importFromCsv(
    tenantId: string,
    csvContent: string,
    format?: 'shopify' | 'woocommerce' | 'generic',
    storeDomain?: string,
    agentId?: string,
  ): Promise<{ imported: number; errors: number }> {
    if (agentId) await this.ensureAgentInTenant(tenantId, agentId);
    let imported = 0;
    let errors = 0;

    const rows = this.parseCsv(csvContent);
    if (rows.length < 2) {
      throw new Error('CSV vide ou invalide');
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const detectedFormat = format || this.detectCsvFormat(headers);

    const rowObjects = rows.slice(1).map((values) => {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      return row;
    });

    if (detectedFormat === 'shopify') {
      const groups = new Map<string, typeof rowObjects>();
      for (const row of rowObjects) {
        const handle = (row['handle'] || '').trim();
        if (!handle) continue;
        if (!groups.has(handle)) groups.set(handle, []);
        groups.get(handle).push(row);
      }

      for (const [handle, group] of groups.entries()) {
        try {
          const primary = group.find((r) => r['title']?.trim()) || group[0];
          if (!primary?.['title']?.trim()) continue;

          const allImages = new Set<string>();
          const variants: Array<{
            sku: string;
            price: string;
            stock: string;
            optionLabel: string;
            image: string;
          }> = [];

          for (const r of group) {
            const image = (r['image src'] || '').trim();
            if (image) allImages.add(image);

            const title = r['title']?.trim();
            const variantSku = r['variant sku']?.trim();
            if (title && variantSku) {
              const optionParts: string[] = [];
              for (let opt = 1; opt <= 3; opt++) {
                const optName = (r[`option${opt} name`] || '').trim();
                const optValue = (r[`option${opt} value`] || '').trim();
                if (optValue && optValue.toLowerCase() !== 'default title') {
                  optionParts.push(
                    optName && optName.toLowerCase() !== 'title'
                      ? `${optName}: ${optValue}`
                      : optValue,
                  );
                }
              }
              variants.push({
                sku: variantSku,
                price: r['variant price'] || '',
                stock: r['variant inventory qty'] || '',
                optionLabel: optionParts.join(' / '),
                image,
              });
            }
          }

          if (variants.length === 0) {
            const primarySku = (primary['variant sku'] || '').trim() || `csv-${handle}`;
            variants.push({
              sku: primarySku,
              price: primary['variant price'] || '',
              stock: primary['variant inventory qty'] || '',
              optionLabel: '',
              image: (primary['image src'] || '').trim(),
            });
          }

          const firstImage = allImages.size > 0 ? Array.from(allImages)[0] : null;
          const productUrl = storeDomain ? this.buildShopifyUrl(storeDomain, handle) : null;

          for (const variant of variants) {
            const baseName = primary['title'].trim();
            const name = variant.optionLabel ? `${baseName} — ${variant.optionLabel}` : baseName;
            const price = parseFloat((variant.price || primary['variant price'] || '0').replace(/[^\d.]/g, '')) || 0;
            const stock = parseInt(variant.stock || primary['variant inventory qty'] || '0') || 0;
            const sku = variant.sku || `csv-${handle}`;

            const productData: Partial<Product> = {
              name,
              description: (primary['body (html)'] || primary['body_html'] || '')
                .replace(/<[^>]+>/g, '')
                .slice(0, 2000),
              price,
              currency: 'EUR',
              stock,
              sku,
              category: primary['type'] || primary['product_type'] || primary['category'] || 'General',
              imageUrl: variant.image || firstImage,
              productUrl,
              agentId,
              metadata: {
                vendor: primary['vendor'],
                tags: primary['tags'],
                handle,
                images: Array.from(allImages).slice(0, 10),
                optionLabel: variant.optionLabel || undefined,
                source: 'csv_shopify',
              },
            };
            await this.upsertProduct(tenantId, sku, productData);
            imported++;
          }
        } catch {
          errors++;
        }
      }
    } else if (detectedFormat === 'woocommerce') {
      for (let i = 0; i < rowObjects.length; i++) {
        try {
          const row = rowObjects[i];
          if (!row['name'] && !row['title'] && !row['post_title']) continue;
          const productData: Partial<Product> = {
            name: row['name'] || row['post_title'] || `Produit ${i + 1}`,
            description: (row['short_description'] || row['description'] || '').replace(/<[^>]+>/g, '').slice(0, 2000),
            price: parseFloat((row['regular_price'] || row['price'] || '0').replace(/[^\d.]/g, '')) || 0,
            currency: row['currency'] || row['devise'] || 'EUR',
            stock: parseInt(row['stock_quantity'] || row['stock'] || '0') || 0,
            sku: row['sku'] || row['id'] || `csv-${i + 1}`,
            category: row['categories'] || row['category'] || 'General',
            imageUrl: row['images'] || row['image'] || null,
            productUrl: row['permalink'] || null,
            agentId,
            metadata: { type: row['type'], tags: row['tags'], source: 'csv_woo' },
          };
          if (!productData.name || Number.isNaN(productData.price) || productData.price < 0) {
            errors++;
            continue;
          }
          await this.upsertProduct(tenantId, productData.sku, productData);
          imported++;
        } catch {
          errors++;
        }
      }
    } else {
      for (let i = 0; i < rowObjects.length; i++) {
        try {
          const row = rowObjects[i];
          if (!row['name'] && !row['title'] && !row['produit']) continue;
          const priceRaw = row['price'] || row['prix'] || row['montant'] || '0';
          const productData: Partial<Product> = {
            name: row['name'] || row['title'] || row['produit'] || `Produit ${i + 1}`,
            description: row['description'] || row['desc'] || '',
            price: parseFloat(priceRaw.replace(/[^\d.]/g, '')) || 0,
            currency: row['currency'] || row['devise'] || 'EUR',
            stock: parseInt(row['stock'] || row['quantite'] || row['quantity'] || '0') || 0,
            sku: row['sku'] || row['id'] || row['reference'] || `csv-${i + 1}`,
            category: row['category'] || row['categorie'] || 'General',
            imageUrl: row['image'] || row['image_url'] || row['imageurl'] || null,
            productUrl: row['url'] || row['product_url'] || row['link'] || null,
            agentId,
            metadata: { source: 'csv_generic' },
          };
          if (!productData.name || Number.isNaN(productData.price) || productData.price < 0) {
            errors++;
            continue;
          }
          await this.upsertProduct(tenantId, productData.sku, productData);
          imported++;
        } catch {
          errors++;
        }
      }
    }

    this.logger.log(`CSV import (${detectedFormat}): ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async importFromGoogleMerchantCsv(tenantId: string, csvContent: string, agentId?: string): Promise<{ imported: number; errors: number }> {
    if (agentId) await this.ensureAgentInTenant(tenantId, agentId);
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
          agentId,
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

        if (!productData.name || Number.isNaN(productData.price) || productData.price < 0) { errors++; continue; }

        await this.upsertProduct(tenantId, productData.sku, productData);
        imported++;
      } catch {
        errors++;
      }
    }

    this.logger.log(`Google Merchant CSV: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async importFromSitemap(tenantId: string, sitemapUrl: string, agentId?: string, maxPages?: number): Promise<{ imported: number; errors: number; scanned: number }> {
    if (agentId) await this.ensureAgentInTenant(tenantId, agentId);
    let imported = 0;
    let errors = 0;
    let scanned = 0;
    const limit = Math.min(Math.max(maxPages || 50, 1), 500);

    try {
      const response = await this.fetchWithRetry(sitemapUrl, { timeout: 30000 });
      const main = this.extractSitemapUrls(response.data);
      const urls: string[] = [...main.urls];
      const nestedSitemaps = [...main.nestedSitemaps];

      for (const smUrl of nestedSitemaps.slice(0, 5)) {
        try {
          const smResp = await this.fetchWithRetry(smUrl, { timeout: 20000 });
          const sub = this.extractSitemapUrls(smResp.data);
          urls.push(...sub.urls);
          nestedSitemaps.push(...sub.nestedSitemaps);
        } catch (err: any) {
          this.logger.warn(`Failed to fetch nested sitemap ${smUrl}: ${err?.message}`);
        }
      }

      const productUrls = [...new Set(urls.filter((u) => this.isProductUrl(u)))];
      scanned = productUrls.length;
      this.logger.log(`Sitemap: found ${scanned} product URLs`);

      for (const productUrl of productUrls.slice(0, limit)) {
        try {
          const product = await this.scrapeProductPage(productUrl);
          if (product) {
            const sku = product.sku || `sitemap-${Buffer.from(productUrl).toString('base64').slice(0, 16)}`;
            const productData: any = { ...product, sku, productUrl, agentId, metadata: { ...product.metadata, source: 'sitemap' } };
            await this.upsertProduct(tenantId, sku, productData);
            imported++;
          } else {
            errors++;
          }
        } catch (err: any) {
          this.logger.warn(`Sitemap: failed to scrape ${productUrl}: ${err?.message}`);
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
    try {
      const { pathname } = new URL(url);
      const lower = pathname.toLowerCase();
      const ext = lower.split('.').pop();
      const blockedExtensions = ['xml', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'css', 'js', 'zip', 'webp', 'json', 'woff', 'woff2'];
      if (ext && blockedExtensions.includes(ext)) return false;

      const segments = lower.split('/').filter(Boolean);
      if (segments.length < 2) return false;

      const last = segments[segments.length - 1];
      const productKeywords = ['product', 'products', 'produit', 'produits', 'p', 'item', 'artikel', 'detail', 'buy', 'article', 'shop', 'store'];
      if (productKeywords.includes(last)) return false;

      const excluded = ['category', 'categories', 'cat', 'collection', 'collections', 'tag', 'tags', 'page', 'cart', 'checkout', 'account', 'login', 'register', 'search', 'author', 'wp-admin', 'wp-content', 'wp-includes', 'product-category', 'product_tag', 'archive', 'feed'];
      if (segments.some((s) => excluded.includes(s))) return false;

      return segments.some((s) => productKeywords.includes(s));
    } catch {
      return false;
    }
  }

  private extractSitemapUrls(xml: string): { urls: string[]; nestedSitemaps: string[] } {
    const urls: string[] = [];
    const nestedSitemaps: string[] = [];
    const rootMatch = xml.match(/<(\w+:)?(urlset|sitemapindex)[^>]*>/i);
    const isIndex = rootMatch?.[2]?.toLowerCase() === 'sitemapindex';
    const locRegex = /<(?:\w+:)?loc[^>]*>([\s\S]*?)<\/(?:\w+:)?loc>/gi;
    let match = locRegex.exec(xml);
    while (match !== null) {
      const u = match[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '');
      if (u) {
        if (isIndex) nestedSitemaps.push(u);
        else urls.push(u);
      }
      match = locRegex.exec(xml);
    }
    return { urls, nestedSitemaps };
  }

  private resolveUrl(base: string, url?: string): string | null {
    if (!url) return null;
    if (url.startsWith('data:')) return null;
    try {
      return new URL(url, base).toString();
    } catch {
      return null;
    }
  }

  private parseJsonLdScripts($: any): any[] {
    const results: any[] = [];
    $('script[type="application/ld+json"]').each((_: any, el: any) => {
      try {
        const text = $(el).html() || '';
        const cleaned = text.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, '');
        const data = JSON.parse(cleaned);
        if (Array.isArray(data)) results.push(...data);
        else results.push(data);
      } catch { /* ignore invalid JSON-LD */ }
    });
    return results;
  }

  private findSchemaProduct(items: any[]): any | null {
    for (const item of items) {
      const type = item?.['@type'];
      const types = Array.isArray(type) ? type.map((t: any) => String(t).toLowerCase()) : [String(type).toLowerCase()];
      if (types.includes('product')) return item;
    }
    for (const item of items) {
      const type = item?.['@type'];
      const types = Array.isArray(type) ? type.map((t: any) => String(t).toLowerCase()) : [String(type).toLowerCase()];
      if (types.some((t: string) => t.includes('product'))) return item;
    }
    return null;
  }

  private findBreadcrumbCategory($: any, productUrl: string): string {
    const items = this.parseJsonLdScripts($);
    for (const item of items) {
      const type = item?.['@type'];
      const types = Array.isArray(type) ? type.map((t: any) => String(t).toLowerCase()) : [String(type).toLowerCase()];
      if (types.includes('breadcrumblist') && Array.isArray(item.itemListElement)) {
        const names = item.itemListElement
          .map((e: any) => e.item?.name || e.name)
          .filter((n: any) => n && typeof n === 'string' && !/^(accueil|home|shop|boutique)$/i.test(n));
        if (names.length > 1) return names.slice(0, -1).join(' > ');
      }
    }
    try {
      const pathname = new URL(productUrl).pathname;
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        const candidate = segments[segments.length - 2];
        if (candidate && candidate.length > 2) return candidate.replace(/-/g, ' ').replace(/_/g, ' ');
      }
    } catch { /* ignore */ }
    return 'General';
  }

  private async fetchWithRetry(url: string, options?: any, retries = 2): Promise<any> {
    let lastErr: any;
    for (let i = 0; i <= retries; i++) {
      try {
        return await axios.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' }, ...options });
      } catch (err: any) {
        lastErr = err;
        if (i < retries) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
    throw lastErr;
  }

  private async scrapeProductPage(url: string): Promise<Partial<Product> | null> {
    try {
      const response = await this.fetchWithRetry(url, { timeout: 15000 });
      const $ = cheerio.load(response.data);
      const jsonLd = this.parseJsonLdScripts($);
      const schema = this.findSchemaProduct(jsonLd);

      let name = '';
      let description = '';
      let price = 0;
      let currency = 'EUR';
      let stock = 99;
      let sku: string | undefined;
      let imageUrl: string | null = null;
      let category = 'General';
      let brand: string | undefined;

      if (schema) {
        name = schema.name || schema.headline || '';
        description = schema.description || '';
        brand = schema.brand?.name || (typeof schema.brand === 'string' ? schema.brand : undefined);
        sku = schema.sku || schema.mpn || schema.gtin || undefined;

        const offers = schema.offers;
        if (offers) {
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer) {
            if (offer.price) {
              price = parseFloat(String(offer.price).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
            }
            if (offer.priceCurrency) currency = String(offer.priceCurrency).toUpperCase();
            const availability = String(offer.availability || '').toLowerCase();
            if (availability.includes('outofstock') || availability.includes('soldout')) stock = 0;
            else if (availability.includes('instock') || availability.includes('preorder')) stock = 99;
            else if (typeof offer.inventoryLevel?.value === 'number') stock = offer.inventoryLevel.value;
            else if (typeof offer.inventoryLevel?.value === 'string') stock = parseInt(offer.inventoryLevel.value) || stock;
            if (offer.sku && !sku) sku = String(offer.sku);
          }
        }

        let rawImage = Array.isArray(schema.image) ? schema.image[0] : schema.image;
        if (rawImage && typeof rawImage === 'object') rawImage = rawImage.url || rawImage.contentUrl;
        if (typeof rawImage === 'string') imageUrl = this.resolveUrl(url, rawImage);
      }

      if (!name) {
        name = $('h1').first().text().trim() ||
               $('[itemprop="name"]').text().trim() ||
               $('title').text().trim() ||
               $('meta[property="og:title"]').attr('content') || '';
      }
      if (!description) {
        description = $('[itemprop="description"]').text().trim() ||
                      $('meta[name="description"]').attr('content') ||
                      $('meta[property="og:description"]').attr('content') || '';
      }
      if (!price) {
        const priceText = $('[itemprop="price"]').attr('content') ||
                          $('[itemprop="price"]').text().trim() ||
                          $('.price').first().text().trim() ||
                          $('[class*="price"]').first().text().trim() || '0';
        price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      }
      if (!imageUrl) {
        imageUrl = this.resolveUrl(url, $('[itemprop="image"]').attr('src') ||
                       $('meta[property="og:image"]').attr('content') ||
                       $('img').first().attr('src'));
      }
      if (!sku) {
        sku = $('[itemprop="sku"]').attr('content') ||
              $('[itemprop="sku"]').text().trim() ||
              $('[data-sku]').attr('data-sku') || undefined;
      }

      const metaCurrency = $('meta[property="og:price:currency"]').attr('content') ||
                           $('meta[property="product:price:currency"]').attr('content');
      if (metaCurrency) currency = metaCurrency.toUpperCase();

      if (category === 'General') category = this.findBreadcrumbCategory($, url);

      if (!name) return null;

      return {
        name: name.slice(0, 200),
        description: description.slice(0, 2000),
        price,
        currency,
        stock,
        sku,
        category,
        imageUrl,
        metadata: { scrapedFrom: url, brand },
      };
    } catch {
      return null;
    }
  }

  private buildShopifyUrl(storeDomain: string, handle: string): string {
    const domain = storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cleanHandle = handle.replace(/^\//, '').replace(/\/$/, '');
    return `https://${domain}/products/${cleanHandle}`;
  }

  private async upsertProduct(tenantId: string, sku: string, productData: Partial<Product>): Promise<void> {
    const existing = await this.productRepo.findOne({ where: { tenantId, sku } });
    if (existing) {
      await this.productRepo.update(existing.id, productData);
    } else {
      await this.productRepo.save(this.productRepo.create({ ...productData, tenantId }));
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
