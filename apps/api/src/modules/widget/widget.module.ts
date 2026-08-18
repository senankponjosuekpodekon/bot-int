import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Agent } from '../agents/agent.entity';
import { Conversation } from '../chat/conversation.entity';
import { Message } from '../chat/message.entity';
import { WidgetService } from './widget.service';
import { WidgetController } from './widget.controller';
import { ChatModule } from '../chat/chat.module';
import { FlowsModule } from '../flows/flows.module';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Conversation, Message]),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ChatModule,
    FlowsModule,
    SurveysModule,
  ],
  providers: [WidgetService],
  controllers: [WidgetController],
  exports: [WidgetService],
})
export class WidgetModule {}
