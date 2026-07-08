import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(@Request() req, @Body() body: any) {
    return this.agentsService.create(req.user.tenantId, body);
  }

  @Get()
  findAll(@Request() req) {
    return this.agentsService.findByTenant(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.agentsService.findById(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.agentsService.update(id, req.user.tenantId, body);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.agentsService.delete(id, req.user.tenantId);
  }
}
