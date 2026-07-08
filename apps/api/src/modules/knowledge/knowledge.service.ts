import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument, DocumentType } from './knowledge-document.entity';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly docRepo: Repository<KnowledgeDocument>,
  ) {}

  async addText(tenantId: string, content: string, filename?: string): Promise<KnowledgeDocument> {
    const doc = this.docRepo.create({
      tenantId,
      type: DocumentType.TEXT,
      content,
      filename,
    });
    return this.docRepo.save(doc);
  }

  async findByTenant(tenantId: string): Promise<KnowledgeDocument[]> {
    return this.docRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.docRepo.delete({ id, tenantId });
  }

  async searchByText(tenantId: string, query: string): Promise<KnowledgeDocument[]> {
    return this.docRepo
      .createQueryBuilder('doc')
      .where('doc.tenantId = :tenantId', { tenantId })
      .andWhere('doc.content ILIKE :query', { query: `%${query}%` })
      .limit(5)
      .getMany();
  }
}
