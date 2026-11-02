import { Request } from '@nestjs/common';
import { Controller, Get, Param, Patch, UseGuards, Body, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';;
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/user.entity';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // Platform-level listing is reserved for the platform super admin.
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('me')
  findMe(@Request() req) {
    return this.tenantsService.findById(req.user.tenantId);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() data: UpdateTenantDto) {
    return this.tenantsService.update(req.user.tenantId, data);
  }

  // A tenant admin may read its own tenant record only; other ids are denied.
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    if (req.user.role === UserRole.SUPER_ADMIN || id === req.user.tenantId) {
      return this.tenantsService.findById(id);
    }
    throw new ForbiddenException('Access denied to this tenant');
  }
}
