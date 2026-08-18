import { Body, Controller, Delete, Get, Param, Patch, Post, Res, Request, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsObject } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';
import * as fs from 'fs';

class QuoteItemDto {
  @IsString() @IsOptional() productId?: string;
  @IsString() @IsNotEmpty() description: string;
  @IsNumber() quantity: number;
  @IsNumber() unitPrice: number;
}

class CreateQuoteDto {
  @IsString() @IsOptional() leadId?: string;
  @IsString() @IsNotEmpty() customerName: string;
  @IsString() @IsOptional() customerEmail?: string;
  @IsString() @IsOptional() customerPhone?: string;
  @IsString() @IsOptional() customerCompany?: string;
  @IsArray() items: QuoteItemDto[];
  @IsNumber() @IsOptional() taxRate?: number;
  @IsString() @IsOptional() notes?: string;
  @IsNumber() @IsOptional() validDays?: number;
}

class CreateFromFlowDto {
  @IsString() @IsNotEmpty() leadId: string;
  @IsObject() responses: Record<string, string>;
}

class UpdateStatusDto {
  @IsString() @IsNotEmpty() status: string;
}

@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'List all quotes' })
  @ApiResponse({ status: 200, description: 'List of quotes' })
  findAll(@Request() req) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote by ID' })
  @ApiResponse({ status: 200, description: 'Quote details' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findById(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'Quote created' })
  create(@Request() req, @Body() dto: CreateQuoteDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Post('from-flow')
  @ApiOperation({ summary: 'Create quote from flow responses' })
  @ApiResponse({ status: 201, description: 'Quote created from flow' })
  createFromFlow(@Request() req, @Body() dto: CreateFromFlowDto) {
    return this.service.createFromFlow(req.user.tenantId, dto.leadId, dto.responses);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update quote status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, req.user.tenantId, dto.status as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete quote by ID' })
  @ApiResponse({ status: 200, description: 'Quote deleted' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.delete(id, req.user.tenantId);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download quote as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  async downloadPdf(@Request() req, @Param('id') id: string, @Res() res: Response) {
    const quote = await this.service.findById(id, req.user.tenantId);
    if (!quote.pdfPath || !fs.existsSync(quote.pdfPath)) {
      await this.service.generatePdf(quote);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.quoteNumber}.pdf"`);
    fs.createReadStream(quote.pdfPath).pipe(res);
  }
}
