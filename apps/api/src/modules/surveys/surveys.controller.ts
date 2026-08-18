import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SurveyType } from './survey.entity';
import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsArray } from 'class-validator';

class CreateSurveyDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(SurveyType) @IsOptional() type?: SurveyType;
  @IsString() @IsOptional() agentId?: string;
  @IsArray() @IsOptional() questions?: any[];
  @IsObject() @IsOptional() triggerConfig?: Record<string, any>;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

class UpdateSurveyDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(SurveyType) @IsOptional() type?: SurveyType;
  @IsString() @IsOptional() agentId?: string;
  @IsArray() @IsOptional() questions?: any[];
  @IsObject() @IsOptional() triggerConfig?: Record<string, any>;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

class SubmitSurveyDto {
  @IsArray() answers: { questionId: string; value: string | string[] | number }[];
  @IsString() @IsOptional() leadId?: string;
  @IsString() @IsOptional() visitorId?: string;
  @IsString() @IsOptional() conversationId?: string;
  @IsString() @IsOptional() source?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateSurveyDto) {
    return this.surveysService.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req, @Query('type') type?: SurveyType) {
    return this.surveysService.findAll(req.user.tenantId, type);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.surveysService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSurveyDto) {
    return this.surveysService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.surveysService.delete(id, req.user.tenantId);
  }

  @Patch(':id/toggle')
  toggle(@Request() req, @Param('id') id: string) {
    return this.surveysService.toggleActive(id, req.user.tenantId);
  }

  @Post(':id/submit')
  submit(@Request() req, @Param('id') id: string, @Body() dto: SubmitSurveyDto) {
    return this.surveysService.submit(req.user.tenantId, id, dto.answers, {
      leadId: dto.leadId,
      visitorId: dto.visitorId,
      conversationId: dto.conversationId,
      source: dto.source,
    });
  }

  @Get(':id/results')
  getResults(@Request() req, @Param('id') id: string) {
    return this.surveysService.getResults(id, req.user.tenantId);
  }

  @Post(':id/send-email')
  sendEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { leadId: string; email: string },
  ) {
    return this.surveysService.sendPostPurchaseEmail(req.user.tenantId, body.leadId, body.email, id);
  }
}
