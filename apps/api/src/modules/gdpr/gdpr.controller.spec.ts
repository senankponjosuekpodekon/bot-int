import { Test } from '@nestjs/testing';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { Response } from 'express';

describe('GdprController', () => {
  let controller: GdprController;
  let gdprService: any;

  const mockRes: any = {
    setHeader: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(async () => {
    gdprService = {
      exportTenantData: jest.fn().mockResolvedValue({ tenantId: 't-1', users: [] }),
      deleteTenantData: jest.fn().mockResolvedValue({ deleted: true }),
      getAuditLog: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    const module = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [{ provide: GdprService, useValue: gdprService }],
    }).compile();

    controller = module.get<GdprController>(GdprController);
  });

  it('exports tenant data and sends JSON attachment', async () => {
    const user = { tenantId: 't-1' };
    await controller.exportData({ user } as any, mockRes as Response);

    expect(gdprService.exportTenantData).toHaveBeenCalledWith('t-1');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('requires DELETE confirmation for erasure', async () => {
    const user = { tenantId: 't-1', role: 'admin' };
    const result = await controller.deleteData({ user } as any, 'NO');

    expect(result).toEqual(expect.objectContaining({ error: expect.stringContaining('?confirm=DELETE') }));
    expect(gdprService.deleteTenantData).not.toHaveBeenCalled();
  });

  it('deletes tenant data when confirmed', async () => {
    const user = { tenantId: 't-1', role: 'admin' };
    const result = await controller.deleteData({ user } as any, 'DELETE');

    expect(gdprService.deleteTenantData).toHaveBeenCalledWith('t-1');
    expect(result).toEqual({ deleted: true });
  });

  it('lists audit log with defaults', async () => {
    const user = { tenantId: 't-1' };
    await controller.getAuditLog({ user } as any, 1, 20);

    expect(gdprService.getAuditLog).toHaveBeenCalledWith('t-1', 1, 20);
  });
});
