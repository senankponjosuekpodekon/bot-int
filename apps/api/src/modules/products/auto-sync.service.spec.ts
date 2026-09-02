import { AutoSyncService } from './auto-sync.service';
import { ProductImportSource } from './product-import-source.entity';
import { Integration } from '../integrations/integration.entity';
import { ProductsService } from './products.service';
import { Repository } from 'typeorm';

type RepositoryMock<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createRepositoryMock = <T>(): RepositoryMock<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  create: jest.fn(),
  remove: jest.fn(),
});

describe('AutoSyncService', () => {
  let service: AutoSyncService;
  let integrationRepo: RepositoryMock<Integration>;
  let sourceRepo: RepositoryMock<ProductImportSource>;
  let productsService: Partial<ProductsService>;

  beforeEach(() => {
    integrationRepo = createRepositoryMock<Integration>();
    sourceRepo = createRepositoryMock<ProductImportSource>();
    productsService = {
      syncFromStoredConfig: jest.fn().mockResolvedValue({ imported: 0, errors: 0 }),
      importFromSitemap: jest.fn().mockResolvedValue({ imported: 0, errors: 0, scanned: 0 }),
      importFromCsvUrl: jest.fn().mockResolvedValue({ imported: 0, errors: 0 }),
    };

    service = new AutoSyncService(
      integrationRepo as unknown as Repository<Integration>,
      sourceRepo as unknown as Repository<ProductImportSource>,
      productsService as unknown as ProductsService,
    );
  });

  it('syncTenant syncs enabled integrations and returns totals', async () => {
    integrationRepo.find!
      .mockResolvedValueOnce([{ id: 'i1', tenantId: 't1', type: 'shopify', enabled: true, config: {} } as Integration])
      .mockResolvedValueOnce([]);
    productsService.syncFromStoredConfig = jest.fn().mockResolvedValue({ imported: 3, errors: 1 });
    sourceRepo.find!
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.syncTenant('t1');
    expect(result).toEqual({ imported: 3, errors: 1 });
    expect(productsService.syncFromStoredConfig).toHaveBeenCalledWith('t1', expect.any(Object));
  });

  it('autoSyncSources skips sources that are not due yet', async () => {
    const now = Date.now();
    sourceRepo.find!.mockResolvedValue([
      {
        id: 's1',
        tenantId: 't1',
        source: 'sitemap',
        enabled: true,
        config: { sitemapUrl: 'https://example.com/sitemap.xml', maxPages: 10, frequencyMinutes: 60 },
        lastImportAt: new Date(now - 10 * 1000), // 10s ago
      } as any,
    ]);

    await service.autoSyncSources();
    expect(productsService.importFromSitemap).not.toHaveBeenCalled();
  });

  it('autoSyncSources runs sources that are due', async () => {
    const now = Date.now();
    sourceRepo.find!.mockResolvedValue([
      {
        id: 's2',
        tenantId: 't1',
        source: 'csv_url',
        enabled: true,
        config: { csvUrl: 'https://example.com/products.csv', format: 'generic', frequencyMinutes: 5 },
        lastImportAt: new Date(now - 6 * 60 * 1000), // 6 minutes ago
      } as any,
    ]);

    await service.autoSyncSources();
    expect(productsService.importFromCsvUrl).toHaveBeenCalledWith(
      't1',
      'https://example.com/products.csv',
      'generic',
      undefined,
      undefined,
    );
  });

  it('autoSyncSources syncs sources with no last import', async () => {
    sourceRepo.find!.mockResolvedValue([
      {
        id: 's3',
        tenantId: 't1',
        source: 'sitemap',
        enabled: true,
        config: { sitemapUrl: 'https://example.com/sitemap.xml', maxPages: 10 },
        lastImportAt: null,
      } as any,
    ]);

    await service.autoSyncSources();
    expect(productsService.importFromSitemap).toHaveBeenCalledWith(
      't1',
      'https://example.com/sitemap.xml',
      undefined,
      10,
    );
  });
});
