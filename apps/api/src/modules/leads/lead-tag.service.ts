import { Injectable, Logger } from '@nestjs/common';

export interface TagContext {
  message?: string;
  source?: string;
  acquisitionChannel?: string;
  channel?: string;
  language?: string;
  region?: string;
  agentType?: string;
  funnelStage?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

const INTENT_TAG_RULES: Array<{ tags: string[]; pattern: RegExp }> = [
  { tags: ['pricing', 'sales'], pattern: /(prix|tarif|co[uû]te|combien|cost|price|pricing|quote|devis)/i },
  { tags: ['demo', 'sales'], pattern: /(d[eé]mo|demonstration|trial|essai|test|preview)/i },
  { tags: ['support', 'help'], pattern: /(aide|help|support|probl[eè]me|bug|error|erreur|issue|broken)/i },
  { tags: ['support', 'technical'], pattern: /(technique|technical|api|int[eé]gration|config|configuration|setup)/i },
  { tags: ['billing'], pattern: /(facture|invoice|payment|paiement|subscription|abonnement|refund|remboursement)/i },
  { tags: ['comparison'], pattern: /(comparatif|vs|versus|difference|diff[eé]rence|alternative|concurrence)/i },
  { tags: ['onboarding'], pattern: /(onboarding|d[eé]marrer|start|getting started|setup guide|guide)/i },
  { tags: ['feature-request'], pattern: /(feature|fonctionnalit[eé]|peut-on|est-il possible|request|suggestion)/i },
  { tags: ['urgent'], pattern: /(urgent|asap|imm[eé]diat|vite|quickly|maintenant|now)/i },
  { tags: ['meeting'], pattern: /(rendez-vous|rdv|appointment|meeting|consultation|call|appel)/i },
  { tags: ['complaint'], pattern: /(r[eé]clamation|complaint|insatisfait|unhappy|d[eé]cu|disappointed)/i },
  { tags: ['upsell'], pattern: /(upgrade|upgrader|plan sup[eé]rieur|premium|pro version)/i },
];

const SOURCE_TAG_MAP: Record<string, string> = {
  chat: 'web-chat',
  organic: 'organic',
  meta_ads: 'meta-ads',
  google_ads: 'google-ads',
  referral: 'referral',
  email: 'email-campaign',
  social: 'social',
  qr_code: 'qr',
  landing_page: 'landing',
  web_chat: 'web-chat',
  public_link: 'public-link',
};

const LANGUAGE_TAG_MAP: Record<string, string> = {
  fr: 'lang-fr',
  en: 'lang-en',
  de: 'lang-de',
  ar: 'lang-ar',
  es: 'lang-es',
  it: 'lang-it',
};

const AGENT_TYPE_TAG_MAP: Record<string, string> = {
  sales: 'sales-agent',
  support: 'support-agent',
  hr: 'hr-agent',
  general: 'general-agent',
};

@Injectable()
export class LeadTagService {
  private readonly logger = new Logger(LeadTagService.name);

  autoTag(ctx: TagContext): string[] {
    const tags = new Set<string>();

    if (ctx.message) {
      for (const rule of INTENT_TAG_RULES) {
        if (rule.pattern.test(ctx.message)) {
          rule.tags.forEach((t) => tags.add(t));
        }
      }
    }

    if (ctx.source && SOURCE_TAG_MAP[ctx.source]) {
      tags.add(SOURCE_TAG_MAP[ctx.source]);
    }

    if (ctx.acquisitionChannel && SOURCE_TAG_MAP[ctx.acquisitionChannel]) {
      tags.add(SOURCE_TAG_MAP[ctx.acquisitionChannel]);
    }

    if (ctx.language) {
      const lang = ctx.language.toLowerCase().split('-')[0];
      if (LANGUAGE_TAG_MAP[lang]) {
        tags.add(LANGUAGE_TAG_MAP[lang]);
      }
    }

    if (ctx.region) {
      tags.add(`region-${ctx.region}`);
    }

    if (ctx.agentType && AGENT_TYPE_TAG_MAP[ctx.agentType]) {
      tags.add(AGENT_TYPE_TAG_MAP[ctx.agentType]);
    }

    if (ctx.funnelStage) {
      tags.add(`funnel-${ctx.funnelStage}`);
    }

    if (ctx.hasEmail) tags.add('has-email');
    if (ctx.hasPhone) tags.add('has-phone');

    return Array.from(tags);
  }

  mergeTags(existing: string[] = [], newTags: string[]): string[] {
    const set = new Set([...existing, ...newTags]);
    return Array.from(set);
  }
}
