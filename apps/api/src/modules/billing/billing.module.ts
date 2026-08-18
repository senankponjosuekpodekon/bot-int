import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { McpController } from './mcp.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyGuard } from './api-key.guard';
import { Subscription } from './subscription.entity';
import { ApiKey } from './api-key.entity';
import { Conversation } from '../chat/conversation.entity';
import { AgentsModule } from '../agents/agents.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, ApiKey, Conversation]),
    AgentsModule,
    forwardRef(() => ChatModule),
  ],
  providers: [BillingService, ApiKeyService, ApiKeyGuard],
  controllers: [BillingController, BillingWebhookController, ApiKeyController, McpController],
  exports: [BillingService, ApiKeyService, ApiKeyGuard],
})
export class BillingModule {}
