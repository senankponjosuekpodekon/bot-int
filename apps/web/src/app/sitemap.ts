import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stiamond.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes = [
    { url: SITE_URL, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${SITE_URL}/fr`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `${SITE_URL}/de`, priority: 0.8, changeFrequency: 'daily' as const },
    { url: `${SITE_URL}/ar`, priority: 0.8, changeFrequency: 'daily' as const },
    { url: `${SITE_URL}/register`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${SITE_URL}/login`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${SITE_URL}/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/privacy`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/gdpr`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/fr/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/fr/privacy`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/fr/gdpr`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/de/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/de/privacy`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/de/gdpr`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/ar/terms`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/ar/privacy`, priority: 0.3, changeFrequency: 'yearly' as const },
    { url: `${SITE_URL}/ar/gdpr`, priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  return staticRoutes.map((route) => ({
    url: route.url,
    lastModified,
    priority: route.priority,
    changeFrequency: route.changeFrequency,
  }));
}
