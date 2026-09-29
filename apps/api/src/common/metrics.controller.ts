import { Controller, Get, Header, NotFoundException, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { MetricsService } from './metrics.service';

// GET /api/metrics — Prometheus exposition. Protected by METRICS_TOKEN (Bearer);
// returns 404 when the token is not configured so the endpoint stays invisible.
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  getMetrics(@Req() req: Request): string {
    const token = this.config.get<string>('METRICS_TOKEN');
    if (!token) throw new NotFoundException();
    const auth = req.headers.authorization;
    const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (bearer !== token) throw new UnauthorizedException('Invalid metrics token');
    return this.metrics.render();
  }
}
