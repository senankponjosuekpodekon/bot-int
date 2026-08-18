import { Test } from '@nestjs/testing';
import { RegionsService } from './regions.service';

describe('RegionsService', () => {
  let service: RegionsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RegionsService],
    }).compile();
    service = moduleRef.get<RegionsService>(RegionsService);
  });

  describe('getProfile', () => {
    it('should return the profile for a valid region code', () => {
      const profile = service.getProfile('fr');
      expect(profile).toBeDefined();
      expect(profile.code).toBe('fr');
    });

    it('should fall back to default for unknown region', () => {
      const profile = service.getProfile('xx' as any);
      expect(profile).toBeDefined();
    });
  });

  describe('getAllProfiles', () => {
    it('should return a non-empty array of profiles', () => {
      const profiles = service.getAllProfiles();
      expect(profiles.length).toBeGreaterThan(0);
    });
  });

  describe('getTextDirection', () => {
    it('should return rtl for Arabic', () => {
      expect(service.getTextDirection('ar')).toBe('rtl');
    });

    it('should return rtl for Hebrew', () => {
      expect(service.getTextDirection('he')).toBe('rtl');
    });

    it('should return ltr for French', () => {
      expect(service.getTextDirection('fr')).toBe('ltr');
    });

    it('should return ltr for English', () => {
      expect(service.getTextDirection('en')).toBe('ltr');
    });

    it('should handle locale with region suffix', () => {
      expect(service.getTextDirection('ar-SA')).toBe('rtl');
    });
  });

  describe('detectRegion', () => {
    it('should use userSelectedRegion first', async () => {
      const region = await service.detectRegion({ userSelectedRegion: 'fr', phone: '+1' });
      expect(region).toBe('fr');
    });

    it('should detect from US phone', async () => {
      const region = await service.detectRegion({ phone: '+1 555 123 4567' });
      expect(region).toBe('us');
    });

    it('should detect from UK phone', async () => {
      const region = await service.detectRegion({ phone: '+44 20 1234 5678' });
      expect(region).toBe('uk');
    });

    it('should detect from French phone', async () => {
      const region = await service.detectRegion({ phone: '+33 6 12 34 56 78' });
      expect(region).toBe('fr');
    });

    it('should detect from German phone', async () => {
      const region = await service.detectRegion({ phone: '+49 30 1234 5678' });
      expect(region).toBe('de');
    });

    it('should detect from UAE phone', async () => {
      const region = await service.detectRegion({ phone: '+971 50 123 4567' });
      expect(region).toBe('ae');
    });

    it('should detect from timezone — Paris', async () => {
      const region = await service.detectRegion({ timezone: 'Europe/Paris' });
      expect(region).toBe('fr');
    });

    it('should detect from timezone — London', async () => {
      const region = await service.detectRegion({ timezone: 'Europe/London' });
      expect(region).toBe('uk');
    });

    it('should detect from timezone — Berlin', async () => {
      const region = await service.detectRegion({ timezone: 'Europe/Berlin' });
      expect(region).toBe('de');
    });

    it('should detect from browser language — ar', async () => {
      const region = await service.detectRegion({ browserLanguage: 'ar-SA' });
      expect(region).toBe('ae');
    });

    it('should detect from browser language — fr', async () => {
      const region = await service.detectRegion({ browserLanguage: 'fr-FR' });
      expect(region).toBe('fr');
    });

    it('should detect from browser language — en-GB', async () => {
      const region = await service.detectRegion({ browserLanguage: 'en-GB' });
      expect(region).toBe('uk');
    });

    it('should detect from browser language — en (default US)', async () => {
      const region = await service.detectRegion({ browserLanguage: 'en' });
      expect(region).toBe('us');
    });

    it('should return default when no context provided', async () => {
      const region = await service.detectRegion({});
      expect(region).toBeDefined();
    });

    it('should prioritize userSelectedRegion over phone', async () => {
      const region = await service.detectRegion({ userSelectedRegion: 'sa', phone: '+33' });
      expect(region).toBe('sa');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should append regional adaptation to base prompt', () => {
      const prompt = service.buildSystemPrompt('You are a helpful agent.', 'fr');
      expect(prompt).toContain('You are a helpful agent.');
      expect(prompt).toContain('REGIONAL ADAPTATION');
      expect(prompt).toContain('Language:');
    });

    it('should include selling points', () => {
      const prompt = service.buildSystemPrompt('Base', 'us');
      expect(prompt).toContain('Key selling points');
    });
  });

  describe('getRegionFromLocale', () => {
    it('should map ar locale to ae', () => {
      expect(service.getRegionFromLocale('ar')).toBe('ae');
    });

    it('should map fr locale to fr', () => {
      expect(service.getRegionFromLocale('fr-FR')).toBe('fr');
    });

    it('should map en-GB to uk', () => {
      expect(service.getRegionFromLocale('en-GB')).toBe('uk');
    });

    it('should map en to us', () => {
      expect(service.getRegionFromLocale('en')).toBe('us');
    });

    it('should return default for unknown locale', () => {
      const region = service.getRegionFromLocale('zh');
      expect(region).toBeDefined();
    });
  });
});
