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
  Res,
  UseGuards,
} from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SurveyType } from './survey.entity';
import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { SendSurveyEmailDto } from './dto/send-survey-email.dto';

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

@ApiTags('surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a survey' })
  @ApiResponse({ status: 201, description: 'Survey created' })
  create(@Request() req, @Body() dto: CreateSurveyDto) {
    return this.surveysService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all surveys' })
  @ApiResponse({ status: 200, description: 'List of surveys' })
  findAll(@Request() req, @Query('type') type?: SurveyType) {
    return this.surveysService.findAll(req.user.tenantId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey details' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.surveysService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey updated' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSurveyDto) {
    return this.surveysService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey deleted' })
  delete(@Request() req, @Param('id') id: string) {
    return this.surveysService.delete(id, req.user.tenantId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle survey active state' })
  @ApiResponse({ status: 200, description: 'Survey toggled' })
  toggle(@Request() req, @Param('id') id: string) {
    return this.surveysService.toggleActive(id, req.user.tenantId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit survey responses' })
  @ApiResponse({ status: 201, description: 'Responses submitted' })
  submit(@Request() req, @Param('id') id: string, @Body() dto: SubmitSurveyDto) {
    return this.surveysService.submit(req.user.tenantId, id, dto.answers, {
      leadId: dto.leadId,
      visitorId: dto.visitorId,
      conversationId: dto.conversationId,
      source: dto.source,
    });
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get survey results' })
  @ApiResponse({ status: 200, description: 'Survey results' })
  getResults(@Request() req, @Param('id') id: string) {
    return this.surveysService.getResults(id, req.user.tenantId);
  }

  @Post(':id/send-email')
  @ApiOperation({ summary: 'Send survey via email' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  sendEmail(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SendSurveyEmailDto,
  ) {
    return this.surveysService.sendPostPurchaseEmail(req.user.tenantId, dto.leadId, dto.email, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export survey results as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportResults(@Request() req, @Param('id') id: string, @Res() res: Response) {
    const csv = await this.surveysService.exportCsv(id, req.user.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${id}.csv"`);
    res.send(csv);
  }
}
