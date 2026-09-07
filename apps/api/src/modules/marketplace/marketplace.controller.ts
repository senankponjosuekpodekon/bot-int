import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { MarketplaceService, FindTemplatesQuery, PublishTemplateDto } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/user.entity';
import { PaginationDto } from '../../common/pagination.dto';

class FindTemplatesDto extends PaginationDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  industry?: string;
}

class PublishTemplateBody {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPublic?: boolean;
}

class InstallTemplateBody {
  @IsString()
  @IsOptional()
  businessId?: string;
}

@ApiTags('marketplace')
@Controller('marketplace/templates')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  @ApiOperation({ summary: 'List public marketplace templates' })
  @ApiResponse({ status: 200, description: 'Paginated templates' })
  findAll(@Query() query: FindTemplatesDto) {
    const { page, limit, category, industry } = query;
    return this.marketplaceService.findAll({ page, limit, category, industry });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public template' })
  @ApiResponse({ status: 200, description: 'Template details' })
  findOne(@Param('id') id: string) {
    return this.marketplaceService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish an agent as a marketplace template' })
  @ApiResponse({ status: 201, description: 'Template published' })
  publish(@Request() req, @Body() dto: PublishTemplateBody) {
    return this.marketplaceService.publishFromAgent(req.user.tenantId, dto as PublishTemplateDto);
  }

  @Post(':id/install')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Install a marketplace template into the tenant' })
  @ApiResponse({ status: 201, description: 'Agent installed from template' })
  install(@Request() req, @Param('id') id: string, @Body() dto: InstallTemplateBody) {
    return this.marketplaceService.install(id, req.user.tenantId, dto.businessId);
  }
}
