import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('text')
  addText(@Request() req, @Body() body: { content: string; filename?: string }) {
    return this.knowledgeService.addText(req.user.tenantId, body.content, body.filename);
  }

  @Get()
  findAll(@Request() req) {
    return this.knowledgeService.findByTenant(req.user.tenantId);
  }

  @Get('search')
  search(@Request() req, @Query('q') query: string) {
    return this.knowledgeService.searchByText(req.user.tenantId, query);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.knowledgeService.delete(id, req.user.tenantId);
  }
}
