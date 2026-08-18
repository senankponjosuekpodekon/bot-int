import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeDocument } from './knowledge-document.entity';
import { KnowledgeChunk } from './knowledge-chunk.entity';
import { KnowledgeService } from './knowledge.service';
import { SiteScraperService } from './site-scraper.service';
import { KnowledgeController } from './knowledge.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeChunk]), forwardRef(() => ChatModule)],
  providers: [KnowledgeService, SiteScraperService],
  controllers: [KnowledgeController],
  exports: [KnowledgeService, SiteScraperService],
})
export class KnowledgeModule {}
