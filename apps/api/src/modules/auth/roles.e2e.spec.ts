import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './guards/roles.guard';
import { AgentsController } from '../agents/agents.controller';
import { LeadsController } from '../leads/leads.controller';
import { TenantsController } from '../tenants/tenants.controller';
import { UserRole } from './user.entity';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER];

function contextFor(handler: any) {
  return { getHandler: () => handler, getClass: () => null } as any;
}

function requestWith(role: UserRole) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role, tenantId: 't1', id: 'u1' } }) }),
    getHandler: contextFor(() => null).getHandler,
  };
}

describe('RolesGuard per-role access', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  function allowed(handler: object, method: string, role: UserRole): boolean {
    const ctx = {
      getHandler: () => (handler as any)[method],
      getClass: () => handler.constructor,
      switchToHttp: () => ({ getRequest: () => ({ user: { role, tenantId: 't1', id: 'u1' } }) }),
    } as any;
    try {
      return guard.canActivate(ctx) as boolean;
    } catch {
      return false;
    }
  }

  const agents = new AgentsController({} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const leads = new LeadsController({} as any);
  const tenants = new TenantsController({} as any);

  it.each(ALL_ROLES)('agents.create allows only ADMIN/MANAGER — role %s', (role) => {
    const ok = role === UserRole.ADMIN || role === UserRole.MANAGER;
    expect(allowed(agents, 'create', role)).toBe(ok);
  });

  it.each(ALL_ROLES)('agents.update allows only ADMIN/MANAGER — role %s', (role) => {
    const ok = role === UserRole.ADMIN || role === UserRole.MANAGER;
    expect(allowed(agents, 'update', role)).toBe(ok);
  });

  it.each(ALL_ROLES)('agents.remove allows only ADMIN — role %s', (role) => {
    expect(allowed(agents, 'remove', role)).toBe(role === UserRole.ADMIN);
  });

  it.each(ALL_ROLES)('agents.findAll allows every tenant role — role %s', (role) => {
    expect(allowed(agents, 'findAll', role)).toBe(true);
  });

  it.each(ALL_ROLES)('leads.create allows ADMIN/MANAGER/OPERATOR — role %s', (role) => {
    expect(allowed(leads, 'create', role)).toBe(role !== UserRole.VIEWER);
  });

  it.each(ALL_ROLES)('leads.exportCsv allows only ADMIN/MANAGER — role %s', (role) => {
    const ok = role === UserRole.ADMIN || role === UserRole.MANAGER;
    expect(allowed(leads, 'exportCsv', role)).toBe(ok);
  });

  it.each(ALL_ROLES)('tenants.findAll allows only SUPER_ADMIN — role %s', (role) => {
    expect(allowed(tenants, 'findAll', role)).toBe(false);
  });

  it('tenants.findAll allows SUPER_ADMIN', () => {
    expect(allowed(tenants, 'findAll', UserRole.SUPER_ADMIN)).toBe(true);
  });
});

describe('AgentsController operator scoping', () => {
  const agentsService = { findById: jest.fn(), findByTenant: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
  let controller: AgentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AgentsController(agentsService as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  });

  it('OPERATOR cannot read an agent assigned to someone else', async () => {
    agentsService.findById.mockResolvedValue({ id: 'a1', operatorId: 'other-user' });
    await expect(
      controller.findOne({ user: { role: UserRole.OPERATOR, tenantId: 't1', id: 'u1' } }, 'a1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('OPERATOR can read an agent assigned to them', async () => {
    agentsService.findById.mockResolvedValue({ id: 'a1', operatorId: 'u1' });
    await expect(
      controller.findOne({ user: { role: UserRole.OPERATOR, tenantId: 't1', id: 'u1' } }, 'a1'),
    ).resolves.toEqual({ id: 'a1', operatorId: 'u1' });
  });

  it('ADMIN can read any agent in tenant', async () => {
    agentsService.findById.mockResolvedValue({ id: 'a1', operatorId: 'other-user' });
    await expect(
      controller.findOne({ user: { role: UserRole.ADMIN, tenantId: 't1', id: 'u1' } }, 'a1'),
    ).resolves.toEqual({ id: 'a1', operatorId: 'other-user' });
  });
});
