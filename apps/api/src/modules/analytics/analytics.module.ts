import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../chat/conversation.entity';
import { Message } from '../chat/message.entity';
import { Lead } from '../leads/lead.entity';
import { Product } from '../products/product.entity';
import { Agent } from '../agents/agent.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Lead, Product, Agent])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
