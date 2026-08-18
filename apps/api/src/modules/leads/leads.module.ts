import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { LeadComment } from './lead-comment.entity';
import { LeadsService } from './leads.service';
import { LeadTagService } from './lead-tag.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, LeadComment])],
  providers: [LeadsService, LeadTagService],
  controllers: [LeadsController],
  exports: [LeadsService, LeadTagService],
})
export class LeadsModule {}
