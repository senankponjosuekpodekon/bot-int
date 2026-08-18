import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { KnowledgeService } from '../knowledge/knowledge.service';

export interface ScrapedInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
  hours: string[];
  faqs: { question: string; answer: string }[];
  aboutText: string;
  services: string[];
  socialLinks: string[];
  title: string;
  description: string;
}

@Injectable()
export class SiteScraperService {
  private readonly logger = new Logger(SiteScraperService.name);

  constructor(private readonly knowledgeService: KnowledgeService) {}

  async scrapeSite(
    tenantId: string,
    siteUrl: string,
  ): Promise<{ scraped: ScrapedInfo; knowledgeEntries: number }> {
    this.logger.log(`Scraping site: ${siteUrl}`);

    const baseUrl = new URL(siteUrl);
    const rootUrl = `${baseUrl.protocol}//${baseUrl.host}`;

    // Scrape homepage
    const homeInfo = await this.scrapePage(siteUrl);

    // Try to find and scrape common pages
    const commonPaths = ['/contact', '/about', '/faq', '/services', '/mentions-legales', '/cgv', '/politique-de-retour'];
    const allInfo: ScrapedInfo = {
      emails: [...homeInfo.emails],
      phones: [...homeInfo.phones],
      addresses: [...homeInfo.addresses],
      hours: [...homeInfo.hours],
      faqs: [...homeInfo.faqs],
      aboutText: homeInfo.aboutText,
      services: [...homeInfo.services],
      socialLinks: [...homeInfo.socialLinks],
      title: homeInfo.title,
      description: homeInfo.description,
    };

    // Find internal links from homepage
    const internalLinks = await this.findInternalLinks(siteUrl, rootUrl);
    const pagesToScrape = [...commonPaths, ...internalLinks]
      .filter((path, i, arr) => arr.indexOf(path) === i)
      .slice(0, 10);

    for (const path of pagesToScrape) {
      try {
        const url = path.startsWith('http') ? path : `${rootUrl}${path}`;
        const pageInfo = await this.scrapePage(url);
        allInfo.emails = [...new Set([...allInfo.emails, ...pageInfo.emails])];
        allInfo.phones = [...new Set([...allInfo.phones, ...pageInfo.phones])];
        allInfo.addresses = [...new Set([...allInfo.addresses, ...pageInfo.addresses])];
        allInfo.hours = [...new Set([...allInfo.hours, ...pageInfo.hours])];
        allInfo.faqs = [...allInfo.faqs, ...pageInfo.faqs];
        if (pageInfo.aboutText && !allInfo.aboutText) allInfo.aboutText = pageInfo.aboutText;
        allInfo.services = [...new Set([...allInfo.services, ...pageInfo.services])];
        allInfo.socialLinks = [...new Set([...allInfo.socialLinks, ...pageInfo.socialLinks])];
      } catch {
        // Skip failed pages
      }
    }

    // Create knowledge entries from scraped data
    let knowledgeEntries = 0;
    knowledgeEntries += await this.createKnowledgeFromScraped(tenantId, allInfo);

    return { scraped: allInfo, knowledgeEntries };
  }

  private async scrapePage(url: string): Promise<ScrapedInfo> {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StiamondBot/1.0)' },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    const text = $('body').text() || '';
    const title = $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content') || '';

