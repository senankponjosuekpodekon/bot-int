import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Param,
  Req,
  Res,
  RawBodyRequest,
} from '@nestjs/common';
import { Response } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/user.entity';
import { PlanType } from './subscription.entity';
import { IsEnum, IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CacheService } from '../../common/cache.service';

class ChangePlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  plan: PlanType;
}

class ManualPaymentDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  plan: PlanType;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async getSubscription(@Request() req) {
    const cacheKey = `billing:${req.user.tenantId}:subscription`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.billingService.getSubscription(req.user.tenantId);
    await this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage stats' })
  async getUsage(@Request() req) {
    const cacheKey = `billing:${req.user.tenantId}:usage`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.billingService.getUsageStats(req.user.tenantId);
    await this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  @Post('checkout')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session URL' })
  async checkout(@Request() req, @Body() dto: ChangePlanDto) {
    await this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.createCheckoutSession(req.user.tenantId, dto.plan);
  }

  @Post('change-plan')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan changed' })
  async changePlan(@Request() req, @Body() dto: ChangePlanDto) {
    await this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.changePlan(req.user.tenantId, dto.plan);
  }

  @Post('cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancel(@Request() req) {
    await this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.cancel(req.user.tenantId);
  }

  @Post('manual')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Record a manual payment and activate plan' })
  @ApiResponse({ status: 200, description: 'Manual payment recorded' })
  async manual(@Request() req, @Body() dto: ManualPaymentDto) {
    await this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.createManualPayment(req.user.tenantId, dto.plan, {
      amount: dto.amount,
      currency: dto.currency,
      reference: dto.reference,
      description: dto.description,
    });
  }
}
