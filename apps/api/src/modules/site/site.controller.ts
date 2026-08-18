import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Request,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { SiteService } from './site.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

class CreateSiteDto {
  @IsString() @IsOptional() slug?: string;
  @IsString() @IsNotEmpty() businessName: string;
  @IsString() @IsOptional() tagline?: string;
  @IsString() @IsOptional() aboutText?: string;
  @IsString() @IsOptional() logoUrl?: string;
  @IsString() @IsOptional() coverImageUrl?: string;
  @IsString() @IsOptional() agentId?: string;
  @IsObject() @IsOptional() contact?: Record<string, any>;
  @IsArray() @IsOptional() socialLinks?: any[];
  @IsObject() @IsOptional() theme?: Record<string, any>;
  @IsObject() @IsOptional() sections?: Record<string, any>;
  @IsArray() @IsOptional() faqs?: any[];
  @IsString() @IsOptional() customDomain?: string;
  @IsString() @IsOptional() subdomain?: string;
  @IsObject() @IsOptional() seo?: Record<string, any>;
}

class UpdateSiteDto {
  @IsString() @IsOptional() slug?: string;
  @IsString() @IsOptional() businessName?: string;
  @IsString() @IsOptional() tagline?: string;
  @IsString() @IsOptional() aboutText?: string;
  @IsString() @IsOptional() logoUrl?: string;
  @IsString() @IsOptional() coverImageUrl?: string;
  @IsString() @IsOptional() agentId?: string;
  @IsObject() @IsOptional() contact?: Record<string, any>;
  @IsArray() @IsOptional() socialLinks?: any[];
  @IsObject() @IsOptional() theme?: Record<string, any>;
  @IsObject() @IsOptional() sections?: Record<string, any>;
  @IsArray() @IsOptional() faqs?: any[];
  @IsString() @IsOptional() customDomain?: string;
  @IsString() @IsOptional() subdomain?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsObject() @IsOptional() seo?: Record<string, any>;
}

@ApiTags('site')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Post()
  @ApiOperation({ summary: 'Create a site' })
  @ApiResponse({ status: 201, description: 'Site created' })
  create(@Request() req, @Body() dto: CreateSiteDto) {
    return this.siteService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all sites' })
  @ApiResponse({ status: 200, description: 'List of sites' })
  findAll(@Request() req) {
    return this.siteService.findByTenant(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get site by ID' })
  @ApiResponse({ status: 200, description: 'Site details' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.siteService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update site by ID' })
  @ApiResponse({ status: 200, description: 'Site updated' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.siteService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete site by ID' })
  @ApiResponse({ status: 200, description: 'Site deleted' })
  delete(@Request() req, @Param('id') id: string) {
    return this.siteService.delete(id, req.user.tenantId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle site active state' })
  @ApiResponse({ status: 200, description: 'Site toggled' })
  toggle(@Request() req, @Param('id') id: string) {
    return this.siteService.toggleActive(id, req.user.tenantId);
  }

  @Post(':id/verify-domain')
  @ApiOperation({ summary: 'Verify custom domain' })
  @ApiResponse({ status: 200, description: 'Domain verified' })
  verifyDomain(@Request() req, @Param('id') id: string) {
    return this.siteService.verifyDomain(id, req.user.tenantId);
  }
}

// Public controller - no JWT
@Controller('site/public')
export class SitePublicController {
  constructor(private readonly siteService: SiteService) {}

  @Get('slug/:slug')
  async getPublicSite(@Param('slug') slug: string) {
    return this.siteService.getPublicSiteData(slug);
  }

  @Get('domain/:domain')
  async getSiteByDomain(@Param('domain') domain: string) {
    const site = await this.siteService.findByDomain(domain);
    if (!site) throw new NotFoundException('Site not found for this domain');
    return this.siteService.getPublicSiteData(site.slug);
  }
}
