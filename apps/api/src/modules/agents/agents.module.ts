import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './agent.entity';
import { AgentMemory } from './agent-memory.entity';
import { AgentWorkflow } from './agent-workflow.entity';
import { AgentsService } from './agents.service';
import { AgentMemoryService } from './agent-memory.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentWorkflowService } from './agent-workflow.service';
import { AgentsController } from './agents.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, AgentMemory, AgentWorkflow]),
    forwardRef(() => ChatModule),
  ],
  providers: [AgentsService, AgentMemoryService, AgentToolsService, AgentWorkflowService],
  controllers: [AgentsController],
  exports: [AgentsService, AgentMemoryService, AgentToolsService, AgentWorkflowService],
})
export class AgentsModule {}
