import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { KnowledgeDocument, DocumentType } from './knowledge-document.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';
import { LLMService } from '../chat/llm.service';
import { PaginatedResult } from '../../common/pagination.dto';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import axios from 'axios';
import puppeteer, { Browser } from 'puppeteer';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const MAX_SEARCH_RESULTS = 3;
const MAX_CRAWL_PAGES = 5;
const EMBEDDING_DIMS = 3072;

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  links: string[];
}

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private hasPgvector = false;

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly docRepo: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepo: Repository<KnowledgeChunk>,
    private readonly llmService: LLMService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const available = await this.dataSource.query<{ name: string }[]>(
        "SELECT name FROM pg_available_extensions WHERE name = 'vector'",
      );
      if (available.length === 0) {
        this.logger.warn('pgvector not available — falling back to JS cosine similarity');
        this.hasPgvector = false;
        return;
      }
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.dataSource.query(`ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(${EMBEDDING_DIMS})`);

      const indexType = EMBEDDING_DIMS > 2000 ? 'hnsw' : 'ivfflat';
      const indexOptions =
        EMBEDDING_DIMS > 2000
          ? 'WITH (m = 16, ef_construction = 64)'
          : 'WITH (lists = 100)';

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_vector
        ON knowledge_chunks USING ${indexType} (embedding_vector vector_cosine_ops)
        ${indexOptions}
      `);
      this.hasPgvector = true;
      this.logger.log('pgvector enabled — semantic search will use vector index');
    } catch (error: any) {
      this.logger.warn('pgvector setup failed — falling back to JS cosine similarity', error?.message);
      this.hasPgvector = false;
    }
  }

  async addText(tenantId: string, content: string, filename?: string): Promise<KnowledgeDocument> {
    const doc = this.docRepo.create({
      tenantId,
      type: DocumentType.TEXT,
      content,
      filename,
    });
    const saved = await this.docRepo.save(doc);
    await this.chunkAndEmbed(saved.id, tenantId, content);
    return saved;
  }

  async addPdf(tenantId: string, fileBuffer: Buffer, filename: string): Promise<KnowledgeDocument> {
    const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
    const result = await parser.getText();
    await parser.destroy();
    const content = (result.text || '').trim();
    if (!content) throw new Error('PDF vide ou illisible');

    const doc = this.docRepo.create({
      tenantId,
      type: DocumentType.PDF,
      content,
      filename,
    });
    const saved = await this.docRepo.save(doc);
    await this.chunkAndEmbed(saved.id, tenantId, content);
    return saved;
  }

  async addDocx(tenantId: string, fileBuffer: Buffer, filename: string): Promise<KnowledgeDocument> {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const content = (result.value || '').trim();
    if (!content) throw new Error('DOCX vide ou illisible');

    const doc = this.docRepo.create({
      tenantId,
      type: DocumentType.DOCX,
      content,
      filename,
    });
    const saved = await this.docRepo.save(doc);
    await this.chunkAndEmbed(saved.id, tenantId, content);
    return saved;
  }

  async addUrl(tenantId: string, url: string): Promise<KnowledgeDocument> {
    const baseUrl = new URL(url);
    const pages = await this.scrapeWithPuppeteer(url, baseUrl.origin, MAX_CRAWL_PAGES);

    if (pages.length === 0) throw new Error('Impossible de scraper la page');

    const combinedContent = pages
      .map((p) => `=== ${p.title} (${p.url}) ===\n${p.content}`)
      .join('\n\n');

    const doc = this.docRepo.create({
      tenantId,
      type: DocumentType.URL,
      content: combinedContent,
      sourceUrl: url,
      filename: baseUrl.hostname,
    });
    const saved = await this.docRepo.save(doc);
    await this.chunkAndEmbed(saved.id, tenantId, combinedContent);
    return saved;
  }

  async addUrlAsync(tenantId: string, url: string): Promise<{ docId: string; status: string }> {
    const baseUrl = new URL(url);
    const doc = this.docRepo.create({
      tenantId,
      type: DocumentType.URL,
      content: 'Import en cours...',
      sourceUrl: url,
      filename: baseUrl.hostname,
    });
    const saved = await this.docRepo.save(doc);

    this.processUrlAsync(saved.id, tenantId, url, baseUrl.origin);
    return { docId: saved.id, status: 'processing' };
  }

  private async processUrlAsync(docId: string, tenantId: string, url: string, origin: string): Promise<void> {
    try {
      const pages = await this.scrapeWithPuppeteer(url, origin, MAX_CRAWL_PAGES);
      if (pages.length === 0) {
        await this.docRepo.update(docId, { content: 'Erreur: impossible de scraper la page' });
        return;
      }
      const combinedContent = pages
        .map((p) => `=== ${p.title} (${p.url}) ===\n${p.content}`)
        .join('\n\n');
      await this.docRepo.update(docId, { content: combinedContent });
      await this.chunkAndEmbed(docId, tenantId, combinedContent);
      this.logger.log(`Async URL import completed for doc ${docId}`);
    } catch (err: any) {
      this.logger.error(`Async URL import failed for doc ${docId}: ${err?.message}`);
      await this.docRepo.update(docId, { content: `Erreur: ${err?.message}` });
    }
  }

  async searchCompany(tenantId: string, companyName: string): Promise<{
    name: string;
    website?: string;
    description?: string;
    socials: { platform: string; url: string }[];
    docs: KnowledgeDocument[];
  }> {
    const result = {
      name: companyName,
      website: undefined as string | undefined,
      description: undefined as string | undefined,
      socials: [] as { platform: string; url: string }[],
      docs: [] as KnowledgeDocument[],
    };

    const searchLinks = await this.webSearch(`${companyName} site officiel`);
    for (const link of searchLinks.slice(0, 5)) {
      if (!result.website && this.looksLikeOfficialSite(link.title, link.url, companyName)) {
        result.website = link.url;
      }
      const socialMatch = this.detectSocialNetwork(link.url);
      if (socialMatch && !result.socials.some((s) => s.url === link.url)) {
        result.socials.push(socialMatch);
      }
    }

    const socialLinks = await this.webSearch(`${companyName} linkedin facebook twitter instagram`);
    for (const link of socialLinks) {
      const socialMatch = this.detectSocialNetwork(link.url);
      if (socialMatch && !result.socials.some((s) => s.url === link.url)) {
        result.socials.push(socialMatch);
      }
    }

    if (result.website) {
      try {
        const pages = await this.scrapeWithPuppeteer(result.website, new URL(result.website).origin, 3);
        if (pages.length > 0) {
          result.description = pages[0].content.slice(0, 500);
          const combinedContent = pages
            .map((p) => `=== ${p.title} (${p.url}) ===\n${p.content}`)
            .join('\n\n');
          const doc = this.docRepo.create({
            tenantId,
            type: DocumentType.URL,
            content: combinedContent,
            sourceUrl: result.website,
            filename: `${companyName} (site officiel)`,
          });
          const saved = await this.docRepo.save(doc);
          await this.chunkAndEmbed(saved.id, tenantId, combinedContent);
          result.docs.push(saved);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to scrape company website: ${err?.message}`);
      }
    }

    for (const social of result.socials.slice(0, 2)) {
      try {
        const pages = await this.scrapeWithPuppeteer(social.url, new URL(social.url).origin, 1);
        if (pages.length > 0 && pages[0].content.length > 50) {
          const content = pages[0].content.slice(0, 5000);
          const doc = this.docRepo.create({
            tenantId,
            type: DocumentType.URL,
            content,
            sourceUrl: social.url,
            filename: `${companyName} (${social.platform})`,
          });
          const saved = await this.docRepo.save(doc);
          await this.chunkAndEmbed(saved.id, tenantId, content);
          result.docs.push(saved);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to scrape ${social.platform}: ${err?.message}`);
      }
    }

    return result;
  }

  private async webSearch(query: string): Promise<{ title: string; url: string }[]> {
    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`, { waitUntil: 'networkidle2', timeout: 20000 });
      await page.waitForSelector('body', { timeout: 5000 });
      await new Promise((r) => setTimeout(r, 2000));

      const links = await page.evaluate(() => {
        const results: { title: string; url: string }[] = [];
        document.querySelectorAll('article[data-testid="result"], .result, .web-result').forEach((el: any) => {
          const a = el.querySelector('a[data-testid="result-title-a"], a.result__a, h2 a');
          if (a) {
            const title = (a.textContent || '').trim();
            const href = a.href || a.getAttribute('href') || '';
            if (title && href) results.push({ title, url: href });
          }
        });
        if (results.length === 0) {
          document.querySelectorAll('a[href]').forEach((a: any) => {
            const href = a.href || '';
            const title = (a.textContent || '').trim();
            if (href && title && href.startsWith('http') && !href.includes('duckduckgo.com')) {
              results.push({ title, url: href });
            }
          });
        }
        return results;
      }) as { title: string; url: string }[];

      await page.close();
      return links.slice(0, 10);
    } catch (err: any) {
      this.logger.warn(`Web search failed: ${err?.message}`);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  private looksLikeOfficialSite(title: string, url: string, companyName: string): boolean {
    const lowerName = companyName.toLowerCase().replace(/\s+/g, '');
    const lowerUrl = url.toLowerCase();
    const lowerTitle = title.toLowerCase();
    if (lowerUrl.includes(lowerName) || lowerTitle.includes(companyName.toLowerCase())) return true;
    const tld = lowerUrl.match(/\/\/([^/]+)/);
    if (tld && tld[1].includes(lowerName.slice(0, 4))) return true;
    return false;
  }

  private detectSocialNetwork(url: string): { platform: string; url: string } | null {
    const lower = url.toLowerCase();
    if (lower.includes('linkedin.com/company/') || lower.includes('linkedin.com/in/')) return { platform: 'LinkedIn', url };
    if (lower.includes('facebook.com/')) return { platform: 'Facebook', url };
    if (lower.includes('twitter.com/') || lower.includes('x.com/')) return { platform: 'Twitter/X', url };
    if (lower.includes('instagram.com/')) return { platform: 'Instagram', url };
    if (lower.includes('youtube.com/') || lower.includes('youtu.be/')) return { platform: 'YouTube', url };
    return null;
  }

  private async scrapeWithPuppeteer(
    startUrl: string,
    origin: string,
    maxPages: number,
  ): Promise<ScrapedPage[]> {
    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    } catch (err: any) {
      this.logger.warn('Puppeteer failed to launch, falling back to axios', err?.message);
      return this.scrapeWithAxios(startUrl, origin, maxPages);
    }

    const visited = new Set<string>();
    const queue: string[] = [startUrl];
    const results: ScrapedPage[] = [];

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; BotInt/1.0)');

      while (queue.length > 0 && results.length < maxPages) {
        const currentUrl = queue.shift()!;
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          await page.waitForSelector('body', { timeout: 5000 });

          const pageData = await page.evaluate(() => {
            const title = (document as any).title || '';
            const body = (document as any).body.cloneNode(true) as any;
            body.querySelectorAll('script, style, nav, footer, header, iframe, noscript, svg').forEach((el: any) => el.remove());
            const content = (body.textContent || '').replace(/\s+/g, ' ').trim();
            const links = Array.from((document as any).querySelectorAll('a[href]'))
              .map((a: any) => a.href as string)
              .filter((href: string) => href.startsWith((window as any).location.origin));
            return { title, content, links };
          }) as { title: string; content: string; links: string[] };

          if (pageData.content && pageData.content.length >= 50) {
            results.push({
              url: currentUrl,
              title: pageData.title,
              content: pageData.content,
              links: pageData.links,
            });

            for (const link of pageData.links) {
              if (!visited.has(link) && queue.length < maxPages * 3) {
                queue.push(link);
              }
            }
          }
        } catch (err: any) {
          this.logger.warn(`Failed to scrape ${currentUrl}: ${err?.message}`);
        }
      }

      await page.close();
    } finally {
      await browser.close();
    }

    return results;
  }

  private async scrapeWithAxios(
    startUrl: string,
    origin: string,
    maxPages: number,
  ): Promise<ScrapedPage[]> {
    const visited = new Set<string>();
    const queue: string[] = [startUrl];
    const results: ScrapedPage[] = [];

    while (queue.length > 0 && results.length < maxPages) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const response = await axios.get(currentUrl, {
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BotInt/1.0)' },
          maxContentLength: 5 * 1024 * 1024,
        });
        const $ = cheerio.load(response.data);
        const title = $('title').text().trim();
        $('script, style, nav, footer, header, iframe, noscript, svg').remove();
        const content = $('body').text().replace(/\s+/g, ' ').trim();
        if (!content || content.length < 50) continue;

        const links: string[] = [];
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              const absolute = new URL(href, currentUrl).href;
              if (absolute.startsWith(origin)) links.push(absolute);
            } catch {}
          }
        });

        results.push({ url: currentUrl, title, content, links });
        for (const link of links) {
          if (!visited.has(link) && queue.length < maxPages * 3) queue.push(link);
        }
      } catch (err: any) {
        this.logger.warn(`axios scrape failed for ${currentUrl}: ${err?.message}`);
      }
    }

    return results;
  }

  async findByTenant(tenantId: string, page = 1, limit = 20): Promise<PaginatedResult<KnowledgeDocument>> {
    const [data, total] = await this.docRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.docRepo.delete({ id, tenantId });
  }

  async searchByText(tenantId: string, query: string): Promise<KnowledgeDocument[]> {
    if (!query.trim()) {
      return this.docRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 20 });
    }
    return this.docRepo
      .createQueryBuilder('doc')
      .where('doc.tenantId = :tenantId', { tenantId })
      .andWhere('doc.content ILIKE :query', { query: `%${query}%` })
      .limit(10)
      .getMany();
  }

  async searchRelevant(tenantId: string, query: string): Promise<string[]> {
    try {
      const queryEmbedding = await this.llmService.embed(query);

      if (this.hasPgvector) {
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        const results = await this.dataSource.query(
          `SELECT chunk.content
           FROM knowledge_chunks chunk
           INNER JOIN knowledge_documents doc ON chunk."documentId" = doc.id
           WHERE doc."tenantId" = $1
             AND chunk.embedding_vector IS NOT NULL
           ORDER BY chunk.embedding_vector <=> $2::vector
           LIMIT $3`,
          [tenantId, embeddingStr, MAX_SEARCH_RESULTS],
        );
        if (results.length > 0) return results.map((r: any) => r.content);
      }

      // Fallback: JS cosine similarity (loads chunks into memory)
      const chunks = await this.chunkRepo
        .createQueryBuilder('chunk')
        .innerJoin('chunk.document', 'doc')
        .where('doc.tenantId = :tenantId', { tenantId })
        .andWhere('chunk.embedding IS NOT NULL')
        .getMany();

      if (chunks.length === 0) return [];

      const scored = chunks
        .map((chunk) => {
          let embedding: number[] = [];
          try {
            embedding = JSON.parse(chunk.embedding);
          } catch {
            return { chunk, score: 0 };
          }
          return { chunk, score: this.cosineSimilarity(queryEmbedding, embedding) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SEARCH_RESULTS);

      return scored.map((s) => s.chunk.content);
    } catch (error: any) {
      this.logger.warn('Semantic search failed, falling back to text search', error?.message);
      const docs = await this.searchByText(tenantId, query);
      return docs.slice(0, MAX_SEARCH_RESULTS).map((d) => d.content);
    }
  }

  private async chunkAndEmbed(documentId: string, tenantId: string, content: string): Promise<void> {
    const chunks = this.splitIntoChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let i = 0; i < chunks.length; i++) {
      let embedding: string | null = null;
      let embeddingVec: string | null = null;
      try {
        const vec = await this.llmService.embed(chunks[i]);
        embedding = JSON.stringify(vec);
        embeddingVec = `[${vec.join(',')}]`;
      } catch (error: any) {
        this.logger.warn(`Embedding failed for chunk ${i} of doc ${documentId}`, error?.message);
      }

      const saved = await this.chunkRepo.save(
        this.chunkRepo.create({
          documentId,
          content: chunks[i],
          embedding,
          chunkIndex: i,
        }),
      );

      if (embeddingVec && this.hasPgvector) {
        try {
          await this.dataSource.query(
            `UPDATE knowledge_chunks SET embedding_vector = $1::vector WHERE id = $2`,
            [embeddingVec, saved.id],
          );
        } catch (err: any) {
          this.logger.warn(`Failed to set vector for chunk ${i}`, err?.message);
        }
      }
    }
  }

  private splitIntoChunks(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      chunks.push(text.slice(start, end));
      start += size - overlap;
      if (start >= text.length) break;
    }
    return chunks.length > 0 ? chunks : [text];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
