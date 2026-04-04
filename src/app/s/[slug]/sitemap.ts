import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';
import { getProductRootDomain } from '@/lib/siteBaseUrl';

export const dynamic = 'force-dynamic';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

/** Sitemap por subdomínio: `https://{slug}.domain/sitemap.xml` (via middleware → /s/{slug}/sitemap.xml). */
export default async function sitemap({ params }: { params: { slug: string } }): Promise<MetadataRoute.Sitemap> {
  const slug = String(params.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  if (!slug) return [];

  const { data: site } = await getDb()
    .from('mini_sites')
    .select('published, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (!site?.published) return [];

  const host = getProductRootDomain();
  const base = `https://${slug}.${host}`;
  const lastMod = new Date((site as { updated_at?: string }).updated_at || Date.now());

  return [
    {
      url: `${base}/`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
