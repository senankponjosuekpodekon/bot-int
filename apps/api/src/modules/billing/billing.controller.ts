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

class ChangePlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  plan: PlanType;
}

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  getSubscription(@Request() req) {
    return this.billingService.getSubscription(req.user.tenantId);
  }

  @Get('usage')
  getUsage(@Request() req) {
    return this.billingService.getUsageStats(req.user.tenantId);
  }

  @Post('checkout')
  checkout(@Request() req, @Body() dto: ChangePlanDto) {
    return this.billingService.createCheckoutSession(req.user.tenantId, dto.plan);
  }

  @Post('change-plan')
  changePlan(@Request() req, @Body() dto: ChangePlanDto) {
    return this.billingService.changePlan(req.user.tenantId, dto.plan);
  }

  @Post('cancel')
  cancel(@Request() req) {
    return this.billingService.cancel(req.user.tenantId);
  }
}
