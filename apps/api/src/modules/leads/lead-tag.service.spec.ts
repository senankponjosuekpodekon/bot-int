import { Test } from '@nestjs/testing';
import { LeadTagService } from './lead-tag.service';

describe('LeadTagService', () => {
  let service: LeadTagService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LeadTagService],
    }).compile();
    service = moduleRef.get<LeadTagService>(LeadTagService);
  });

  describe('autoTag', () => {
    it('should tag pricing intent', () => {
      const tags = service.autoTag({ message: 'Quel est le prix de votre offre premium ?' });
      expect(tags).toContain('pricing');
      expect(tags).toContain('sales');
    });

    it('should tag demo intent', () => {
      const tags = service.autoTag({ message: 'Puis-je avoir une démo ?' });
      expect(tags).toContain('demo');
    });

    it('should tag support intent', () => {
      const tags = service.autoTag({ message: "J'ai un problème avec mon compte" });
      expect(tags).toContain('support');
    });

    it('should tag urgent intent', () => {
      const tags = service.autoTag({ message: "J'ai besoin d'aide urgent svp" });
      expect(tags).toContain('urgent');
    });

    it('should tag billing intent', () => {
      const tags = service.autoTag({ message: 'Je veux voir ma facture' });
      expect(tags).toContain('billing');
    });

    it('should tag multiple intents from a single message', () => {
      const tags = service.autoTag({ message: 'Je veux une démo urgente et un comparatif de vos tarifs' });
      expect(tags).toEqual(expect.arrayContaining(['demo', 'urgent', 'pricing', 'sales', 'comparison']));
    });

    it('should return empty array for neutral message', () => {
      const tags = service.autoTag({ message: 'Bonjour, comment allez-vous ?' });
      expect(tags).toEqual([]);
    });

    it('should tag source', () => {
      const tags = service.autoTag({ source: 'meta_ads' });
      expect(tags).toContain('meta-ads');
    });

    it('should tag acquisition channel', () => {
      const tags = service.autoTag({ acquisitionChannel: 'organic' });
      expect(tags).toContain('organic');
    });

    it('should tag language', () => {
      const tags = service.autoTag({ language: 'fr-FR' });
      expect(tags).toContain('lang-fr');
    });

    it('should tag region', () => {
      const tags = service.autoTag({ region: 'ae' });
      expect(tags).toContain('region-ae');
    });

    it('should tag agent type', () => {
      const tags = service.autoTag({ agentType: 'sales' });
      expect(tags).toContain('sales-agent');
    });

    it('should tag funnel stage', () => {
      const tags = service.autoTag({ funnelStage: 'decision' });
      expect(tags).toContain('funnel-decision');
    });

    it('should tag has-email and has-phone flags', () => {
      const tags = service.autoTag({ hasEmail: true, hasPhone: true });
      expect(tags).toEqual(expect.arrayContaining(['has-email', 'has-phone']));
    });

    it('should combine multiple context fields into a deduplicated tag list', () => {
      const tags = service.autoTag({
        message: 'Quel est le prix ?',
        source: 'chat',
        language: 'en',
        agentType: 'sales',
      });
      expect(tags).toEqual(
        expect.arrayContaining(['pricing', 'sales', 'web-chat', 'lang-en', 'sales-agent']),
      );
      expect(new Set(tags).size).toBe(tags.length);
    });
  });

  describe('mergeTags', () => {
    it('should merge new tags into existing tags without duplicates', () => {
      const merged = service.mergeTags(['a', 'b'], ['b', 'c']);
      expect(merged).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(merged.length).toBe(3);
    });

    it('should handle empty existing tags', () => {
      const merged = service.mergeTags(undefined, ['a']);
      expect(merged).toEqual(['a']);
    });

    it('should handle empty new tags', () => {
      const merged = service.mergeTags(['a'], []);
      expect(merged).toEqual(['a']);
    });
  });
});
