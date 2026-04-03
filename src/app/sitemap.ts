import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';
import { getSiteBaseUrl, miniSiteCanonicalUrl } from '@/lib/siteBaseUrl';

export const dynamic = 'force-dynamic';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base,             lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/slugs`,  lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/sites`,  lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/videos`, lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${base}/cv`,     lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/imoveis`,lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/carros`, lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
    { url: `${base}/planos`, lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/terms`,  lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`,lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    // Mini-sites publicados: URL canónica = subdomínio (alinha com generateMetadata do /s/[slug])
    const { data: sites } = await getDb()
      .from('mini_sites')
      .select('slug, updated_at')
      .eq('published', true)
      .order('updated_at', { ascending: false })
      .limit(1000);

    const siteUrls: MetadataRoute.Sitemap = (sites || []).map(s => ({
      url: miniSiteCanonicalUrl(s.slug),
      lastModified: new Date(s.updated_at || now),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

    // Dynamic: active classified listings
    const { data: listings } = await getDb()
      .from('classified_listings')
      .select('id, type, updated_at')
      .eq('status', 'active')
      .limit(500);

    const listingUrls: MetadataRoute.Sitemap = (listings || []).map(l => ({
      url: `${base}/${l.type === 'imovel' ? 'imoveis' : 'carros'}/${l.id}`,
      lastModified: new Date(l.updated_at || now),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...siteUrls, ...listingUrls];
  } catch {
    // If DB fails (e.g. build time), return just static pages
    return staticPages;
  }
}
