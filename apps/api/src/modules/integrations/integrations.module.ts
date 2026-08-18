import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from './integration.entity';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { WebhooksController } from './webhooks.controller';
import { Agent } from '../agents/agent.entity';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([Integration, Agent]), forwardRef(() => ChatModule)],
  providers: [IntegrationsService],
  controllers: [IntegrationsController, WebhooksController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
