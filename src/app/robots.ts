import type { MetadataRoute } from 'next';
import { getCanonicalSiteBaseUrl } from '@/lib/siteBaseUrl';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getCanonicalSiteBaseUrl();
  const origin = base.replace(/\/+$/, '');
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
          // Caminho interno / preview no apex; canónica dos mini-sites é {slug}.domínio (evita duplicata no GSC).
          '/s/',
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
