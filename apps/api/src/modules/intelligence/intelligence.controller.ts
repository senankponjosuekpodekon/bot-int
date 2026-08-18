import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly service: IntelligenceService) {}

  @Get('dashboard')
  dashboard(@Request() req) {
    return this.service.getDashboard(req.user.tenantId);
  }

  @Get('insights')
  insights(@Request() req, @Query('type') type?: string, @Query('resolved') resolved?: string) {
    return this.service.getInsights(
      req.user.tenantId,
      type as any,
      resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    );
  }

  @Post('insights/:id/resolve')
  resolve(@Request() req, @Param('id') id: string) {
    return this.service.resolveInsight(id, req.user.tenantId);
  }

  @Post('auto-enrich')
  autoEnrich(@Request() req, @Body() body: { keyword: string }) {
    return this.service.autoEnrichKnowledge(req.user.tenantId, body.keyword);
  }

  @Post('auto-adjust-scoring')
  autoAdjustScoring() {
    return this.service.autoAdjustLeadScoring();
  }

  @Post('auto-optimize-prompts')
  autoOptimizePrompts() {
    return this.service.autoOptimizePrompts();
  }

  @Post('auto-enrich-unanswered')
  autoEnrichUnanswered() {
    return this.service.autoEnrichUnansweredKnowledge();
  }

  @Get('platform/dashboard')
  platformDashboard() {
    return this.service.getPlatformDashboard();
  }

  @Get('platform/recommendations')
  platformRecommendations() {
    return this.service.getPlatformRecommendations();
  }
}
