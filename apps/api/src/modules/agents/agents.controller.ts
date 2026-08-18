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
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { PaginationDto } from '../../common/pagination.dto';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
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

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent details' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.agentsService.findById(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent updated' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent deleted' })
  remove(@Request() req, @Param('id') id: string) {
    return this.agentsService.delete(id, req.user.tenantId);
  }
}
