export type Locale = 'fr' | 'en';

export const locales: Locale[] = ['fr', 'en'];
export const defaultLocale: Locale = 'fr';

type TranslationDict = Record<string, string>;

const fr: TranslationDict = {
  // Nav
  'nav.features': 'Fonctionnalités',
  'nav.pricing': 'Tarifs',
  'nav.how': 'Comment ça marche',
  'nav.faq': 'FAQ',
  'nav.login': 'Connexion',
  'nav.register': 'Essai gratuit',
  // Hero
  'hero.badge': 'Offre lancement : 14 jours gratuits + 50 conversations offertes sans CB',
  'hero.title': 'Vos agents IA vendent pendant que vous dormez.',
  'hero.subtitle': '42% de conversion. 0% de dépendance Meta.',
  'hero.desc': "Stiamond crée des agents IA qui qualifient vos leads, recommandent vos produits, prennent des rendez-vous et influencent vos ventes — sur web, email, SMS et Telegram.",
  'hero.desc.bold': ' Vous gardez le contrôle total de vos canaux et de vos données.',
  'hero.cta': 'Créer mon agent gratuit',
  'hero.demo': 'Voir la démo →',
  'hero.trust': 'Déjà 127+ entreprises nous font confiance · Note 4.8/5 · Données hébergées en UE',
  'hero.bullet.nocard': 'Sans carte bancaire',
  'hero.bullet.setup': 'Setup en 5 minutes',
  'hero.bullet.cancel': 'Annulation en 1 clic',
  'hero.bullet.data': 'Données 100% à vous',
  // Features
  'features.title': 'Tout ce dont vous avez besoin pour vendre par la conversation',
  'features.subtitle': 'Pas un chatbot. Un agent qui agit.',
  // How
  'how.title': 'Comment ça marche',
  'how.subtitle': 'De la pub à la vente en 4 étapes',
  // Pricing
  'pricing.title': 'Tarifs simples, pricing au résultat',
  'pricing.subtitle': 'Payez pour ce que vous utilisez. Overage transparent. Annulation à tout moment.',
  // Guarantee
  'guarantee.title': 'Garantie 30 jours satisfait ou remboursé',
  'guarantee.desc': 'Pas de résultats ? Vous êtes remboursé intégralement. Sans questions.',
  // Testimonials
  'testimonials.title': 'Ils génèrent du revenu avec Stiamond',
  // FAQ
  'faq.title': 'Questions fréquentes',
  // CTA
  'cta.title': 'Prêt à générer du revenu par la conversation ?',
  'cta.subtitle': 'Démarrez en 5 minutes. Sans carte bancaire.',
  'cta.button': 'Créer mon compte gratuit',
  // Footer
  'footer.tagline': "L'OS des agents conversationnels orientés revenus.",
  'footer.product': 'Produit',
  'footer.company': 'Entreprise',
  'footer.legal': 'Légal',
  'footer.rights': '© 2026 Stiamond. Tous droits réservés. Construit avec ❤️ pour les PME.',
};

const en: TranslationDict = {
  'nav.features': 'Features',
  'nav.pricing': 'Pricing',
  'nav.how': 'How it works',
  'nav.faq': 'FAQ',
  'nav.login': 'Sign in',
  'nav.register': 'Free trial',
  'hero.badge': 'Launch offer: 14 days free + 50 conversations free, no credit card',
  'hero.title': 'Your AI agents sell while you sleep.',
  'hero.subtitle': '42% conversion. 0% Meta dependency.',
  'hero.desc': 'Stiamond creates AI agents that qualify your leads, recommend your products, book appointments and influence sales — across web, email, SMS and Telegram.',
  'hero.desc.bold': ' You keep full control of your channels and your data.',
  'hero.cta': 'Create my free agent',
  'hero.demo': 'See demo →',
  'hero.trust': 'Trusted by 127+ businesses · 4.8/5 rating · EU-hosted data',
  'hero.bullet.nocard': 'No credit card',
  'hero.bullet.setup': '5-minute setup',
  'hero.bullet.cancel': 'Cancel in 1 click',
  'hero.bullet.data': '100% your data',
  'features.title': 'Everything you need to sell through conversation',
  'features.subtitle': 'Not a chatbot. An agent that acts.',
  'how.title': 'How it works',
  'how.subtitle': 'From ad to sale in 4 steps',
  'pricing.title': 'Simple pricing, performance-based',
  'pricing.subtitle': 'Pay for what you use. Transparent overage. Cancel anytime.',
  'guarantee.title': '30-day money-back guarantee',
  'guarantee.desc': 'No results? Full refund. No questions asked.',
  'testimonials.title': 'They generate revenue with Stiamond',
  'faq.title': 'Frequently asked questions',
  'cta.title': 'Ready to generate revenue through conversation?',
  'cta.subtitle': 'Start in 5 minutes. No credit card.',
  'cta.button': 'Create my free account',
  'footer.tagline': 'The OS of revenue-oriented conversational agents.',
  'footer.product': 'Product',
  'footer.company': 'Company',
  'footer.legal': 'Legal',
  'footer.rights': '© 2026 Stiamond. All rights reserved. Built with ❤️ for SMBs.',
};

const translations: Record<Locale, TranslationDict> = { fr, en };

export function t(key: string, locale: Locale = defaultLocale): string {
  return translations[locale]?.[key] ?? translations[defaultLocale]?.[key] ?? key;
}

export function getLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  if (acceptLanguage.startsWith('en')) return 'en';
  return defaultLocale;
}
