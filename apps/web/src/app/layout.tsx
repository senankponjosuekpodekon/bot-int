import type { Metadata, Viewport } from 'next';
import './globals.css';
import ToasterProvider from '@/components/ToasterProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stiamond.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stiamond — Agents IA qui vendent, pas qui chattent',
    template: '%s | Stiamond',
  },
  description: "Plateforme d'agents IA autonomes pour PME et entrepreneurs. Qualifient les leads, recommandent des produits, prennent des rendez-vous et influencent les ventes — sur web, email, SMS et Telegram.",
  keywords: [
    'agent IA', 'chatbot IA', 'automatisation ventes', 'qualification leads',
    'conversational AI', 'AI sales agent', 'funnel tracking', 'lead nurturing',
    'multi-canal IA', 'business automation', 'CRM IA', 'agent autonome',
  ],
  authors: [{ name: 'Stiamond' }],
  creator: 'Stiamond',
  publisher: 'Stiamond',
  alternates: {
    canonical: '/',
    languages: {
      'fr-FR': '/',
      'en-US': '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    alternateLocale: 'en_US',
    url: SITE_URL,
    siteName: 'Stiamond',
    title: 'Stiamond — Agents IA qui vendent, pas qui chattent',
    description: 'Vos agents IA qualifient les leads, recommandent des produits, prennent des RDV et influencent les ventes. 42% de conversion moyenne. Sans dépendance Meta.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Stiamond — Agents IA autonomes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stiamond — Agents IA qui vendent, pas qui chattent',
    description: 'Vos agents IA qualifient, recommandent, bookent et vendent. 42% de conversion moyenne. Multi-canal. Sans dépendance Meta.',
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

const jsonLd = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ToasterProvider />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
