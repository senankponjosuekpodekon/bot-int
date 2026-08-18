import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteConfig } from './site-config.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(
    @InjectRepository(SiteConfig)
    private readonly siteRepo: Repository<SiteConfig>,
    private readonly productsService: ProductsService,
  ) {}

  async create(tenantId: string, data: Partial<SiteConfig>): Promise<SiteConfig> {
    const slug = data.slug || this.generateSlug(data.businessName || 'mon-business');

    const existing = await this.siteRepo.findOne({ where: { slug } });
    if (existing) throw new ConflictException('Ce slug est déjà pris');

    if (data.subdomain) {
      const existingSub = await this.siteRepo.findOne({ where: { subdomain: data.subdomain } });
      if (existingSub) throw new ConflictException('Ce sous-domaine est déjà pris');
    }

    if (data.customDomain) {
      const existingDomain = await this.siteRepo.findOne({ where: { customDomain: data.customDomain } });
      if (existingDomain) throw new ConflictException('Ce domaine est déjà configuré');
    }

    const site = this.siteRepo.create({
      tenantId,
      slug,
      businessName: data.businessName || '',
      tagline: data.tagline || '',
      aboutText: data.aboutText || '',
      logoUrl: data.logoUrl || null,
      coverImageUrl: data.coverImageUrl || null,
      contact: data.contact || {},
      socialLinks: data.socialLinks || [],
      theme: data.theme || { primaryColor: '#6366f1', secondaryColor: '#8b5cf6', backgroundColor: '#ffffff', textColor: '#1f2937' },
      sections: data.sections || { showAbout: true, showProducts: true, showContact: true, showChat: true, showHours: true, showSocial: false, showFAQ: false },
      faqs: data.faqs || [],
      agentId: data.agentId || null,
      customDomain: data.customDomain || null,
      subdomain: data.subdomain || null,
      seo: data.seo || {},
      isActive: true,
    });

    return this.siteRepo.save(site);
  }

  async findByTenant(tenantId: string): Promise<SiteConfig[]> {
    return this.siteRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<SiteConfig> {
    const site = await this.siteRepo.findOne({ where: { id, tenantId } });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async findBySlug(slug: string): Promise<SiteConfig> {
    const site = await this.siteRepo.findOne({ where: { slug, isActive: true } });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async findByDomain(domain: string): Promise<SiteConfig | null> {
    const site = await this.siteRepo.findOne({
      where: { customDomain: domain, isActive: true, domainVerified: true },
    });
    if (site) return site;

    const subdomain = domain.split('.')[0];
    if (subdomain && subdomain !== 'www' && domain.endsWith('.stiamond.com')) {
      return this.siteRepo.findOne({ where: { subdomain, isActive: true } });
    }

    return null;
  }

  async update(id: string, tenantId: string, data: Partial<SiteConfig>): Promise<SiteConfig> {
    const site = await this.findOne(id, tenantId);

    if (data.slug && data.slug !== site.slug) {
      const existing = await this.siteRepo.findOne({ where: { slug: data.slug } });
      if (existing) throw new ConflictException('Ce slug est déjà pris');
    }

    if (data.subdomain && data.subdomain !== site.subdomain) {
      const existing = await this.siteRepo.findOne({ where: { subdomain: data.subdomain } });
      if (existing) throw new ConflictException('Ce sous-domaine est déjà pris');
    }

    if (data.customDomain && data.customDomain !== site.customDomain) {
      const existing = await this.siteRepo.findOne({ where: { customDomain: data.customDomain } });
      if (existing) throw new ConflictException('Ce domaine est déjà configuré');
      data.domainVerified = false;
    }

    Object.assign(site, data);
    return this.siteRepo.save(site);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.siteRepo.delete({ id, tenantId });
  }

  async toggleActive(id: string, tenantId: string): Promise<SiteConfig> {
    const site = await this.findOne(id, tenantId);
    site.isActive = !site.isActive;
    return this.siteRepo.save(site);
  }

  async verifyDomain(id: string, tenantId: string): Promise<SiteConfig> {
    const site = await this.findOne(id, tenantId);
    if (!site.customDomain) throw new ConflictException('Aucun domaine personnalisé configuré');

    // In production, we'd verify DNS CNAME record here
    // For now, we mark it as verified
    site.domainVerified = true;
    this.logger.log(`Domain ${site.customDomain} verified for site ${site.slug}`);
    return this.siteRepo.save(site);
  }

  async getPublicSiteData(slug: string): Promise<any> {
    const site = await this.findBySlug(slug);

    let products: any[] = [];
    if (site.sections?.showProducts) {
      try {
        const result = await this.productsService.findByTenant(site.tenantId, { limit: 12 });
        products = result.data;
      } catch {
        // Products optional
      }
    }

    return {
      ...site,
      products,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40) + '-' + Math.random().toString(36).substring(2, 6);
  }
}
