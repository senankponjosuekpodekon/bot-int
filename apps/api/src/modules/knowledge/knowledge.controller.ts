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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { SiteScraperService } from './site-scraper.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTextDocumentDto } from './dto/create-text-document.dto';
import { PaginationDto } from '../../common/pagination.dto';

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

@ApiTags('knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly siteScraperService: SiteScraperService,
  ) {}

  @Post('text')
  @ApiOperation({ summary: 'Add text document to knowledge base' })
  @ApiResponse({ status: 201, description: 'Document created' })
  addText(@Request() req, @Body() dto: CreateTextDocumentDto) {
    return this.knowledgeService.addText(req.user.tenantId, dto.content, dto.filename);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload file to knowledge base (PDF, DOCX, or text)' })
  @ApiResponse({ status: 201, description: 'File uploaded and processed' })
  @ApiResponse({ status: 400, description: 'No file provided' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFile(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf');
    const isDocx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.endsWith('.docx');
    if (isPdf) {
      return this.knowledgeService.addPdf(req.user.tenantId, file.buffer, file.originalname);
    }
    if (isDocx) {
      return this.knowledgeService.addDocx(req.user.tenantId, file.buffer, file.originalname);
    }
    const content = file.buffer.toString('utf-8');
    return this.knowledgeService.addText(req.user.tenantId, content, file.originalname);
  }

  @Post('url')
  @ApiOperation({ summary: 'Import content from URL' })
  @ApiResponse({ status: 201, description: 'URL content imported' })
  importUrl(@Request() req, @Body() dto: ImportUrlDto) {
    return this.knowledgeService.addUrl(req.user.tenantId, dto.url);
  }

  @Post('url-async')
  @ApiOperation({ summary: 'Import content from URL (async)' })
  @ApiResponse({ status: 201, description: 'Import job started' })
  importUrlAsync(@Request() req, @Body() dto: ImportUrlDto) {
    return this.knowledgeService.addUrlAsync(req.user.tenantId, dto.url);
  }

  @Post('search-company')
  @ApiOperation({ summary: 'Search for company information' })
  @ApiResponse({ status: 200, description: 'Company search results' })
  searchCompany(@Request() req, @Body() dto: SearchCompanyDto) {
    return this.knowledgeService.searchCompany(req.user.tenantId, dto.companyName);
  }

  @Post('scrape-site')
  @ApiOperation({ summary: 'Scrape a full site' })
  @ApiResponse({ status: 200, description: 'Site scraped successfully' })
  scrapeSite(@Request() req, @Body() dto: ImportUrlDto) {
    return this.siteScraperService.scrapeSite(req.user.tenantId, dto.url);
  }

  @Get()
  @ApiOperation({ summary: 'List knowledge documents (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of documents' })
  findAll(@Request() req, @Query() query: PaginationDto) {
    return this.knowledgeService.findByTenant(req.user.tenantId, query.page, query.limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search knowledge base by text' })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(@Request() req, @Query() query: SearchQueryDto) {
    return this.knowledgeService.searchByText(req.user.tenantId, query.q || '');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete knowledge document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  remove(@Request() req, @Param('id') id: string) {
    return this.knowledgeService.delete(id, req.user.tenantId);
  }
}
