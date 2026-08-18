import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { RegionCode } from './region-profile.types';

@Controller('regions')
export class RegionsController {
  constructor(private readonly service: RegionsService) {}

  @Get()
  list() {
    return this.service.getAllProfiles();
  }

  @Get('detect')
  async detect(
    @Query('ip') ip?: string,
    @Query('phone') phone?: string,
    @Query('lang') browserLanguage?: string,
    @Query('tz') timezone?: string,
  ) {
    const region = await this.service.detectRegion({ ip, phone, browserLanguage, timezone });
    return { region, profile: this.service.getProfile(region) };
  }

  @Post('prompt')
  buildPrompt(@Body() body: { basePrompt: string; region: RegionCode }) {
    return { prompt: this.service.buildSystemPrompt(body.basePrompt, body.region) };
  }
}
