import { Injectable } from '@nestjs/common';
import { Conversation, FunnelStage, AcquisitionChannel } from './conversation.entity';

// Pure functions for funnel progression, intent scoring and channel detection.
// No I/O — extracted from ChatService so the heuristics can be unit-tested and
// reused without pulling the whole chat pipeline.
@Injectable()
export class ScoringService {
  detectFunnelStage(message: string, currentStage: FunnelStage): FunnelStage {
    const msg = message.toLowerCase();
    const stageOrder = [
      FunnelStage.AWARENESS,
      FunnelStage.INTEREST,
      FunnelStage.QUALIFICATION,
      FunnelStage.CONSIDERATION,
      FunnelStage.DECISION,
    ];
    const currentIndex = stageOrder.indexOf(currentStage);

    // Decision signals — explicit buying/commitment intent only
    if (/acheter|payer|commander|checkout|payment|je prends|valider|confirmer|c'est parti|go|ok je|parfait|je veux (acheter|prendre|commander|valider|confirmer|payer|souscrire)|je vais (acheter|prendre|commander|valider|confirmer|payer|souscrire)/.test(msg)) {
      return FunnelStage.DECISION;
    }

    // Consideration signals — asking for quotes, comparisons, recommendations
    if (/devis|tarif|prix|combien|co[uû]te|compar|recommand|lequel|quelle option|diff[eé]rence|avantage/.test(msg)) {
      return Math.max(currentIndex, 3) >= 3 ? FunnelStage.CONSIDERATION : FunnelStage.CONSIDERATION;
    }

    // Qualification signals — sharing info about themselves, budget, needs
    if (/budget|j'ai besoin|mon projet|ma situation|urgence|d[eé]lai|quand|pour quand|mon besoin/.test(msg)) {
      return Math.max(currentIndex, 2) >= 2 ? FunnelStage.QUALIFICATION : FunnelStage.QUALIFICATION;
    }

    // Interest signals — asking questions about product/service
    if (/comment|pourquoi|qu'est-ce|c'est quoi|fonctionne|vous faites|vous proposez|service|produit|capacit[eé]|possible de/.test(msg)) {
      return Math.max(currentIndex, 1) >= 1 ? FunnelStage.INTEREST : FunnelStage.INTEREST;
    }

    return currentStage;
  }

