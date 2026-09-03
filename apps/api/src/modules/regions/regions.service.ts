import { Injectable, Logger } from '@nestjs/common';
import { RegionCode, RegionProfile, TextDirection } from './region-profile.types';
import { REGION_PROFILES, DEFAULT_REGION } from './region-profiles';

export interface RegionDetectionContext {
  ip?: string;
  phone?: string;
  browserLanguage?: string;
  timezone?: string;
  userSelectedRegion?: RegionCode;
}

@Injectable()
export class RegionsService {
  private readonly logger = new Logger(RegionsService.name);

  getProfile(code: RegionCode): RegionProfile {
    return REGION_PROFILES[code] || REGION_PROFILES[DEFAULT_REGION];
  }

  getAllProfiles(): RegionProfile[] {
    return Object.values(REGION_PROFILES);
  }

  getTextDirection(language: string): TextDirection {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    const lang = language.toLowerCase().split('-')[0];
    return rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
  }

  async detectRegion(ctx: RegionDetectionContext): Promise<RegionCode> {
    // 1. Explicit user choice (most reliable)
    if (ctx.userSelectedRegion && REGION_PROFILES[ctx.userSelectedRegion]) {
      return ctx.userSelectedRegion;
    }

    // 2. Phone number (very reliable)
    if (ctx.phone) {
      const phone = ctx.phone.replace(/\s/g, '');
      if (phone.startsWith('+1')) return 'us';
      if (phone.startsWith('+44')) return 'uk';
      if (phone.startsWith('+971')) return 'ae';
      if (phone.startsWith('+966')) return 'sa';
      if (phone.startsWith('+49')) return 'de';
      if (phone.startsWith('+41')) return 'ch';
      if (phone.startsWith('+33')) return 'fr';
      if (phone.startsWith('+65')) return 'sg';
    }

    // 3. Timezone
    if (ctx.timezone) {
      const tz = ctx.timezone.toLowerCase();
      if (tz.includes('dubai') || tz.includes('riyadh')) return 'ae';
      if (tz.includes('berlin') || tz.includes('zurich')) return 'de';
      if (tz.includes('paris')) return 'fr';
      if (tz.includes('london')) return 'uk';
      if (tz.includes('singapore')) return 'sg';
      if (tz.includes('new_york') || tz.includes('los_angeles') || tz.includes('chicago') || tz.includes('denver') || tz.includes('phoenix')) return 'us';
    }

    // 4. Browser language
    if (ctx.browserLanguage) {
      const lang = ctx.browserLanguage.toLowerCase();
      if (lang.startsWith('ar')) return 'ae';
      if (lang.startsWith('de')) return 'de';
      if (lang.startsWith('fr')) return 'fr';
      if (lang.startsWith('en-gb') || lang.startsWith('en-au') || lang.startsWith('en-nz')) return 'uk';
      if (lang.startsWith('en-sg')) return 'sg';
      if (lang.startsWith('en')) return 'us';
    }

    // 5. IP-based detection via ipapi.co
    if (ctx.ip) {
      try {
        const region = await this.detectRegionFromIp(ctx.ip);
        if (region) return region;
      } catch (err: any) {
        this.logger.warn(`IP region detection failed: ${err?.message}`);
      }
    }

    return DEFAULT_REGION;
  }

  private async detectRegionFromIp(ip: string): Promise<RegionCode | null> {
    const axios = require('axios');
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
    const country = response.data?.country_code;

    const countryMap: Record<string, RegionCode> = {
      US: 'us',
      GB: 'uk',
      AU: 'us',
      CA: 'us',
      NZ: 'uk',
      AE: 'ae',
      SA: 'sa',
      QA: 'ae',
      KW: 'ae',
      BH: 'ae',
      OM: 'ae',
      DE: 'de',
      CH: 'ch',
      AT: 'de',
      FR: 'fr',
      BE: 'fr',
      LU: 'fr',
      SG: 'sg',
    };

    return countryMap[country] || null;
  }

  buildSystemPrompt(basePrompt: string, region: RegionCode): string {
    const profile = this.getProfile(region);
    const sellingPoints = profile.keySellingPoints?.length
      ? `\nKey selling points to prioritize:\n${profile.keySellingPoints.map((p) => `- ${p}`).join('\n')}`
      : '';
    const complianceLine = profile.complianceNote ? `\nCompliance: ${profile.complianceNote}` : '';

    return `${basePrompt}

=== REGIONAL ADAPTATION ===
Region: ${profile.name}
Language: ${profile.language}
Direction: ${profile.direction}

${profile.systemPromptAddition}${sellingPoints}

Communication style:
- Tone: ${profile.tone}
- Formality: ${profile.formality}
- Response length: ${profile.responseStyle.maxLength}
- Use bullet points: ${profile.responseStyle.useBulletPoints}
- Use emojis: ${profile.responseStyle.useEmojis}
${complianceLine}
=== END REGIONAL ADAPTATION ===`;
  }

  getRegionFromLocale(locale: string): RegionCode {
    const lang = locale.toLowerCase();
    if (lang.startsWith('ar')) return 'ae';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('en-gb') || lang.startsWith('en-au')) return 'uk';
    if (lang.startsWith('en-sg')) return 'sg';
    if (lang.startsWith('en')) return 'us';
    return DEFAULT_REGION;
  }
}
