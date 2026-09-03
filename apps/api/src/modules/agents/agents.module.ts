import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './agent.entity';
import { AgentMemory } from './agent-memory.entity';
import { AgentWorkflow } from './agent-workflow.entity';
import { PendingAction } from './pending-action.entity';
import { AgentsService } from './agents.service';
import { AgentMemoryService } from './agent-memory.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentWorkflowService } from './agent-workflow.service';
import { PendingActionService } from './pending-action.service';
import { AgentOrchestrationService } from './agent-orchestration.service';
import { AgentPolicyService } from './agent-policy.service';
import { AgentsController } from './agents.controller';
import { ChatModule } from '../chat/chat.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, AgentMemory, AgentWorkflow, PendingAction]),
    ProductsModule,
    forwardRef(() => ChatModule),
  ],
  providers: [AgentsService, AgentMemoryService, AgentToolsService, AgentWorkflowService, PendingActionService, AgentOrchestrationService, AgentPolicyService],
  controllers: [AgentsController],
  exports: [AgentsService, AgentMemoryService, AgentToolsService, AgentWorkflowService, PendingActionService, AgentOrchestrationService, AgentPolicyService],
})
export class AgentsModule {}
