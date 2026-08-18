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
import { CacheService } from '../../common/cache.service';

class ChangePlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  plan: PlanType;
}

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('subscription')
  async getSubscription(@Request() req) {
    const cacheKey = `billing:${req.user.tenantId}:subscription`;
    const cached = this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.billingService.getSubscription(req.user.tenantId);
    this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  @Get('usage')
  async getUsage(@Request() req) {
    const cacheKey = `billing:${req.user.tenantId}:usage`;
    const cached = this.cacheService.get(cacheKey);
    if (cached) return cached;
    const result = await this.billingService.getUsageStats(req.user.tenantId);
    this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  @Post('checkout')
  checkout(@Request() req, @Body() dto: ChangePlanDto) {
    this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.createCheckoutSession(req.user.tenantId, dto.plan);
  }

  @Post('change-plan')
  changePlan(@Request() req, @Body() dto: ChangePlanDto) {
    this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.changePlan(req.user.tenantId, dto.plan);
  }

  @Post('cancel')
  cancel(@Request() req) {
    this.cacheService.delPattern(`billing:${req.user.tenantId}:*`);
    return this.billingService.cancel(req.user.tenantId);
  }
}