  calculateIntentScore(message: string, currentScore: number): number {
    const msg = message.toLowerCase();
    let delta = 0;

    // High intent signals
    if (/acheter|payer|commander|checkout|je prends|je veux bien|valider|confirmer/.test(msg)) delta += 15;
    if (/devis|tarif|prix|combien|co[uû]te/.test(msg)) delta += 10;
    if (/rendez-vous|rdv|appointment|meeting|consultation|d[eé]mo/.test(msg)) delta += 10;
    if (/budget|j'ai besoin|urgence|d[eé]lai/.test(msg)) delta += 8;
    if (/contact|t[eé]l[eé]phone|email|appeler|recontacter/.test(msg)) delta += 5;
    if (/int[eé]ress[eé]|plut[^o]t|j'aime|bien|parfait/.test(msg)) delta += 5;

    // Negative signals
    if (/trop cher|pas maintenant|je r[eé]fl[eé]chis|plus tard|pas int[eé]ress[eé]/.test(msg)) delta -= 10;
    if (/au revoir|merci|c'est tout|rien d'autre/.test(msg)) delta -= 3;

    return Math.max(0, Math.min(100, currentScore + delta));
  }

  detectAcquisitionChannel(tracking?: {
    utmParams?: { source?: string; medium?: string; campaign?: string };
    referrerUrl?: string;
    landingPageUrl?: string;
  }): AcquisitionChannel {
    if (!tracking) return AcquisitionChannel.UNKNOWN;

    const utm = tracking.utmParams;
    if (utm?.source) {
      const src = utm.source.toLowerCase();
      if (src.includes('facebook') || src.includes('instagram') || src.includes('meta')) return AcquisitionChannel.META_ADS;
      if (src.includes('google') || src.includes('adwords')) return AcquisitionChannel.GOOGLE_ADS;
      if (src.includes('newsletter') || src.includes('email')) return AcquisitionChannel.EMAIL;
      if (utm.medium === 'social' || src.includes('social')) return AcquisitionChannel.SOCIAL;
      if (src.includes('referral')) return AcquisitionChannel.REFERRAL;
    }

    if (tracking.referrerUrl) {
      const ref = tracking.referrerUrl.toLowerCase();
      if (ref.includes('facebook') || ref.includes('instagram')) return AcquisitionChannel.SOCIAL;
      if (ref.includes('google.')) return AcquisitionChannel.ORGANIC;
      if (ref.includes('t.co') || ref.includes('twitter') || ref.includes('linkedin')) return AcquisitionChannel.SOCIAL;
    }

    if (tracking.landingPageUrl) {
      const landing = tracking.landingPageUrl.toLowerCase();
      if (landing.includes('/site/')) return AcquisitionChannel.LANDING_PAGE;
      if (landing.includes('/chat/')) return AcquisitionChannel.PUBLIC_LINK;
      if (landing.includes('qr=')) return AcquisitionChannel.QR_CODE;
    }

    return AcquisitionChannel.UNKNOWN;
  }

  // Fit score (0-100): how well this conversation matches an ideal, sales-ready
  // lead, based on data completeness rather than message content alone.
  calculateFitScore(conversation: Conversation, historyLength: number): number {
    let score = 0;
    if (conversation.leadId) score += 30;
    const stageOrder = [
      FunnelStage.AWARENESS,
      FunnelStage.INTEREST,
      FunnelStage.QUALIFICATION,
      FunnelStage.CONSIDERATION,
      FunnelStage.DECISION,
    ];
    const stageIndex = stageOrder.indexOf(conversation.funnelStage);
    if (stageIndex >= 2) score += 25; // reached QUALIFICATION or beyond
    if (conversation.intentScore >= 50) score += 25;
    if (historyLength >= 3) score += 20; // sustained engagement, not a one-off message
    return Math.max(0, Math.min(100, score));
  }

  // Purchase probability (0-1): blends real-time intent signals with funnel progression.
  calculatePurchaseProbability(intentScore: number, funnelStage: FunnelStage): number {
    const stageWeight: Record<FunnelStage, number> = {
      [FunnelStage.AWARENESS]: 0.05,
      [FunnelStage.INTEREST]: 0.15,
      [FunnelStage.QUALIFICATION]: 0.35,
      [FunnelStage.CONSIDERATION]: 0.55,
      [FunnelStage.DECISION]: 0.85,
      [FunnelStage.CLOSED_WON]: 1,
      [FunnelStage.CLOSED_LOST]: 0,
    };
    const probability = (intentScore / 100) * 0.5 + (stageWeight[funnelStage] ?? 0) * 0.5;
    return Math.round(Math.max(0, Math.min(1, probability)) * 100) / 100;
  }

  // Stage-specific guidance injected into the agent system prompt.
  getStageGuidance(stage: FunnelStage): string | null {
    const guidance: Record<FunnelStage, string> = {
      [FunnelStage.AWARENESS]: `Le visiteur découvre votre entreprise. Sois accueillant, pose UNE question ouverte pour identifier d'abord son secteur et son problème principal. Ne demande jamais de budget, ne parle pas de prix, ne présente pas d'offre. Objectif: comprendre son contexte et l'orienter.`,
      [FunnelStage.INTEREST]: `Le visiteur montre de l'intérêt. Explique brièvement un bénéfice clé lié à ce qu'il a dit, puis pose UNE seule question de suivi pour approfondir son contexte, secteur et besoin. Ne demande pas de budget. N'enchaîne pas plusieurs questions. Objectif: qualifier progressivement avant toute proposition.`,
      [FunnelStage.QUALIFICATION]: `Le visiteur partage des informations sur son besoin. Qualifie-le progressivement: identifie d'abord le secteur et le problème, puis ne pose UNE seule question à la fois. Ne demande le budget qu'après avoir identifié le secteur et le problème. Ne redemande jamais une information déjà donnée dans la conversation. Si le profil correspond, propose une solution concrète avant de parler prix. Objectif: valider le fit sans donner l'impression d'un formulaire.`,
      [FunnelStage.CONSIDERATION]: `Le visiteur évalue vos solutions. Donne des détails précis (prix, comparaison, options). Adresse ses objections. Propose un devis ou une démo. Objectif: l'aider à décider.`,
      [FunnelStage.DECISION]: `Le visiteur est prêt à acheter/réserver. Facilite l'action: lien de paiement, prise de RDV, confirmation de commande. Sois direct et rassurant. Objectif: closing.`,
      [FunnelStage.CLOSED_WON]: `Le visiteur a converti. Remercie-le, confirme les prochaines étapes, propose un suivi. Objectif: fidélisation.`,
      [FunnelStage.CLOSED_LOST]: `Le visiteur n'est pas prêt ou a refusé. Reste courtois, propose de revenir vers lui plus tard, laisse une bonne impression. Objectif: nurturing.`,
    };
    return guidance[stage] || null;
  }
}
