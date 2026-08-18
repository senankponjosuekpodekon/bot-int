import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class TimelineDto {
  @Type(() => Number) @IsOptional() days?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.analyticsService.getDashboard(req.user.tenantId);
  }

  @Get('timeline')
  getTimeline(@Request() req, @Query() query: TimelineDto) {
    return this.analyticsService.getConversationTimeline(req.user.tenantId, query.days || 30);
  }
}
