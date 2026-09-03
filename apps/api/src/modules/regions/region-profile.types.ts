export type RegionCode =
  | 'us'
  | 'uk'
  | 'ae'
  | 'sa'
  | 'de'
  | 'ch'
  | 'fr'
  | 'sg'
  | 'international';

export type TextDirection = 'ltr' | 'rtl';

export type Tone = 'direct' | 'professional' | 'relational' | 'formal';
export type Formality = 'casual' | 'neutral' | 'formal';
export type UseOfName = 'first_name' | 'full_name' | 'title_last_name';
export type ResponseLength = 'short' | 'medium' | 'long';

export interface ResponseStyle {
  maxLength: ResponseLength;
  useEmojis: boolean;
  useBulletPoints: boolean;
}

export interface RegionProfile {
  code: RegionCode;
  name: string;
  language: string;
  locale: string;
  direction: TextDirection;

  tone: Tone;
  formality: Formality;
  useOfName: UseOfName;

  systemPromptAddition: string;

  responseStyle: ResponseStyle;

  defaultTimezone: string;
  businessHours?: { start: number; end: number };
  complianceNote?: string;
}
