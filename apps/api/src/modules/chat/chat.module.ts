import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OllamaService } from './ollama.service';
import { AgentsModule } from '../agents/agents.module';
import { LeadsModule } from '../leads/leads.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProductsModule } from '../products/products.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { FlowsModule } from '../flows/flows.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AgentsModule, LeadsModule, forwardRef(() => KnowledgeModule), ProductsModule, IntegrationsModule, FlowsModule, IntelligenceModule],
  providers: [ChatService, OllamaService],
  controllers: [ChatController],
  exports: [ChatService, OllamaService],
})
export class ChatModule {}
