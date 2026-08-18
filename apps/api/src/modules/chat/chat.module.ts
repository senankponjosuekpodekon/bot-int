import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { AgentFeedback } from './agent-feedback.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { OllamaService } from './ollama.service';
import { AgentsModule } from '../agents/agents.module';
import { LeadsModule } from '../leads/leads.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProductsModule } from '../products/products.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { FlowsModule } from '../flows/flows.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, AgentFeedback]), AgentsModule, LeadsModule, forwardRef(() => KnowledgeModule), ProductsModule, IntegrationsModule, FlowsModule, IntelligenceModule, BillingModule],
  providers: [ChatService, OllamaService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService, OllamaService],
})
export class ChatModule {}
