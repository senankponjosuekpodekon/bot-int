import { Module, forwardRef } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChatModule } from '../chat/chat.module';
import { AgentsModule } from '../agents/agents.module';
import { BillingModule } from '../billing/billing.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    forwardRef(() => ChatModule),
    AgentsModule,
    BillingModule,
    WebhooksModule,
  ],
  controllers: [ChannelsController],
})
export class ChannelsModule {}
