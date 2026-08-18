import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Cron } from '@nestjs/schedule';
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
      variants: this.analyzeVariants(survey.questions, responses),
    };
  }

  private analyzeVariants(questions: SurveyQuestion[], responses: SurveyResponse[]): any {
    const hasVariants = questions.some((q) => q.variant === 'B');
    if (!hasVariants) return null;

    const variantAQuestions = questions.filter((q) => !q.variant || q.variant === 'A');
    const variantBQuestions = questions.filter((q) => q.variant === 'B');

    const variantAResponses = responses.filter((r) =>
      r.answers.some((a) => variantAQuestions.some((q) => q.id === a.questionId)),
    );
    const variantBResponses = responses.filter((r) =>
      r.answers.some((a) => variantBQuestions.some((q) => q.id === a.questionId)),
    );

    return {
      variantA: { count: variantAResponses.length, questions: variantAQuestions.length },
      variantB: { count: variantBResponses.length, questions: variantBQuestions.length },
    };
  }

  async getActiveByType(tenantId: string, type: SurveyType, agentId?: string): Promise<Survey | null> {
    const where: any = { tenantId, type, isActive: true };
    if (agentId) where.agentId = agentId;
    const survey = await this.surveyRepo.findOne({ where, order: { createdAt: 'DESC' } });
    if (!survey) return null;

    // A/B testing: filter questions by variant
    // If any question has variant B, randomly pick A or B set
    const hasVariants = survey.questions.some((q) => q.variant === 'B');
    if (hasVariants) {
      const showVariantB = Math.random() < 0.5;
      survey.questions = survey.questions.filter((q) => {
        if (!q.variant || q.variant === 'A') return !showVariantB;
        return showVariantB;
      });
    }

    return survey;
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

  async findOnePublic(id: string): Promise<Survey> {
    const survey = await this.surveyRepo.findOne({ where: { id, isActive: true } });
    if (!survey) throw new NotFoundException('Survey not found or inactive');
    return survey;
  }

  async exportCsv(surveyId: string, tenantId: string): Promise<string> {
    const survey = await this.findOne(surveyId, tenantId);
    const responses = await this.responseRepo.find({
      where: { surveyId, tenantId },
      order: { createdAt: 'DESC' },
    });

    const headers = ['Response ID', 'Date', 'Lead ID', 'Visitor ID', 'Source', ...survey.questions.map((q) => q.label)];
    const rows = [headers.join(',')];

    for (const resp of responses) {
      const dateStr = resp.createdAt.toISOString();
      const values = [resp.id, dateStr, resp.leadId || '', resp.visitorId || '', resp.source || ''];
      for (const q of survey.questions) {
        const answer = resp.answers.find((a) => a.questionId === q.id);
        let val = '';
        if (answer) {
          val = Array.isArray(answer.value) ? answer.value.join('; ') : String(answer.value);
        }
        val = `"${val.replace(/"/g, '""')}"`;
        values.push(val);
      }
      rows.push(values.join(','));
    }

    return rows.join('\n');
  }

  @Cron('0 9 * * *')
  async sendReminderEmails(): Promise<void> {
    this.logger.log('Checking for survey reminder emails...');

    const postPurchaseSurveys = await this.surveyRepo.find({
      where: { type: SurveyType.POST_PURCHASE, isActive: true },
    });

    for (const survey of postPurchaseSurveys) {
      // Find responses from 3 days ago
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      const oldResponses = await this.responseRepo
        .createQueryBuilder('r')
        .leftJoin('r.survey', 's')
        .where('s.id = :surveyId', { surveyId: survey.id })
        .andWhere('r.createdAt < :threeDaysAgo', { threeDaysAgo })
        .andWhere('r.createdAt > :oneDayAgo', { oneDayAgo })
        .andWhere('r.source = :source', { source: 'email_sent' })
        .getMany();

      for (const resp of oldResponses) {
        if (!resp.leadId) continue;
        try {
          const lead = await this.leadsService.findById(resp.leadId, survey.tenantId);
          if (!lead.email) continue;

          const alreadyResponded = await this.responseRepo.findOne({
            where: { surveyId: survey.id, leadId: resp.leadId, source: 'public_link' },
          });
          if (alreadyResponded) continue;

          const subject = survey.triggerConfig?.emailSubject || 'Rappel: votre avis nous intéresse';
          const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
          const surveyLink = `${baseUrl}/s/${survey.id}?lead=${resp.leadId}`;

          const template = `Bonjour,\n\nIl y a quelques jours, nous vous avons envoyé un court sondage. Nous n'avons pas encore reçu vos réponses.\n\nVotre avis compte vraiment pour nous. Cela ne prend que 2 minutes.\n\nRépondre ici: ${surveyLink}\n\nMerci,\nL'équipe`;

          await this.integrationsService.sendEmail(survey.tenantId, lead.email, subject, template);
          this.logger.log(`Reminder email sent to ${lead.email} for survey ${survey.id}`);
        } catch (err: any) {
          this.logger.warn(`Failed to send reminder: ${err?.message}`);
        }
      }
    }
  }

  async triggerPostPurchaseByOrder(
    tenantId: string,
    customerEmail: string,
    customerName?: string,
  ): Promise<void> {
    const survey = await this.getActiveByType(tenantId, SurveyType.POST_PURCHASE);
    if (!survey) return;

    let lead: any = null;
    try {
      const leads = await this.leadsService.findByTenant(tenantId);
      lead = leads.find((l: any) => l.email === customerEmail);
    } catch {}

    let leadId: string | undefined;
    if (lead) {
      leadId = lead.id;
    } else {
      try {
        lead = await this.leadsService.create(tenantId, {
          name: customerName || '',
          email: customerEmail,
          source: 'shopify_order',
          score: 20,
        });
        leadId = lead.id;
      } catch (err: any) {
        this.logger.warn(`Failed to create lead from order: ${err?.message}`);
      }
    }

    if (leadId && customerEmail) {
      // Track that email was sent
      await this.responseRepo.save(
        this.responseRepo.create({
          tenantId,
          surveyId: survey.id,
          leadId,
          answers: [],
          source: 'email_sent',
        }),
      );
      await this.sendPostPurchaseEmail(tenantId, leadId, customerEmail, survey.id);
    }
  }

  filterQuestionsBySkipLogic(
    questions: SurveyQuestion[],
    answers: Record<string, string | string[] | number>,
  ): SurveyQuestion[] {
    return questions.filter((q) => {
      if (!q.skipLogic) return true;
      const condition = q.skipLogic;
      const dependentAnswer = answers[condition.dependsOn];
      if (dependentAnswer === undefined) return false;
      const val = Array.isArray(dependentAnswer) ? dependentAnswer.join(',') : String(dependentAnswer);
      if (condition.operator === 'equals') return val === condition.value;
      if (condition.operator === 'contains') return val.includes(condition.value);
      if (condition.operator === 'not_equals') return val !== condition.value;
      return true;
    });
  }
}
