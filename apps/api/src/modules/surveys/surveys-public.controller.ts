import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class PublicSubmitDto {
  @IsArray() answers: { questionId: string; value: string | string[] | number }[];
  @IsString() @IsOptional() leadId?: string;
  @IsString() @IsOptional() visitorId?: string;
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsOptional() source?: string;
}

@Controller('surveys/public')
export class SurveysPublicController {
  constructor(private readonly surveysService: SurveysService) {}

  @Get(':id')
  async getPublicSurvey(@Param('id') id: string) {
    return this.surveysService.findOnePublic(id);
  }

  @Post(':id/submit')
  async submitPublic(@Param('id') id: string, @Body() dto: PublicSubmitDto) {
    const survey = await this.surveysService.findOnePublic(id);
    return this.surveysService.submit(survey.tenantId, id, dto.answers, {
      leadId: dto.leadId,
      visitorId: dto.visitorId,
      conversationId: dto.conversationId,
      source: dto.source || 'public_link',
    });
  }
}
