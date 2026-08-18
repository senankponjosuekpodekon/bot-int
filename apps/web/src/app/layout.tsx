import type { Metadata, Viewport } from 'next';
import './globals.css';
import ToasterProvider from '@/components/ToasterProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { CurrencyProvider } from '@/components/CurrencyProvider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stiamond.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stiamond — AI Agents That Sell, Not Just Chat',
    template: '%s | Stiamond',
  },
  description: 'Autonomous AI agent platform for SMBs and entrepreneurs. Agents qualify leads, recommend products, book appointments, and influence sales across web, email, SMS, and Telegram.',
  keywords: [
    'AI agent', 'AI chatbot', 'sales automation', 'lead qualification',
    'conversational AI', 'AI sales agent', 'funnel tracking', 'lead nurturing',
    'multi-channel AI', 'business automation', 'AI CRM', 'autonomous agent',
    'MCP server', 'revenue attribution',
  ],
  authors: [{ name: 'Stiamond' }],
  creator: 'Stiamond',
  publisher: 'Stiamond',
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
      'fr-FR': '/fr',
      'de-DE': '/de',
      'ar-AE': '/ar',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['fr_FR', 'de_DE', 'ar_AE'],
    url: SITE_URL,
    siteName: 'Stiamond',
    title: 'Stiamond — AI Agents That Sell, Not Just Chat',
    description: 'Your AI agents qualify leads, recommend products, book appointments, and influence sales. 42% average conversion. No Meta dependency.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Stiamond — Autonomous AI Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stiamond — AI Agents That Sell, Not Just Chat',
    description: 'Your AI agents qualify, recommend, book, and sell. 42% average conversion. Multi-channel. No Meta dependency.',
    images: ['/og-image.png'],
    creator: '@stiamond',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  category: 'business',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4f46e5' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1b4b' },
  ],
};

const jsonLdSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Stiamond',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
  description: "Plateforme d'agents IA autonomes pour PME. Qualifient les leads, recommandent des produits, prennent des RDV et influencent les ventes.",
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '127',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Stiamond',
    url: SITE_URL,
  },
};

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Stiamond',
  url: SITE_URL,
  description: "Plateforme d'agents IA autonomes pour PME et entrepreneurs. Qualifient les leads, recommandent des produits, prennent des rendez-vous et influencent les ventes.",
  foundingDate: '2025',
  areaServed: 'FR',
  knowsLanguage: ['fr-FR', 'en-US'],
  slogan: 'Agents IA qui vendent, pas qui chattent',
};

const jsonLdService = {
  '@context': 'https://schema.org',
  '@type': 'SaaS',
  name: 'Stiamond Agent Platform',
  provider: { '@type': 'Organization', name: 'Stiamond', url: SITE_URL },
  description: 'Agents IA autonomes pour qualification de leads, recommandation produits, prise de rendez-vous et attribution de revenus multi-canal.',
  audience: { '@type': 'BusinessAudience' },
  featureList: [
    'Agents IA autonomes avec funnel tracking',
    'Multi-canal: web chat, email, SMS, Telegram',
    'API REST sécurisée + MCP Server',
    'Attribution de revenus par canal',
    'Lead scoring automatique',
    'Intégration Stripe, Calendly, SendGrid',
  ],
};

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Stiamond dépend-il de WhatsApp ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Non. Stiamond est channel-agnostic. Web chat, email, SMS, Telegram, et WhatsApp en option. Vous gardez le contrôle total de vos canaux et de vos données.',
      },
    },
    {
      '@type': 'Question',
      name: "Comment fonctionne l'agent IA Stiamond ?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "L'agent utilise un LLM (Ollama en local ou API) avec votre base de connaissances, catalogue produits et personnalité. Il qualifie les leads, recommande des produits, envoie des devis, prend des rendez-vous et influence les ventes.",
      },
    },
    {
      '@type': 'Question',
      name: 'Y a-t-il un plan gratuit ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui, le plan Free inclut 50 conversations par mois avec 1 agent sur web chat uniquement, sans carte bancaire. Vous pouvez upgrader à tout moment vers Starter (29€), Growth (99€) ou Scale (249€).',
      },
    },
    {
      '@type': 'Question',
      name: 'Qu\'est-ce que le MCP Server de Stiamond ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Le Model Context Protocol est le standard ouvert pour connecter les agents IA à des outils externes. Stiamond expose vos agents comme MCP Server : n'importe quel client MCP (Claude, Cursor, VS Code) peut les appeler pour qualifier des leads, récupérer des conversations ou créer des agents.",
      },
    },
    {
      '@type': 'Question',
      name: 'Mes données sont-elles sécurisées ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Oui. Vos données sont isolées par tenant, JWT auth, Helmet headers, rate limiting, API keys hashées avec bcrypt. Données hébergées en UE, conformité RGPD. Vous êtes propriétaire de vos données.',
      },
    },
    {
      '@type': 'Question',
      name: 'Quels canaux sont supportés ?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Web chat (widget intégrable), email (SendGrid), SMS (Twilio), Telegram Bot API, et WhatsApp (optionnel). Le plan Free est limité au web chat. Les plans payants débloquent email, SMS et multi-canal.',
      },
    },
  ],
};

const jsonLdHowTo = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'Comment créer un agent IA avec Stiamond',
  description: 'De la pub à la vente en 4 étapes avec Stiamond',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Attirez vos visiteurs',
      text: 'Meta Ads, Google Ads, QR code, organique. Chaque visiteur est tracé avec son canal d\'origine pour attribution de revenus.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Qualifiez automatiquement',
      text: "L'agent IA pose les bonnes questions, détecte le budget, l'urgence et le besoin. Classification automatique dans le funnel: Awareness → Interest → Qualification → Consideration → Decision.",
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Convertissez en revenus',
      text: "L'agent propose un devis, envoie un lien de paiement Stripe, booke un rendez-vous Calendly. Conversion automatisée.",
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Mesurez et optimisez',
      text: 'ROI par canal, taux de conversion par étape du funnel, revenus influencés par agent. Optimisez votre budget acquisition.',
    },
  ],
};

const allJsonLd = [jsonLdSoftware, jsonLdOrg, jsonLdService, jsonLdFaq, jsonLdHowTo];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {allJsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <link rel="alternate" type="text/markdown" href="/llms.txt" title="LLM-readable summary" />
        <link rel="alternate" type="text/markdown" href="/ai-summary.md" title="AI summary" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <CurrencyProvider>
          <ToasterProvider />
          <ServiceWorkerRegister />
          {children}
        </CurrencyProvider>
      </body>
    </html>
  );
}
