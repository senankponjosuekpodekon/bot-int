import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';

class SearchQueryDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  q?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('text')
  addText(@Request() req, @Body() dto: CreateTextDocumentDto) {
    return this.knowledgeService.addText(req.user.tenantId, dto.content, dto.filename);
  }

  @Get()
  findAll(@Request() req) {
    return this.knowledgeService.findByTenant(req.user.tenantId);
  }

  @Get('search')
  search(@Request() req, @Query() query: SearchQueryDto) {
    return this.knowledgeService.searchByText(req.user.tenantId, query.q || '');
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.knowledgeService.delete(id, req.user.tenantId);
  }
}
