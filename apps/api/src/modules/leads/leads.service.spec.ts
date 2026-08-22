import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { LeadsService } from './leads.service';
import { Lead, LeadStatus } from './lead.entity';

type RepositoryMock<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

import { LeadComment } from './lead-comment.entity';

const createRepositoryMock = <T extends ObjectLiteral>(): RepositoryMock<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('LeadsService', () => {
  let service: LeadsService;
  let leadRepo: RepositoryMock<Lead>;
  let commentRepo: RepositoryMock<LeadComment>;

  beforeEach(() => {
    leadRepo = createRepositoryMock<Lead>();
    commentRepo = createRepositoryMock<LeadComment>();
    service = new LeadsService(
      leadRepo as unknown as Repository<Lead>,
      commentRepo as unknown as Repository<LeadComment>,
    );
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a lead scoped to the tenant', async () => {
      const created = { id: 'lead-1', tenantId: 't-1', status: LeadStatus.NEW } as Lead;
      leadRepo.create?.mockReturnValue(created);
      leadRepo.save?.mockResolvedValue(created);

      const result = await service.create('t-1', { email: 'ceo@acme.io' });

      expect(leadRepo.create).toHaveBeenCalledWith({ email: 'ceo@acme.io', tenantId: 't-1' });
      expect(result).toBe(created);
    });
  });

  describe('findByTenant', () => {
    it('lists leads ordered by creation date desc', async () => {
      const leads = [{ id: 'lead-1' }] as Lead[];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([leads, 1]),
      };
      leadRepo.createQueryBuilder?.mockReturnValue(queryBuilder);

      const result = await service.findByTenant('t-1');

      expect(result.data).toBe(leads);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(leadRepo.createQueryBuilder).toHaveBeenCalledWith('lead');
      expect(queryBuilder.where).toHaveBeenCalledWith('lead.tenantId = :tenantId', { tenantId: 't-1' });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('lead.createdAt', 'DESC');
    });
  });

  describe('findById', () => {
    it('returns a lead for the tenant', async () => {
      const lead = { id: 'lead-1', tenantId: 't-1' } as Lead;
      leadRepo.findOne?.mockResolvedValue(lead);

      const result = await service.findById('lead-1', 't-1');

      expect(result).toBe(lead);
      expect(leadRepo.findOne).toHaveBeenCalledWith({ where: { id: 'lead-1', tenantId: 't-1' } });
    });

    it('throws NotFoundException if lead is missing', async () => {
      leadRepo.findOne?.mockResolvedValue(null);

      await expect(service.findById('missing', 't-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('updates the lead status and returns the lead', async () => {
      const lead = { id: 'lead-1', tenantId: 't-1', status: LeadStatus.CONTACTED } as Lead;
      leadRepo.update?.mockResolvedValue(undefined);
      leadRepo.findOne?.mockResolvedValue(lead);

      const result = await service.updateStatus('lead-1', 't-1', LeadStatus.CONTACTED);

      expect(leadRepo.update).toHaveBeenCalledWith({ id: 'lead-1', tenantId: 't-1' }, { status: LeadStatus.CONTACTED });
      expect(result).toBe(lead);
    });
  });

  describe('update', () => {
    it('updates arbitrary lead fields within the tenant', async () => {
      const lead = { id: 'lead-1', tenantId: 't-1', name: 'Acme' } as Lead;
      leadRepo.update?.mockResolvedValue(undefined);
      leadRepo.findOne?.mockResolvedValue(lead);

      const result = await service.update('lead-1', 't-1', { name: 'Acme Inc.' });

      expect(leadRepo.update).toHaveBeenCalledWith({ id: 'lead-1', tenantId: 't-1' }, { name: 'Acme Inc.' });
      expect(result).toBe(lead);
    });
  });
});
