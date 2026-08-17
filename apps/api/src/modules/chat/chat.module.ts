import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OllamaService } from './ollama.service';
import { AgentsModule } from '../agents/agents.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AgentsModule, LeadsModule],
  providers: [ChatService, OllamaService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
