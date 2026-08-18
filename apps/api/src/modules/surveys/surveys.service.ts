import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey, SurveyType, QuestionType, SurveyQuestion } from './survey.entity';
import { SurveyResponse } from './survey-response.entity';
import { LeadsService } from '../leads/leads.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name);

  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepo: Repository<SurveyResponse>,
    private readonly leadsService: LeadsService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async create(tenantId: string, data: Partial<Survey>): Promise<Survey> {
    const questions = (data.questions || []).map((q, i) => ({
      ...q,
      id: q.id || `q_${Date.now()}_${i}`,
    }));

    const survey = this.surveyRepo.create({
      tenantId,
      title: data.title,
      description: data.description,
      type: data.type || SurveyType.PRE_PURCHASE,
      agentId: data.agentId,
      questions,
      triggerConfig: data.triggerConfig || {},
      isActive: data.isActive ?? true,
    });

    return this.surveyRepo.save(survey);
  }

  async findAll(tenantId: string, type?: SurveyType): Promise<Survey[]> {
    const where: any = { tenantId };
    if (type) where.type = type;
    return this.surveyRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Survey> {
    const survey = await this.surveyRepo.findOne({ where: { id, tenantId } });
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  async update(id: string, tenantId: string, data: Partial<Survey>): Promise<Survey> {
    const survey = await this.findOne(id, tenantId);
    if (data.questions) {
      data.questions = data.questions.map((q, i) => ({
        ...q,
        id: q.id || `q_${Date.now()}_${i}`,
      }));
    }
    Object.assign(survey, data);
    return this.surveyRepo.save(survey);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.surveyRepo.delete({ id, tenantId });
  }

  async toggleActive(id: string, tenantId: string): Promise<Survey> {
    const survey = await this.findOne(id, tenantId);
    survey.isActive = !survey.isActive;
    return this.surveyRepo.save(survey);
  }

  async submit(
    tenantId: string,
    surveyId: string,
    answers: { questionId: string; value: string | string[] | number }[],
    options?: { leadId?: string; visitorId?: string; conversationId?: string; source?: string },
  ): Promise<SurveyResponse> {
    const survey = await this.findOne(surveyId, tenantId);

    const response = this.responseRepo.create({
      tenantId,
      surveyId,
      answers,
      leadId: options?.leadId,
      visitorId: options?.visitorId,
      conversationId: options?.conversationId,
      source: options?.source || 'widget',
    });

    const saved = await this.responseRepo.save(response);

    await this.surveyRepo.increment({ id: surveyId }, 'responseCount', 1);

    // Enrich lead profile from survey answers
    if (options?.leadId) {
      await this.enrichLeadFromSurvey(tenantId, options.leadId, survey.questions, answers);
    }

    return saved;
  }

  async getResults(surveyId: string, tenantId: string): Promise<any> {
    const survey = await this.findOne(surveyId, tenantId);
    const responses = await this.responseRepo.find({
      where: { surveyId, tenantId },
      order: { createdAt: 'DESC' },
    });

    const analysis = survey.questions.map((question) => {
      const questionAnswers = responses
        .map((r) => r.answers.find((a) => a.questionId === question.id))
        .filter(Boolean);

      const result: any = {
        questionId: question.id,
        label: question.label,
        type: question.type,
        responseCount: questionAnswers.length,
      };

      if (question.type === QuestionType.SCALE_1_5 || question.type === QuestionType.NPS_1_10) {
        const values = questionAnswers.map((a) => Number(a.value)).filter((n) => !isNaN(n));
        if (values.length > 0) {
          result.average = (values.reduce((s, n) => s + n, 0) / values.length).toFixed(2);
          result.distribution = {};
          const max = question.type === QuestionType.SCALE_1_5 ? 5 : 10;
          for (let i = 1; i <= max; i++) {
            result.distribution[i] = values.filter((v) => v === i).length;
          }
          if (question.type === QuestionType.NPS_1_10) {
            const promoters = values.filter((v) => v >= 9).length;
            const detractors = values.filter((v) => v <= 6).length;
            result.nps = Math.round(((promoters - detractors) / values.length) * 100);
            result.promoters = promoters;
            result.detractors = detractors;
            result.passives = values.length - promoters - detractors;
          }
        }
      } else if (question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE) {
        const counts: Record<string, number> = {};
        questionAnswers.forEach((a) => {
          const vals = Array.isArray(a.value) ? a.value : [a.value];
          vals.forEach((v) => {
            counts[v] = (counts[v] || 0) + 1;
          });
        });
        result.distribution = counts;
      } else {
        result.answers = questionAnswers.map((a) => a.value).slice(0, 50);
      }

      return result;
    });

    return {
      survey,
      totalResponses: responses.length,
      analysis,
      recentResponses: responses.slice(0, 10),
    };
  }

  async getActiveByType(tenantId: string, type: SurveyType, agentId?: string): Promise<Survey | null> {
    const where: any = { tenantId, type, isActive: true };
    if (agentId) where.agentId = agentId;
    return this.surveyRepo.findOne({ where, order: { createdAt: 'DESC' } });
  }

  async sendPostPurchaseEmail(
    tenantId: string,
    leadId: string,
    email: string,
    surveyId: string,
  ): Promise<void> {
    const survey = await this.findOne(surveyId, tenantId);
    if (survey.type !== SurveyType.POST_PURCHASE) return;

    const subject = survey.triggerConfig?.emailSubject || 'Votre avis nous intéresse';
    const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
    const surveyLink = `${baseUrl}/s/${surveyId}?lead=${leadId}`;

    const template = survey.triggerConfig?.emailTemplate ||
      `Bonjour,\n\nMerci pour votre achat ! Pourrions-nous vous demander 2 minutes pour répondre à un court sondage ?\n\nVotre avis nous aide à améliorer notre service.\n\nRépondre ici: ${surveyLink}\n\nMerci,\nL'équipe`;

    try {
      await this.integrationsService.sendEmail(tenantId, email, subject, template);
      this.logger.log(`Post-purchase survey email sent to ${email}`);
    } catch (err: any) {
      this.logger.error(`Failed to send survey email: ${err?.message}`);
    }
  }

  private async enrichLeadFromSurvey(
    tenantId: string,
    leadId: string,
    questions: SurveyQuestion[],
    answers: { questionId: string; value: string | string[] | number }[],
  ): Promise<void> {
    try {
      const lead = await this.leadsService.findById(leadId, tenantId);
      const updates: any = {};
      const metadata = { ...(lead.metadata || {}) };

      for (const answer of answers) {
        const question = questions.find((q) => q.id === answer.questionId);
        if (!question) continue;

        const value = Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value);

        if (question.type === QuestionType.DEMOGRAPHIC_AGE) {
          metadata.ageRange = value;
        } else if (question.type === QuestionType.DEMOGRAPHIC_LOCATION) {
          metadata.location = value;
        } else if (question.label.toLowerCase().includes('birthday') || question.label.toLowerCase().includes('anniversaire')) {
          metadata.birthday = value;
        } else if (question.label.toLowerCase().includes('interest') || question.label.toLowerCase().includes('intérêt')) {
          metadata.interests = value;
        } else if (question.type === QuestionType.NPS_1_10) {
          metadata.nps = Number(answer.value);
        }

        if (question.label.toLowerCase().includes('nom') || question.label.toLowerCase().includes('name')) {
          if (!lead.name) updates.name = value;
        }
        if (question.label.toLowerCase().includes('email')) {
          if (!lead.email) updates.email = value;
        }
        if (question.label.toLowerCase().includes('téléphone') || question.label.toLowerCase().includes('phone')) {
          if (!lead.phone) updates.phone = value;
        }
      }

      updates.metadata = metadata;
      updates.score = lead.score + 15;

      await this.leadsService.update(leadId, tenantId, updates);
      this.logger.log(`Lead ${leadId} enriched from survey (score +15)`);
    } catch (err: any) {
      this.logger.warn(`Failed to enrich lead from survey: ${err?.message}`);
    }
  }
}
