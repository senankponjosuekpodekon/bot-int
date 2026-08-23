import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.tenantRepo.create(data);
    return this.tenantRepo.save(tenant);
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    await this.tenantRepo.update({ id }, data);
    return this.findById(id);
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { email } });
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find();
  }
}
