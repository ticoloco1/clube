import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
      // Allow Google to crawl mini sites
      {
        userAgent: 'Googlebot',
        allow: ['/s/', '/sites', '/cv', '/videos', '/slugs', '/imoveis', '/carros'],
      },
    ],
    sitemap: 'https://trustbank.xyz/sitemap.xml',
    host: 'https://trustbank.xyz',
  };
}
