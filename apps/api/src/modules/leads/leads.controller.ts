import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Type } from 'class-transformer';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from './lead.entity';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';

class TagDto {
  @IsString() @IsNotEmpty() tag: string;
}

class CommentDto {
  @IsString() @IsNotEmpty() content: string;
}

class ListLeadsDto {
  @IsEnum(LeadStatus) @IsOptional() status?: LeadStatus;
  @IsString() @IsOptional() tag?: string;
  @IsString() @IsOptional() search?: string;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page?: number;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() limit?: number;
}

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads (paginated, filterable)' })
  @ApiResponse({ status: 200, description: 'Paginated list of leads' })
  findAll(@Request() req, @Query() query: ListLeadsDto) {
    return this.leadsService.findByTenant(req.user.tenantId, query);
  }

  @Get('pipeline/stats')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  @ApiResponse({ status: 200, description: 'Pipeline stats by status' })
  getPipelineStats(@Request() req) {
    return this.leadsService.getPipelineStats(req.user.tenantId);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export leads as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(@Request() req, @Res() res: Response) {
    const csv = await this.leadsService.exportCsv(req.user.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.leadsService.findById(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  create(@Request() req, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, req.user.tenantId, dto);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tag to lead' })
  @ApiResponse({ status: 200, description: 'Tag added' })
  addTag(@Request() req, @Param('id') id: string, @Body() dto: TagDto) {
    return this.leadsService.addTag(id, req.user.tenantId, dto.tag);
  }

  @Delete(':id/tags/:tag')
  @ApiOperation({ summary: 'Remove tag from lead' })
  @ApiResponse({ status: 200, description: 'Tag removed' })
  removeTag(@Request() req, @Param('id') id: string, @Param('tag') tag: string) {
    return this.leadsService.removeTag(id, req.user.tenantId, tag);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get lead comments' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  getComments(@Request() req, @Param('id') id: string) {
    return this.leadsService.getComments(id, req.user.tenantId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to lead' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  addComment(@Request() req, @Param('id') id: string, @Body() dto: CommentDto) {
    return this.leadsService.addComment(
      id,
      req.user.tenantId,
      req.user.id,
      req.user.email || req.user.name || 'User',
      dto.content,
    );
  }

  @Delete(':id/comments/:commentId')
  @ApiOperation({ summary: 'Delete lead comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  deleteComment(@Request() req, @Param('commentId') commentId: string) {
    return this.leadsService.deleteComment(commentId, req.user.tenantId);
  }
}
