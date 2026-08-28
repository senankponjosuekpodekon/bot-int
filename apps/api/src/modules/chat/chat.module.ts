import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { AgentFeedback } from './agent-feedback.entity';
import { Agent } from '../agents/agent.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { WidgetController } from './widget.controller';
import { PublicController } from './public.controller';
import { AnalyticsController } from './analytics.controller';
import { ChatEventsService } from './chat-events.service';
import { ChatGateway } from './chat.gateway';
import { OllamaService } from './ollama.service';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LLMService } from './llm.service';
import { IntentService } from './intent.service';
import { FormService } from './form.service';
import { SummarizationService } from './summarization.service';
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
  imports: [TypeOrmModule.forFeature([Conversation, Message, AgentFeedback, Agent]), forwardRef(() => AgentsModule), forwardRef(() => LeadsModule), forwardRef(() => KnowledgeModule), forwardRef(() => ProductsModule), forwardRef(() => IntegrationsModule), forwardRef(() => FlowsModule), forwardRef(() => IntelligenceModule), forwardRef(() => BillingModule), forwardRef(() => RegionsModule), forwardRef(() => WebhooksModule)],
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
    IntentService,
    FormService,
    SummarizationService,
    OllamaService,
    OllamaProvider,
    ChatService,
    ChatEventsService,
    ChatGateway,
  ],
  controllers: [ChatController, WidgetController, PublicController, AnalyticsController],
  exports: [ChatService, ChatEventsService, OllamaService, LLMService, IntentService],
})
export class ChatModule {}
