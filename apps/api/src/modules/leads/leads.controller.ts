import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, Request, UseGuards } from '@nestjs/common';
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

class ListLeadsDto {
  @IsEnum(LeadStatus) @IsOptional() status?: LeadStatus;
  @IsString() @IsOptional() tag?: string;
  @IsString() @IsOptional() search?: string;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page?: number;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() limit?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@Request() req, @Query() query: ListLeadsDto) {
    return this.leadsService.findByTenant(req.user.tenantId, query);
  }

  @Get('pipeline/stats')
  getPipelineStats(@Request() req) {
    return this.leadsService.getPipelineStats(req.user.tenantId);
  }

  @Get('export/csv')
  async exportCsv(@Request() req, @Res() res: Response) {
    const csv = await this.leadsService.exportCsv(req.user.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.leadsService.findById(id, req.user.tenantId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, req.user.tenantId, dto);
  }

  @Post(':id/tags')
  addTag(@Request() req, @Param('id') id: string, @Body() dto: TagDto) {
    return this.leadsService.addTag(id, req.user.tenantId, dto.tag);
  }

  @Delete(':id/tags/:tag')
  removeTag(@Request() req, @Param('id') id: string, @Param('tag') tag: string) {
    return this.leadsService.removeTag(id, req.user.tenantId, tag);
  }
}
