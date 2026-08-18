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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

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

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Platform Stats ───
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({ status: 200, description: 'Platform stats' })
  getStats() {
    return this.adminService.getPlatformStats();
  }

  // ─── Tenant Management ───
  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of tenants' })
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
  @ApiOperation({ summary: 'Get tenant details' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  getTenantDetail(@Param('id') id: string) {
    return this.adminService.getTenantDetail(id);
  }

  @Patch('tenants/:id/toggle-active')
  @ApiOperation({ summary: 'Toggle tenant active state' })
  @ApiResponse({ status: 200, description: 'Tenant toggled' })
  toggleTenantActive(@Param('id') id: string) {
    return this.adminService.toggleTenantActive(id);
  }

  @Patch('tenants/:id/plan')
  @ApiOperation({ summary: 'Change tenant plan' })
  @ApiResponse({ status: 200, description: 'Plan changed' })
  changeTenantPlan(@Param('id') id: string, @Body() dto: ChangePlanDto) {
    return this.adminService.changeTenantPlan(id, dto.plan);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Delete tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted' })
  deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  // ─── User Management ───
  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
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
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id/toggle-active')
  @ApiOperation({ summary: 'Toggle user active state' })
  @ApiResponse({ status: 200, description: 'User toggled' })
  toggleUserActive(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  @ApiResponse({ status: 200, description: 'Role changed' })
  changeUserRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.adminService.changeUserRole(id, dto.role);
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password reset' })
  resetUserPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.adminService.resetUserPassword(id, dto.password);
  }

  // ─── Platform-wide Conversations ───
  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of conversations' })
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
