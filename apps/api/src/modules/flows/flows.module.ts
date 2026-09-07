import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatFlow } from './chat-flow.entity';
import { FlowExecution } from './flow-execution.entity';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';
import { FlowActionExecutor } from './flow-action-executor';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatFlow, FlowExecution]), WebhooksModule],
  providers: [FlowsService, FlowActionExecutor],
  controllers: [FlowsController],
  exports: [FlowsService],
})
export class FlowsModule {}
