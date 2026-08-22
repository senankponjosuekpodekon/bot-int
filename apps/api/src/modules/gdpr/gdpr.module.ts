import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLog } from './audit-log.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/user.entity';
import { Agent } from '../agents/agent.entity';
import { Conversation } from '../chat/conversation.entity';
import { Message } from '../chat/message.entity';
import { Lead } from '../leads/lead.entity';
import { KnowledgeDocument } from '../knowledge/knowledge-document.entity';
import { Product } from '../products/product.entity';
import { Quote } from '../quotes/quote.entity';
import { AgentMemory } from '../agents/agent-memory.entity';
import { AgentWorkflow } from '../agents/agent-workflow.entity';
import { AgentFeedback } from '../chat/agent-feedback.entity';
import { Subscription } from '../billing/subscription.entity';
import { ApiKey } from '../billing/api-key.entity';
import { Integration } from '../integrations/integration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      User,
      Agent,
      Conversation,
      Message,
      Lead,
      KnowledgeDocument,
      Product,
      Quote,
      AgentMemory,
      AgentWorkflow,
      AgentFeedback,
      Subscription,
      ApiKey,
      Integration,
    ]),
    AuthModule,
  ],
  providers: [GdprService, AuditInterceptor],
  controllers: [GdprController],
  exports: [GdprService, AuditInterceptor],
})
export class GdprModule {}
