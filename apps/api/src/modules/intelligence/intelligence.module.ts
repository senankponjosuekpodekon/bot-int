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
import { Agent } from '../agents/agent.entity';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AgentsModule } from '../agents/agents.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Insight, ConversationAnalytics, PlatformInsight, Message, Conversation, Lead, Agent]),
    KnowledgeModule,
    AgentsModule,
    LeadsModule,
  ],
  providers: [IntelligenceService],
  controllers: [IntelligenceController],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
