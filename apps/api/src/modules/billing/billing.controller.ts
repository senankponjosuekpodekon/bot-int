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
import { PlanType } from './subscription.entity';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CacheService } from '../../common/cache.service';

class ChangePlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  plan: PlanType;
}

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
    const cached = this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.billingService.getSubscription(req.user.tenantId);
    this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage stats' })
  async getUsage(@Request() req) {
    const cacheKey = `billing:${req.user.tenantId}:usage`;
    const cached = this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.billingService.getUsageStats(req.user.tenantId);
    this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session URL' })
  checkout(@Request() req, @Body() dto: ChangePlanDto) {
    this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.createCheckoutSession(req.user.tenantId, dto.plan);
  }

  @Post('change-plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan changed' })
  changePlan(@Request() req, @Body() dto: ChangePlanDto) {
    this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.changePlan(req.user.tenantId, dto.plan);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  cancel(@Request() req) {
    this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.cancel(req.user.tenantId);
  }
}
