import { Injectable, Logger } from '@nestjs/common';
import { Agent } from '../agents/agent.entity';
import { Lead } from '../leads/lead.entity';
import { Business } from '../business/business.entity';

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
const PHONE_REGEX = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
const NAME_PATTERNS = [
  /je m'appelle\s+([a-zA-ZÀ-ÿ'-]+)/i,
  /mon nom est\s+([a-zA-ZÀ-ÿ'-]+)/i,
  /je suis\s+([a-zA-ZÀ-ÿ'-]+)/i,
];

export interface ExtractedData {
  email?: string;
  phone?: string;
  name?: string;
}

// Pure guard/helper functions for the chat pipeline: PII extraction, business
// scope assertions, fact grounding, business hours. No repositories — every
// method is deterministic given its inputs.
@Injectable()
export class ChatGuardService {
  private readonly logger = new Logger(ChatGuardService.name);

  extractData(text: string): ExtractedData {
    const data: ExtractedData = {};

    const emailMatch = text.match(EMAIL_REGEX);
    if (emailMatch) data.email = emailMatch[0];

    const phoneMatch = text.match(PHONE_REGEX);
    if (phoneMatch) data.phone = phoneMatch[0].replace(/\s/g, '');

    for (const pattern of NAME_PATTERNS) {
      const nameMatch = text.match(pattern);
      if (nameMatch) {
        data.name = nameMatch[1].trim();
        break;
      }
    }

    return data;
  }

  assertContextScope(activeBusinessId: string, lead: Lead | null, products: any[]): void {
    if (!activeBusinessId) return;
    if (lead?.businessId && lead.businessId !== activeBusinessId) {
      this.logger.error(
        JSON.stringify({
          debug: 'CONTEXT_LEAK_BLOCKED',
          source: 'lead',
          expectedBusinessId: activeBusinessId,
          receivedBusinessId: lead.businessId,
        }),
      );
      throw new Error('Business context leak detected: lead belongs to a different business');
    }
    for (const product of products) {
      if (product?.businessId && product.businessId !== activeBusinessId) {
        this.logger.error(
          JSON.stringify({
            debug: 'CONTEXT_LEAK_BLOCKED',
            source: 'product',
            expectedBusinessId: activeBusinessId,
            receivedBusinessId: product.businessId,
          }),
        );
        throw new Error('Business context leak detected: product belongs to a different business');
      }
    }
  }

  resolveAllowedIntents(agent: Agent, personalityConfig: Record<string, any>): string[] | null {
    if (personalityConfig?.allowedIntents?.length) {
      return personalityConfig.allowedIntents as string[];
    }
    const strict = ['health', 'medical', 'legal', 'finance'];
    if (strict.includes(agent?.industry)) {
      return ['greeting', 'goodbye', 'appointment', 'contact', 'unknown'];
    }
    return null;
  }

  assertCriticalFactsGrounded(reply: string, products: any[]): void {
    if (!reply) return;
    const priceRegex = /\b(\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR|euros?)\b/gi;
    const matches = Array.from(reply.matchAll(priceRegex) || []);
    if (matches.length === 0) return;
    if (products.length === 0) {
      throw new Error('Price mentioned without grounded products');
    }
    const productPrices = products
      .map((p) => Number(p?.price))
      .filter((p) => !Number.isNaN(p));
    for (const match of matches) {
      const raw = match[1].replace(/,/g, '.');
      const price = Number(raw);
      if (Number.isNaN(price)) continue;
      const isGrounded = productPrices.some((p) => Math.abs(p - price) < 0.01);
      if (!isGrounded) {
        throw new Error(`Price ${price} not found in grounded products`);
      }
    }
  }

  // Business hours check (in the configured timezone when provided)
  isWithinBusinessHours(hours?: { start: string; end: string; days: number[]; timezone?: string }): boolean {
    if (!hours || !hours.start || !hours.end) return true;
    const now = new Date();
    let day = now.getDay();
    let currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (hours.timezone) {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: hours.timezone,
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).formatToParts(now);
        const get = (type: string) => parts.find((p) => p.type === type)?.value;
        const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        day = dayMap[get('weekday') || ''] ?? day;
        currentMinutes = (parseInt(get('hour') || '0', 10) % 24) * 60 + parseInt(get('minute') || '0', 10);
      } catch {
        // Invalid timezone — fall back to server time
      }
    }

    if (hours.days && hours.days.length > 0 && !hours.days.includes(day)) return false;

    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  buildBusinessProfilePrompt(business: Business): string {
    const p = business.profile || {};
    const lines: string[] = [`Tu représentes l'entreprise: ${business.name}.`];
    if (p.tagline) lines.push(`Accroche: ${p.tagline}`);
    if (p.about) lines.push(`À propos: ${p.about}`);
    if (p.sellingPoints?.length) {
      lines.push(`Points de vente à mettre en avant:\n${p.sellingPoints.map((s) => `- ${s}`).join('\n')}`);
    }
    if (p.complianceNote) lines.push(`Contrainte / conformité: ${p.complianceNote}`);
    if (p.contact?.email) lines.push(`Email: ${p.contact.email}`);
    if (p.contact?.phone) lines.push(`Téléphone: ${p.contact.phone}`);
    if (p.contact?.address) lines.push(`Adresse: ${p.contact.address}`);
    return lines.join('\n');
  }
}
