import { Controller, Get, Param, Patch, Request, UseGuards, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('me')
  findMe(@Request() req) {
    return this.tenantsService.findById(req.user.tenantId);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() data: any) {
    return this.tenantsService.update(req.user.tenantId, data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }
}
