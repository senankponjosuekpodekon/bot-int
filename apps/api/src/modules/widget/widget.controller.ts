import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WidgetService } from './widget.service';
import { SurveysService } from '../surveys/surveys.service';
import { SurveyType } from '../surveys/survey.entity';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { Response } from 'express';
import { EMBED_SCRIPT } from './embed-script';

class PublicSendMessageDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsNotEmpty() visitorId: string;
}

class PublicFlowResponseDto {
  @IsString() @IsNotEmpty() agentId: string;
  @IsString() @IsNotEmpty() conversationId: string;
  @IsString() @IsNotEmpty() flowId: string;
  @IsString() @IsNotEmpty() visitorId: string;
  responses: Record<string, string>;
}

class PublicSurveySubmitDto {
  @IsString() @IsNotEmpty() surveyId: string;
  @IsString() @IsNotEmpty() visitorId: string;
  @IsString() @IsOptional() agentId?: string;
  @IsArray() answers: { questionId: string; value: string | string[] | number }[];
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsOptional() leadId?: string;
}

@Controller('widget')
export class WidgetController {
  constructor(
    private readonly service: WidgetService,
    private readonly surveysService: SurveysService,
  ) {}

  @Get('config/:agentId')
  getConfig(@Param('agentId') agentId: string) {
    return this.service.getAgentConfig(agentId);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('send')
  send(@Body() dto: PublicSendMessageDto) {
    return this.service.sendPublicMessage(dto.agentId, dto.message, dto.visitorId, dto.conversationId);
  }

  @Get('history/:agentId')
  history(@Param('agentId') agentId: string, @Query('visitorId') visitorId: string) {
    return this.service.getPublicHistory(agentId, visitorId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('flow-response')
  flowResponse(@Body() dto: PublicFlowResponseDto) {
    return this.service.submitFlowResponse(dto.agentId, dto.conversationId, dto.flowId, dto.responses, dto.visitorId);
  }

  @Get('embed.js')
  embedScript(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(EMBED_SCRIPT);
  }

  @Get('survey/:agentId')
  async getActiveSurvey(@Param('agentId') agentId: string) {
    const config = await this.service.getAgentConfig(agentId);
    const survey = await this.surveysService.getActiveByType(config.tenantId, SurveyType.PRE_PURCHASE, agentId);
    return survey || { active: false };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('survey/submit')
  async submitSurvey(@Body() dto: PublicSurveySubmitDto) {
    const config = await this.service.getAgentConfig(dto.agentId || '');
    return this.surveysService.submit(config.tenantId, dto.surveyId, dto.answers, {
      visitorId: dto.visitorId,
      conversationId: dto.conversationId,
      leadId: dto.leadId,
      source: 'widget',
    });
  }
}
