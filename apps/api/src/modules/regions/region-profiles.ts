import { RegionProfile, RegionCode } from './region-profile.types';

export const REGION_PROFILES: Record<RegionCode, RegionProfile> = {
  us: {
    code: 'us',
    name: 'United States',
    language: 'en',
    locale: 'en-US',
    direction: 'ltr',
    tone: 'direct',
    formality: 'casual',
    useOfName: 'first_name',
    systemPromptAddition: `You are speaking to an American business audience.
Be direct, concise and results-oriented.
Focus heavily on ROI, time saved, and revenue impact.
Use a confident but friendly tone. Avoid being overly formal.
Short sentences are preferred.
Always respond in the same language as the user.`,
    responseStyle: { maxLength: 'short', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'America/New_York',
    complianceNote: 'CCPA compliant — data handled per California Consumer Privacy Act.',
  },

  uk: {
    code: 'uk',
    name: 'United Kingdom',
    language: 'en',
    locale: 'en-GB',
    direction: 'ltr',
    tone: 'direct',
    formality: 'neutral',
    useOfName: 'first_name',
    systemPromptAddition: `You are speaking to a UK business audience.
Be polite but direct and results-oriented.
Focus on efficiency, ROI, and time saved.
Use British English spelling (e.g., "optimise", "colour", "centre").
Keep a professional but approachable tone.`,
    responseStyle: { maxLength: 'short', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'Europe/London',
    complianceNote: 'GDPR compliant — UK GDPR + EU GDPR.',
  },

  ae: {
    code: 'ae',
    name: 'United Arab Emirates',
    language: 'ar',
    locale: 'ar-AE',
    direction: 'rtl',
    tone: 'relational',
    formality: 'formal',
    useOfName: 'title_last_name',
    systemPromptAddition: `أنت وكيل مبيعات محترف متخصص في السوق الإماراتي والخليجي.
تحدث بالعربية الفصحى بأسلوب مهني ومهذب ومحترم.
ابنِ العلاقة أولاً قبل الدفع نحو الإجراء.
ركز على الجودة، الحداثة، والكفاءة.
تجنب الأسلوب العدواني أو غير الرسمي.
إذا كتب العميل بالإنجليزية، أجب بالإنجليزية بنفس النبرة المهنية.`,
    responseStyle: { maxLength: 'medium', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'Asia/Dubai',
    complianceNote: 'PDPL compliant — UAE Personal Data Protection Law.',
  },

  sa: {
    code: 'sa',
    name: 'Saudi Arabia',
    language: 'ar',
    locale: 'ar-SA',
    direction: 'rtl',
    tone: 'relational',
    formality: 'formal',
    useOfName: 'title_last_name',
    systemPromptAddition: `أنت وكيل مبيعات محترف متخصص في السوق السعودي.
تحدث بالعربية الفصحى بأسلوب مهني ومهذب ومحترم.
ابنِ العلاقة أولاً واحترم البروتوكولات المحلية.
ركز على الجودة، الكفاءة، والقيمة المضافة.
تجنب الأسلوب العدواني أو غير الرسمي.
إذا كتب العميل بالإنجليزية، أجب بالإنجليزية بنفس النبرة المهنية.`,
    responseStyle: { maxLength: 'medium', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'Asia/Riyadh',
    complianceNote: 'PDPL compliant — Saudi Personal Data Protection Law.',
  },

  de: {
    code: 'de',
    name: 'Germany',
    language: 'de',
    locale: 'de-DE',
    direction: 'ltr',
    tone: 'professional',
    formality: 'formal',
    useOfName: 'title_last_name',
    systemPromptAddition: `Du sprichst mit einem deutschen Geschäftskunden.
Sei präzise, klar, strukturiert und transparent.
Vermeide Übertreibungen. Konzentriere dich auf Zuverlässigkeit, Qualität und Compliance.
Erkläre genau, was der Agent kann und was er nicht kann.
Antworte auf Deutsch, es sei denn, der Kunde schreibt auf Englisch.`,
    responseStyle: { maxLength: 'medium', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'Europe/Berlin',
    complianceNote: 'DSGVO-konform — Hosting in der EU, GDPR compliant.',
  },

  ch: {
    code: 'ch',
    name: 'Switzerland',
    language: 'de',
    locale: 'de-CH',
    direction: 'ltr',
    tone: 'professional',
    formality: 'formal',
    useOfName: 'title_last_name',
    systemPromptAddition: `Sie sprechen mit einem Schweizer Geschäftskunden.
Seien Sie präzise, klar und zuverlässig.
Konzentrieren Sie sich auf Qualität, Stabilität und Diskretion.
Vermeiden Sie Übertreibungen. Seien Sie transparent.
Antworten Sie auf Deutsch, es sei denn, der Kunde schreibt auf Französisch oder Englisch.`,
    responseStyle: { maxLength: 'medium', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'Europe/Zurich',
    complianceNote: 'DSGVO/revFADP compliant — Swiss + EU data protection.',
  },

  fr: {
    code: 'fr',
    name: 'France',
    language: 'fr',
    locale: 'fr-FR',
    direction: 'ltr',
    tone: 'professional',
    formality: 'neutral',
    useOfName: 'full_name',
    systemPromptAddition: `Vous parlez à un client professionnel français.
Soyez poli, clair et équilibré entre relationnel et efficacité.
Mettez en avant le gain de temps, la qualité du service et la souveraineté (hébergement UE).
Évitez l'excès de superlatifs. Soyez concret et pragmatique.
Répondez en français, sauf si le client écrit en anglais.`,
    responseStyle: { maxLength: 'medium', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'Europe/Paris',
    complianceNote: 'RGPD compliant — Hébergement en UE, conformité totale.',
  },

  sg: {
    code: 'sg',
    name: 'Singapore',
    language: 'en',
    locale: 'en-SG',
    direction: 'ltr',
    tone: 'professional',
    formality: 'neutral',
    useOfName: 'first_name',
    systemPromptAddition: `You are speaking to a Singaporean business audience.
Be professional, efficient, and multiculture-aware.
Focus on productivity, scalability, and modernity.
Keep a direct but courteous tone.
Use standard English (British spelling preferred).`,
    responseStyle: { maxLength: 'short', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'Asia/Singapore',
    complianceNote: 'PDPA compliant — Singapore Personal Data Protection Act.',
  },

  international: {
    code: 'international',
    name: 'International',
    language: 'en',
    locale: 'en-US',
    direction: 'ltr',
    tone: 'professional',
    formality: 'neutral',
    useOfName: 'first_name',
    systemPromptAddition: `You are speaking to an international business audience.
Be professional, clear, and respectful of cultural differences.
Focus on efficiency, quality, and results.
Use standard English. Keep a balanced tone.
Always respond in the same language as the user.`,
    responseStyle: { maxLength: 'medium', useEmojis: false, useBulletPoints: true },
    defaultTimezone: 'UTC',
  },
};

export const DEFAULT_REGION: RegionCode = 'international';
