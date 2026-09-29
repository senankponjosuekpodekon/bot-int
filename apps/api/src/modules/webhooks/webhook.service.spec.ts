import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookService } from './webhook.service';
import { WebhookEndpoint } from './webhook-endpoint.entity';
import { CryptoService } from '../../common/crypto.service';
import { QueueService } from '../queue/queue.service';
import { MetricsService } from '../../common/metrics.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let repo: any;
  let crypto: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'we-1' })),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ ...e, id: 'we-1', createdAt: new Date() })),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    crypto = {
      encrypt: jest.fn().mockImplementation((v: string) => `enc:${v}`),
      decrypt: jest.fn().mockImplementation((v: string) => v.replace('enc:', '')),
    };

    const module = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: getRepositoryToken(WebhookEndpoint), useValue: repo },
        { provide: CryptoService, useValue: crypto },
        { provide: QueueService, useValue: { addWebhook: jest.fn().mockResolvedValue({}) } },
        { provide: MetricsService, useValue: { incCounter: jest.fn(), setGauge: jest.fn(), observeDuration: jest.fn() } },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('creates a webhook endpoint scoped to tenant', async () => {
    const result = await service.create('t-1', 'https://example.com/hook', ['lead.created'], 'secret');

    expect(repo.create).toHaveBeenCalledWith({
      tenantId: 't-1',
      url: 'https://example.com/hook',
      events: ['lead.created'],
      secret: 'enc:secret',
    });
    expect(result).toEqual(expect.objectContaining({ id: 'we-1' }));
  });

  it('lists endpoints by tenant ordered by createdAt DESC', async () => {
    await service.findByTenant('t-1');
    expect(repo.find).toHaveBeenCalledWith({ where: { tenantId: 't-1' }, order: { createdAt: 'DESC' } });
  });

  it('updates only for the given tenant and id', async () => {
    repo.findOne.mockResolvedValue({ id: 'we-1', tenantId: 't-1' } as WebhookEndpoint);
    const result = await service.update('we-1', 't-1', { url: 'https://new.url' });

    expect(repo.update).toHaveBeenCalledWith({ id: 'we-1', tenantId: 't-1' }, { url: 'https://new.url' });
    expect(result).toEqual(expect.objectContaining({ id: 'we-1', tenantId: 't-1' }));
  });

  it('deletes by id and tenant', async () => {
    await service.delete('we-1', 't-1');
    expect(repo.delete).toHaveBeenCalledWith({ id: 'we-1', tenantId: 't-1' });
  });
});
