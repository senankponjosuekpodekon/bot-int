import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Survey } from './survey.entity';
import { SurveyResponse } from './survey-response.entity';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { SurveysPublicController } from './surveys-public.controller';
import { LeadsModule } from '../leads/leads.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Survey, SurveyResponse]),
    LeadsModule,
    IntegrationsModule,
  ],
  providers: [SurveysService],
  controllers: [SurveysController, SurveysPublicController],
  exports: [SurveysService],
})
export class SurveysModule {}
