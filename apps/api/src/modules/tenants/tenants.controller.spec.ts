import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { UserRole } from '../auth/user.entity';

describe('TenantsController (tenant isolation)', () => {
  let controller: TenantsController;
  const tenantsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TenantsController(tenantsService as any);
  });

  it('findMe returns only the caller tenant', () => {
    tenantsService.findById.mockResolvedValue({ id: 't1' });
    expect(controller.findMe({ user: { tenantId: 't1' } })).resolves.toEqual({ id: 't1' });
    expect(tenantsService.findById).toHaveBeenCalledWith('t1');
  });

  it('updateMe scopes the update to the caller tenant', async () => {
    tenantsService.update.mockResolvedValue({ id: 't1', name: 'New' });
    await controller.updateMe({ user: { tenantId: 't1' } }, { name: 'New' });
    expect(tenantsService.update).toHaveBeenCalledWith('t1', { name: 'New' });
  });

  it('findOne allows reading own tenant', async () => {
    tenantsService.findById.mockResolvedValue({ id: 't1' });
    await expect(
      controller.findOne('t1', { user: { role: UserRole.ADMIN, tenantId: 't1' } }),
    ).resolves.toEqual({ id: 't1' });
  });

  it('findOne rejects cross-tenant access', () => {
    expect(() =>
      controller.findOne('t2', { user: { role: UserRole.ADMIN, tenantId: 't1' } }),
    ).toThrow(ForbiddenException);
    expect(tenantsService.findById).not.toHaveBeenCalled();
  });

  it.each([UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER])(
    'findOne rejects cross-tenant access for role %s',
    (role) => {
      expect(() =>
        controller.findOne('t2', { user: { role, tenantId: 't1' } }),
      ).toThrow(ForbiddenException);
    },
  );

  it('findOne lets SUPER_ADMIN read any tenant', async () => {
    tenantsService.findById.mockResolvedValue({ id: 't2' });
    await expect(
      controller.findOne('t2', { user: { role: UserRole.SUPER_ADMIN, tenantId: 't1' } }),
    ).resolves.toEqual({ id: 't2' });
  });
});
