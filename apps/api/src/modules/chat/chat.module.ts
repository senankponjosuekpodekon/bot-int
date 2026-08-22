import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { AgentFeedback } from './agent-feedback.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { OllamaService } from './ollama.service';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LLMService } from './llm.service';
import { LLM_PROVIDER } from './llm-provider.interface';
import { AgentsModule } from '../agents/agents.module';
import { LeadsModule } from '../leads/leads.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProductsModule } from '../products/products.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { FlowsModule } from '../flows/flows.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { BillingModule } from '../billing/billing.module';
import { RegionsModule } from '../regions/regions.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, AgentFeedback]), forwardRef(() => AgentsModule), forwardRef(() => LeadsModule), forwardRef(() => KnowledgeModule), forwardRef(() => ProductsModule), forwardRef(() => IntegrationsModule), forwardRef(() => FlowsModule), forwardRef(() => IntelligenceModule), forwardRef(() => BillingModule), forwardRef(() => RegionsModule), forwardRef(() => WebhooksModule)],
  providers: [
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('LLM_PROVIDER', 'ollama');
        if (provider === 'openai') {
          return new OpenAIProvider(config);
        }
        return new OllamaProvider(config);
      },
    },
    LLMService,
    OllamaService,
    OllamaProvider,
    ChatService,
    ChatGateway,
  ],
  controllers: [ChatController],
  exports: [ChatService, OllamaService, LLMService],
})
export class ChatModule {}
