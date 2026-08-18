import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';

class SearchQueryDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  q?: string;
}

class ImportUrlDto {
  @IsString()
  @IsUrl()
  url: string;
}

class SearchCompanyDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;
}

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('text')
  addText(@Request() req, @Body() dto: CreateTextDocumentDto) {
    return this.knowledgeService.addText(req.user.tenantId, dto.content, dto.filename);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFile(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf');
    if (!isPdf) {
      const content = file.buffer.toString('utf-8');
      return this.knowledgeService.addText(req.user.tenantId, content, file.originalname);
    }
    return this.knowledgeService.addPdf(req.user.tenantId, file.buffer, file.originalname);
  }

  @Post('url')
  importUrl(@Request() req, @Body() dto: ImportUrlDto) {
    return this.knowledgeService.addUrl(req.user.tenantId, dto.url);
  }

  @Post('url-async')
  importUrlAsync(@Request() req, @Body() dto: ImportUrlDto) {
    return this.knowledgeService.addUrlAsync(req.user.tenantId, dto.url);
  }

  @Post('search-company')
  searchCompany(@Request() req, @Body() dto: SearchCompanyDto) {
    return this.knowledgeService.searchCompany(req.user.tenantId, dto.companyName);
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
