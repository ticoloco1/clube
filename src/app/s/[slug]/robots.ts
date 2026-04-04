import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';
import { getProductRootDomain } from '@/lib/siteBaseUrl';

export const dynamic = 'force-dynamic';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

/** robots.txt por mini-site: `https://{slug}.domain/robots.txt`. */
export default async function robots({ params }: { params: { slug: string } }): Promise<MetadataRoute.Robots> {
  const slug = String(params.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const host = getProductRootDomain();
  const origin = `https://${slug}.${host}`;

  if (!slug) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  const { data: site } = await getDb()
    .from('mini_sites')
    .select('published')
    .eq('slug', slug)
    .maybeSingle();

  if (!site?.published) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api'] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
