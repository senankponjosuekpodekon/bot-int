import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Insight } from './insight.entity';
import { ConversationAnalytics } from './conversation-analytics.entity';
import { PlatformInsight } from './platform-insight.entity';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { Message } from '../chat/message.entity';
import { Conversation } from '../chat/conversation.entity';
import { Lead } from '../leads/lead.entity';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Insight, ConversationAnalytics, PlatformInsight, Message, Conversation, Lead]),
    KnowledgeModule,
  ],
  providers: [IntelligenceService],
  controllers: [IntelligenceController],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
