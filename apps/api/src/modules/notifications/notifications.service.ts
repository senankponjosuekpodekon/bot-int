import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../leads/lead.entity';
import { IntegrationsService } from '../integrations/integrations.service';
import { Conversation } from '../chat/conversation.entity';
import { Message } from '../chat/message.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly integrationsService: IntegrationsService,
  ) {}

  // Check for hot leads every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkHotLeads(): Promise<void> {
    try {
      const hotLeads = await this.leadRepo.find({
        where: { status: LeadStatus.HOT, notified: false },
        take: 50,
      });

      for (const lead of hotLeads) {
        await this.notifyHotLead(lead);
      }
    } catch (err: any) {
      this.logger.error(`Hot lead check failed: ${err?.message}`);
    }
  }

  private async notifyHotLead(lead: Lead): Promise<void> {
    const integrations = await this.integrationsService.findAll(lead.tenantId);
    const emailIntegration = integrations.find((i) => i.type === 'email' && i.enabled);
    const whatsappIntegration = integrations.find((i) => i.type === 'whatsapp' && i.enabled);

    const subject = `🔥 Lead chaud: ${lead.name || lead.email || 'Nouveau lead'}`;
    const body = `
Un lead chaud a été détecté:

Nom: ${lead.name || 'N/A'}
Email: ${lead.email || 'N/A'}
Téléphone: ${lead.phone || 'N/A'}
Score: ${lead.score || 0}/100
Source: ${lead.source || 'chat'}

Connectez-vous au dashboard pour le contacter rapidement.
`;

    if (emailIntegration?.config?.adminEmail) {
      try {
        await this.integrationsService.sendEmail(
          lead.tenantId,
          emailIntegration.config.adminEmail,
          subject,
          body,
        );
      } catch (err) {
        this.logger.error(`Email notification failed: ${err?.message}`);
      }
    }

    if (whatsappIntegration?.config?.adminPhone) {
      try {
        await this.integrationsService.sendWhatsApp(
          lead.tenantId,
          whatsappIntegration.config.adminPhone,
          `${subject}\n\n${body}`,
        );
      } catch (err) {
        this.logger.error(`WhatsApp notification failed: ${err?.message}`);
      }
    }

    // Mark as notified
    await this.leadRepo.update(lead.id, { notified: true });
    this.logger.log(`Hot lead notified: ${lead.name || lead.email}`);
  }

  // Email nurture sequence - daily check
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runNurtureSequences(): Promise<void> {
    try {
      const coldLeads = await this.leadRepo
        .createQueryBuilder('lead')
        .where('lead.status = :status', { status: LeadStatus.NEW })
        .andWhere('lead.email IS NOT NULL')
        .andWhere("lead.metadata->>'nurtureStep' IS NULL OR lead.metadata->>'nurtureStep' = '0'")
        .andWhere('lead.createdAt < :date', { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .take(50)
        .getMany();

      for (const lead of coldLeads) {
        await this.sendNurtureEmail(lead, 1);
      }

      // Step 2: 3 days after step 1
      const step1Leads = await this.leadRepo
        .createQueryBuilder('lead')
        .where('lead.status = :status', { status: LeadStatus.NEW })
        .andWhere('lead.email IS NOT NULL')
        .andWhere("lead.metadata->>'nurtureStep' = '1'")
        .andWhere('lead.updatedAt < :date', { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) })
        .take(50)
        .getMany();

      for (const lead of step1Leads) {
        await this.sendNurtureEmail(lead, 2);
      }

      // Step 3: 7 days after step 2
      const step2Leads = await this.leadRepo
        .createQueryBuilder('lead')
        .where('lead.status = :status', { status: LeadStatus.NEW })
        .andWhere('lead.email IS NOT NULL')
        .andWhere("lead.metadata->>'nurtureStep' = '2'")
        .andWhere('lead.updatedAt < :date', { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .take(50)
        .getMany();

      for (const lead of step2Leads) {
        await this.sendNurtureEmail(lead, 3);
      }
    } catch (err: any) {
      this.logger.error(`Nurture sequence failed: ${err?.message}`);
    }
  }

  private async sendNurtureEmail(lead: Lead, step: number): Promise<void> {
    const integrations = await this.integrationsService.findAll(lead.tenantId);
    const emailIntegration = integrations.find((i) => i.type === 'email' && i.enabled);
    if (!emailIntegration) return;

    const templates = {
      1: {
        subject: 'Merci pour votre intérêt !',
        body: `Bonjour ${lead.name || ''},\n\nMerci d'avoir contacté notre équipe. Nous avons bien reçu votre demande et nous reviendrons vers vous très bientôt.\n\nEn attendant, n'hésitez pas à consulter notre catalogue en ligne.\n\nCordialement,\nL'équipe`,
      },
      2: {
        subject: 'Avez-vous des questions ?',
        body: `Bonjour ${lead.name || ''},\n\nNous n'avons pas eu de retour de votre part depuis quelques jours. Avez-vous des questions supplémentaires ?\n\nNous sommes à votre disposition pour vous accompagner.\n\nCordialement,\nL'équipe`,
      },
      3: {
        subject: 'Dernière chance : notre offre spéciale',
        body: `Bonjour ${lead.name || ''},\n\nC'est notre dernier message de suivi. Si vous êtes toujours intéressé, n'hésitez pas à nous contacter directement.\n\nNous serions ravis de vous accueillir parmi nos clients.\n\nCordialement,\nL'équipe`,
      },
    };

    const template = templates[step] || templates[1];

    try {
      await this.integrationsService.sendEmail(lead.tenantId, lead.email, template.subject, template.body);
      await this.leadRepo.update(lead.id, {
        metadata: { ...(lead.metadata || {}), nurtureStep: step.toString() } as any,
      });
      this.logger.log(`Nurture step ${step} sent to ${lead.email}`);
    } catch (err: any) {
      this.logger.error(`Nurture email failed: ${err?.message}`);
    }
  }
}
