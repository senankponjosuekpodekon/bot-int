import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { RegionCode } from './region-profile.types';

@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly service: RegionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all region profiles' })
  @ApiResponse({ status: 200, description: 'List of region profiles' })
  list() {
    return this.service.getAllProfiles();
  }

  @Get('detect')
  @ApiOperation({ summary: 'Detect region from IP, phone, language, timezone' })
  @ApiResponse({ status: 200, description: 'Detected region + profile' })
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
  @ApiOperation({ summary: 'Build system prompt with regional adaptation' })
  @ApiResponse({ status: 200, description: 'Adapted system prompt' })
  buildPrompt(@Body() body: { basePrompt: string; region: RegionCode }) {
    return { prompt: this.service.buildSystemPrompt(body.basePrompt, body.region) };
  }
}
