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
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { PaginationDto } from '../../common/pagination.dto';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateAgentDto) {
    return this.agentsService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req, @Query() query: PaginationDto) {
    return this.agentsService.findByTenant(req.user.tenantId, query.page, query.limit);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.agentsService.findById(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.agentsService.delete(id, req.user.tenantId);
  }
}
