import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { Subscription } from './subscription.entity';
import { Conversation } from '../chat/conversation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Conversation])],
  providers: [BillingService],
  controllers: [BillingController, BillingWebhookController],
  exports: [BillingService],
})
export class BillingModule {}
