import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration } from './integration.entity';
import axios from 'axios';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly repo: Repository<Integration>,
  ) {}

  async findAll(tenantId: string): Promise<Integration[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async findByType(tenantId: string, type: string): Promise<Integration | null> {
    return this.repo.findOne({ where: { tenantId, type } });
  }

  async upsert(tenantId: string, type: string, config: Record<string, any>): Promise<Integration> {
    let existing = await this.findByType(tenantId, type);
    if (existing) {
      existing.config = { ...existing.config, ...config };
      existing.enabled = true;
      return this.repo.save(existing);
    }
    const integration = this.repo.create({ tenantId, type, config, enabled: true });
    return this.repo.save(integration);
  }

  async toggle(tenantId: string, type: string, enabled: boolean): Promise<Integration> {
    const integration = await this.findByType(tenantId, type);
    if (!integration) throw new NotFoundException(`${type} integration not found`);
    integration.enabled = enabled;
    return this.repo.save(integration);
  }

  async remove(tenantId: string, type: string): Promise<void> {
    await this.repo.delete({ tenantId, type });
  }

  async createStripePaymentLink(tenantId: string, productId: string, productName: string, amount: number, currency: string = 'eur'): Promise<{ url: string; id: string }> {
    const integration = await this.findByType(tenantId, 'stripe');
    if (!integration?.enabled || !integration.config.secretKey) {
      throw new Error('Stripe not configured');
    }

    try {
      const response = await axios.post(
        'https://api.stripe.com/v1/payment_links',
        new URLSearchParams({
          'line_items[0][price_data][currency]': currency,
          'line_items[0][price_data][product_data][name]': productName,
          'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
          'line_items[0][quantity]': '1',
        }),
        {
          headers: {
            'Authorization': `Bearer ${integration.config.secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return { url: response.data.url, id: response.data.id };
    } catch (err: any) {
      this.logger.error(`Stripe payment link failed: ${err?.response?.data?.error?.message || err?.message}`);
      throw new Error(`Stripe error: ${err?.response?.data?.error?.message || err?.message}`);
    }
  }

  async getCalendlyEventTypes(tenantId: string): Promise<any[]> {
    const integration = await this.findByType(tenantId, 'calendly');
    if (!integration?.enabled || !integration.config.accessToken) {
      throw new Error('Calendly not configured');
    }

    try {
      const userRes = await axios.get('https://api.calendly.com/users/me', {
        headers: { 'Authorization': `Bearer ${integration.config.accessToken}` },
      });
      const userUri = userRes.data.resource.uri;

      const eventsRes = await axios.get('https://api.calendly.com/event_types', {
        params: { user: userUri },
        headers: { 'Authorization': `Bearer ${integration.config.accessToken}` },
      });
      return eventsRes.data.collection.map((e: any) => ({
        name: e.name,
        duration: e.duration,
        url: e.scheduling_url,
        description: e.description_plain,
      }));
    } catch (err: any) {
      this.logger.error(`Calendly fetch failed: ${err?.message}`);
      throw new Error(`Calendly error: ${err?.message}`);
    }
  }

  async sendEmail(tenantId: string, to: string, subject: string, body: string): Promise<void> {
    const integration = await this.findByType(tenantId, 'email');
    if (!integration?.enabled) {
      this.logger.warn('Email not configured, skipping send');
      return;
    }

    const { provider, apiKey, fromEmail, fromName } = integration.config;

    if (provider === 'resend') {
      try {
        await axios.post(
          'https://api.resend.com/emails',
          {
            from: `${fromName || 'Bot'} <${fromEmail || 'noreply@example.com'}>`,
            to: [to],
            subject,
            html: body,
          },
          { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
        );
        this.logger.log(`Email sent to ${to} via Resend`);
      } catch (err: any) {
        this.logger.error(`Resend email failed: ${err?.message}`);
        throw new Error(`Email send failed: ${err?.message}`);
      }
    } else if (provider === 'sendgrid') {
      try {
        await axios.post(
          'https://api.sendgrid.com/v3/mail/send',
          {
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail || 'noreply@example.com', name: fromName || 'Bot' },
            subject,
            content: [{ type: 'text/html', value: body }],
          },
          { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
        );
        this.logger.log(`Email sent to ${to} via SendGrid`);
      } catch (err: any) {
        this.logger.error(`SendGrid email failed: ${err?.message}`);
        throw new Error(`Email send failed: ${err?.message}`);
      }
    } else {
      this.logger.warn(`Unknown email provider: ${provider}`);
    }
  }

  async sendWhatsApp(tenantId: string, to: string, message: string): Promise<void> {
    const integration = await this.findByType(tenantId, 'whatsapp');
    if (!integration?.enabled) {
      this.logger.warn('WhatsApp not configured, skipping send');
      return;
    }

    const { phoneNumberId, accessToken } = integration.config;
    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`WhatsApp message sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`WhatsApp send failed: ${err?.response?.data?.error?.message || err?.message}`);
      throw new Error(`WhatsApp send failed: ${err?.message}`);
    }
  }

  async sendTelegram(tenantId: string, chatId: string, message: string): Promise<void> {
    const integration = await this.findByType(tenantId, 'telegram');
    if (!integration?.enabled) {
      this.logger.warn('Telegram not configured, skipping send');
      return;
    }

    const { botToken } = integration.config;
    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        },
      );
      this.logger.log(`Telegram message sent to ${chatId}`);
    } catch (err: any) {
      this.logger.error(`Telegram send failed: ${err?.response?.data?.description || err?.message}`);
      throw new Error(`Telegram send failed: ${err?.message}`);
    }
  }

  async sendSMS(tenantId: string, to: string, message: string): Promise<void> {
    const integration = await this.findByType(tenantId, 'twilio');
    if (!integration?.enabled) {
      this.logger.warn('Twilio not configured, skipping send');
      return;
    }

    const { accountSid, authToken, fromNumber } = integration.config;
    try {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: fromNumber,
          To: to,
          Body: message,
        }),
        {
          auth: { username: accountSid, password: authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      this.logger.log(`SMS sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Twilio SMS failed: ${err?.response?.data?.message || err?.message}`);
      throw new Error(`SMS send failed: ${err?.message}`);
    }
  }

  async getWhatsAppWebhookVerify(tenantId: string, mode: string, token: string, challenge: string): Promise<string | null> {
    const integration = await this.findByType(tenantId, 'whatsapp');
    if (!integration?.enabled) return null;
    const verifyToken = integration.config.verifyToken;
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }
}
