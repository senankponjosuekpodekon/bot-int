import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from './integration.entity';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { WebhooksController } from './webhooks.controller';
import { MediaParserService } from './media-parser.service';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { TelegramAdapter } from './telegram.adapter';
import { Agent } from '../agents/agent.entity';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([Integration, Agent]), forwardRef(() => ChatModule)],
  providers: [IntegrationsService, MediaParserService, WhatsAppAdapter, TelegramAdapter],
  controllers: [IntegrationsController, WebhooksController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
