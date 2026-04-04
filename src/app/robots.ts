import type { MetadataRoute } from 'next';
import { getCanonicalSiteBaseUrl } from '@/lib/siteBaseUrl';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getCanonicalSiteBaseUrl();
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
  };
}
