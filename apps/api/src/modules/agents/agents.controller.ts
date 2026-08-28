import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsArray } from 'class-validator';
import { AgentsService } from './agents.service';
import { AgentMemoryService } from './agent-memory.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentWorkflowService } from './agent-workflow.service';
import { PendingActionService } from './pending-action.service';
import { PendingActionStatus } from './pending-action.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/user.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { PaginationDto } from '../../common/pagination.dto';
import { MemoryScope } from './agent-memory.entity';

class RememberDto {
  @IsEnum(MemoryScope)
  scope: MemoryScope;

  @IsString()
  scopeId: string;

  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  importance?: number;
}

class RecallDto {
  @IsEnum(MemoryScope)
  scope: MemoryScope;

  @IsString()
  scopeId: string;

  @IsOptional()
  @IsArray()
  keys?: string[];
}

class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsArray()
  steps: any[];

  @IsOptional()
  @IsObject()
  trigger?: any;
}

class ExecuteWorkflowDto {
  @IsString()
  userMessage: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  visitorId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;
}

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly memoryService: AgentMemoryService,
    private readonly toolsService: AgentToolsService,
    private readonly workflowService: AgentWorkflowService,
    private readonly pendingActionService: PendingActionService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new AI agent' })
  @ApiResponse({ status: 201, description: 'Agent created' })
  create(@Request() req, @Body() dto: CreateAgentDto) {
    return this.agentsService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all agents (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of agents' })
  findAll(@Request() req, @Query() query: PaginationDto) {
    return this.agentsService.findByTenant(req.user.tenantId, query.page, query.limit);
  }

  // ─── Pending actions (WRITE/EXECUTE tool calls awaiting human approval) ───
  // Declared before the ':id' route below to avoid being shadowed by it.

  @Get('pending-actions')
  @ApiOperation({ summary: 'List pending actions awaiting human approval' })
  listPendingActions(@Request() req, @Query('status') status?: PendingActionStatus) {
    return this.pendingActionService.findByTenant(req.user.tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent details' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.agentsService.findById(id, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent updated' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent deleted' })
  remove(@Request() req, @Param('id') id: string) {
    return this.agentsService.delete(id, req.user.tenantId);
  }

  // ─── Memory endpoints ───

  @Post('memory/remember')
  @ApiOperation({ summary: 'Store a memory for a visitor/lead/tenant' })
  remember(@Request() req, @Body() dto: RememberDto) {
    return this.memoryService.remember(
      req.user.tenantId,
      dto.scope,
      dto.scopeId,
      dto.key,
      dto.value,
      dto.agentId,
      dto.importance,
    );
  }

  @Post('memory/recall')
  @ApiOperation({ summary: 'Recall memories for a visitor/lead/tenant' })
  recall(@Request() req, @Body() dto: RecallDto) {
    return this.memoryService.recall(req.user.tenantId, dto.scope, dto.scopeId, dto.keys);
  }

  @Delete('memory/:scope/:scopeId')
  @ApiOperation({ summary: 'Forget memories for a scope' })
  forget(@Request() req, @Param('scope') scope: MemoryScope, @Param('scopeId') scopeId: string, @Query('key') key?: string) {
    return this.memoryService.forget(req.user.tenantId, scope, scopeId, key);
  }

  // ─── Tools endpoints ───

  @Get('tools/list')
  @ApiOperation({ summary: 'List available agent tools' })
  listTools() {
    return this.toolsService.getAvailableTools();
  }

  // ─── Pending actions approve/reject ───

  @Post('pending-actions/:id/approve')
  @ApiOperation({ summary: 'Approve a pending action' })
  approvePendingAction(@Request() req, @Param('id') id: string) {
    return this.pendingActionService.approve(id, req.user.tenantId, req.user.id || req.user.sub);
  }

  @Post('pending-actions/:id/reject')
  @ApiOperation({ summary: 'Reject a pending action' })
  rejectPendingAction(@Request() req, @Param('id') id: string) {
    return this.pendingActionService.reject(id, req.user.tenantId, req.user.id || req.user.sub);
  }

  // ─── Workflow endpoints ───

  @Post('workflows')
  @ApiOperation({ summary: 'Create a workflow' })
  createWorkflow(@Request() req, @Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(req.user.tenantId, dto);
  }

  @Get('workflows')
  @ApiOperation({ summary: 'List workflows (paginated)' })
  listWorkflows(@Request() req, @Query() query: PaginationDto) {
    return this.workflowService.findByTenant(req.user.tenantId, query.page, query.limit);
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  getWorkflow(@Request() req, @Param('id') id: string) {
    return this.workflowService.findById(id, req.user.tenantId);
  }

  @Patch('workflows/:id')
  @ApiOperation({ summary: 'Update workflow' })
  updateWorkflow(@Request() req, @Param('id') id: string, @Body() dto: Partial<CreateWorkflowDto>) {
    return this.workflowService.update(id, req.user.tenantId, dto);
  }

  @Delete('workflows/:id')
  @ApiOperation({ summary: 'Delete workflow' })
  deleteWorkflow(@Request() req, @Param('id') id: string) {
    return this.workflowService.delete(id, req.user.tenantId);
  }

  @Post('workflows/:id/execute')
  @ApiOperation({ summary: 'Execute a workflow' })
  executeWorkflow(@Request() req, @Param('id') id: string, @Body() dto: ExecuteWorkflowDto) {
    return this.workflowService.execute(id, {
      tenantId: req.user.tenantId,
      agentId: req.user.tenantId,
      conversationId: dto.conversationId,
      visitorId: dto.visitorId,
      leadId: dto.leadId,
      userMessage: dto.userMessage,
      variables: {},
    });
  }
}
