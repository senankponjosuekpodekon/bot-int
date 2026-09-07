import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelsController } from './channels.controller';
import { ChannelsWebhookController } from './channels-webhook.controller';
import { ChannelAdapterService } from './channel-adapter.service';
import { ChatModule } from '../chat/chat.module';
import { AgentsModule } from '../agents/agents.module';
import { BillingModule } from '../billing/billing.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { Agent } from '../agents/agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent]),
    forwardRef(() => ChatModule),
    AgentsModule,
    BillingModule,
    WebhooksModule,
  ],
  controllers: [ChannelsController, ChannelsWebhookController],
  providers: [ChannelAdapterService],
  exports: [ChannelAdapterService],
})
export class ChannelsModule {}
