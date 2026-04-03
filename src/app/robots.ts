import type { MetadataRoute } from 'next';
import { getSiteBaseUrl } from '@/lib/siteBaseUrl';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/governance',
          '/dashboard',
          '/editor',
          '/creditos',
          '/auth',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/s/', '/sites', '/cv', '/videos', '/slugs', '/imoveis', '/carros'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
