import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from './super-admin.guard';
import { UserRole } from '../auth/user.entity';
import { PlanType } from '../billing/subscription.entity';
import { IsString, IsEnum, IsNotEmpty, MinLength, IsOptional, IsBoolean } from 'class-validator';

class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

class ChangeRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

class ChangePlanDto {
  @IsEnum(PlanType)
  plan: PlanType;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  password: string;
}

@UseGuards(SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Platform Stats ───
  @Get('stats')
  getStats() {
    return this.adminService.getPlatformStats();
  }

  // ─── Tenant Management ───
  @Get('tenants')
  listTenants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listTenants(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('tenants/:id')
  getTenantDetail(@Param('id') id: string) {
    return this.adminService.getTenantDetail(id);
  }

  @Patch('tenants/:id/toggle-active')
  toggleTenantActive(@Param('id') id: string) {
    return this.adminService.toggleTenantActive(id);
  }

  @Patch('tenants/:id/plan')
  changeTenantPlan(@Param('id') id: string, @Body() dto: ChangePlanDto) {
    return this.adminService.changeTenantPlan(id, dto.plan);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  // ─── User Management ───
  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.adminService.listUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      tenantId,
    );
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id/toggle-active')
  toggleUserActive(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Patch('users/:id/role')
  changeUserRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.adminService.changeUserRole(id, dto.role);
  }

  @Post('users/:id/reset-password')
  resetUserPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.adminService.resetUserPassword(id, dto.password);
  }

  // ─── Platform-wide Conversations ───
  @Get('conversations')
  listConversations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.adminService.listConversations(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      tenantId,
    );
  }
}
