import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stiamond.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes = [
    { url: SITE_URL, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${SITE_URL}/fr`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `${SITE_URL}/login`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${SITE_URL}/register`, priority: 0.8, changeFrequency: 'monthly' as const },
  ];

  return staticRoutes.map((route) => ({
    url: route.url,
    lastModified,
    priority: route.priority,
    changeFrequency: route.changeFrequency,
  }));
}