    // Extract emails
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
    const emails = [...new Set(text.match(emailRegex) || [])].filter(
      (e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.css') && !e.endsWith('.js'),
    );

    // Extract phones (French formats)
    const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
    const phones = [...new Set(text.match(phoneRegex) || [])];

    // Extract addresses (look for common patterns)
    const addresses: string[] = [];
    $('[itemtype*="PostalAddress"], .address, .contact-address, address').each((_, el) => {
      const addr = $(el).text().trim().replace(/\s+/g, ' ');
      if (addr && addr.length > 10) addresses.push(addr);
    });

    // Extract business hours
    const hours: string[] = [];
    $('.hours, .opening-hours, .business-hours, [itemprop="openingHours"], time').each((_, el) => {
      const h = $(el).text().trim().replace(/\s+/g, ' ');
      if (h && h.length > 3 && h.length < 200) hours.push(h);
    });

    // Extract FAQ
    const faqs: { question: string; answer: string }[] = [];
    $('.faq, .faq-item, .accordion-item, details').each((_, el) => {
      const $el = $(el);
      const question = $el.find('.faq-question, .question, summary, h3, h4').first().text().trim();
      const answer = $el.find('.faq-answer, .answer, p, .content').first().text().trim();
      if (question && answer && question.length > 5) {
        faqs.push({ question, answer: answer.slice(0, 500) });
      }
    });

    // Extract about text
    let aboutText = '';
    $('.about, #about, [itemprop="description"], .company-description').each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, ' ');
      if (t.length > aboutText.length) aboutText = t.slice(0, 1000);
    });

    // Extract services
    const services: string[] = [];
    $('.services .service-item h3, .services .service-item h4, .service-title, [itemprop="offers"] h3').each((_, el) => {
      const s = $(el).text().trim();
      if (s && s.length > 3) services.push(s);
    });

    // Extract social links
    const socialLinks: string[] = [];
    $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"], a[href*="youtube.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.push(href);
    });

    return {
      emails,
      phones,
      addresses,
      hours,
      faqs,
      aboutText,
      services,
      socialLinks: [...new Set(socialLinks)],
      title,
      description,
    };
  }

  private async findInternalLinks(pageUrl: string, rootUrl: string): Promise<string[]> {
    try {
      const response = await axios.get(pageUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StiamondBot/1.0)' },
      });
      const $ = cheerio.load(response.data);
      const links: string[] = [];

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        if (href.startsWith('/') && !href.startsWith('//')) {
          links.push(href);
        } else if (href.startsWith(rootUrl)) {
          links.push(href.replace(rootUrl, ''));
        }
      });

      return [...new Set(links)].slice(0, 15);
    } catch {
      return [];
    }
  }

  private async createKnowledgeFromScraped(tenantId: string, info: ScrapedInfo): Promise<number> {
    let count = 0;

    // Contact info
    const contactParts: string[] = [];
    if (info.emails.length > 0) contactParts.push(`Email: ${info.emails.join(', ')}`);
    if (info.phones.length > 0) contactParts.push(`Téléphone: ${info.phones.join(', ')}`);
    if (info.addresses.length > 0) contactParts.push(`Adresse: ${info.addresses.join(', ')}`);
    if (info.socialLinks.length > 0) contactParts.push(`Réseaux sociaux: ${info.socialLinks.join(', ')}`);
    if (contactParts.length > 0) {
      await this.knowledgeService.addText(tenantId, contactParts.join('\n'), 'Informations de contact');
      count++;
    }

    // Business hours
    if (info.hours.length > 0) {
      await this.knowledgeService.addText(tenantId, info.hours.join('\n'), "Horaires d'ouverture");
      count++;
    }

    // About / company description
    if (info.aboutText) {
      await this.knowledgeService.addText(tenantId, info.aboutText, 'À propos de l\'entreprise');
      count++;
    }

    // Site description
    if (info.description) {
      await this.knowledgeService.addText(tenantId, info.description, 'Description de l\'entreprise');
      count++;
    }

    // FAQ entries
    for (const faq of info.faqs.slice(0, 20)) {
      await this.knowledgeService.addText(tenantId, `Q: ${faq.question}\nR: ${faq.answer}`, faq.question);
      count++;
    }

    // Services
    if (info.services.length > 0) {
      await this.knowledgeService.addText(tenantId, info.services.join('\n'), 'Services proposés');
      count++;
    }

    this.logger.log(`Created ${count} knowledge entries from scraped site`);
    return count;
  }
}
