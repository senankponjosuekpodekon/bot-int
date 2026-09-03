import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from './business.service';

@ApiTags('business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @ApiOperation({ summary: 'List businesses for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of businesses' })
  async list(@Request() req) {
    const businesses = await this.businessService.findByTenant(req.user.tenantId);
    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      isDefault: b.isDefault,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a business by id' })
  @ApiResponse({ status: 200, description: 'Business details' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getById(@Request() req, @Param('id') id: string) {
    const business = await this.businessService.findById(id, req.user.tenantId);
    if (!business) return { status: 'not_found' };
    return {
      id: business.id,
      name: business.name,
      isDefault: business.isDefault,
      profile: business.profile,
    };
  }
}
