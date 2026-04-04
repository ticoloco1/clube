import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';
import { getCanonicalSiteBaseUrl, getProductRootDomain, miniSiteUrlOnRoot } from '@/lib/siteBaseUrl';

export type SeoUrlCategory = 'static' | 'minisite' | 'listing';

export type SeoUrlRow = {
  url: string;
  category: SeoUrlCategory;
  lastModified?: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
};

export type SeoUrlInventory = {
  generatedAt: string;
  canonicalBase: string;
  productRoot: string;
  sitemapUrl: string;
  robotsUrl: string;
  counts: { static: number; minisite: number; listing: number; total: number };
  urls: SeoUrlRow[];
};

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const STATIC_DEFS: {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'hourly';
  priority: number;
}[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/slugs', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/sites', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/videos', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/cv', changeFrequency: 'daily', priority: 0.8 },
  { path: '/imoveis', changeFrequency: 'daily', priority: 0.7 },
  { path: '/carros', changeFrequency: 'daily', priority: 0.7 },
  { path: '/planos', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
];

/**
 * Mesmas URLs que entram no sitemap principal — para auditoria, cópia na Search Console ou IndexNow.
 */
export async function getSeoUrlInventory(): Promise<SeoUrlInventory> {
  const base = (await getCanonicalSiteBaseUrl()).replace(/\/+$/, '');
  const productRoot = getProductRootDomain();
  const generatedAt = new Date().toISOString();

  const urls: SeoUrlRow[] = STATIC_DEFS.map((def) => ({
    url: def.path ? `${base}${def.path}` : base,
    category: 'static' as const,
    lastModified: generatedAt,
    changeFrequency: def.changeFrequency,
    priority: def.priority,
  }));

  try {
    const { data: sites } = await getDb()
      .from('mini_sites')
      .select('slug, updated_at')
      .eq('published', true)
      .order('updated_at', { ascending: false })
      .limit(1000);

    for (const s of sites || []) {
      const u = miniSiteUrlOnRoot(s.slug, productRoot);
      if (!u) continue;
      urls.push({
        url: u.replace(/\/+$/, ''),
        category: 'minisite',
        lastModified: (s as { updated_at?: string }).updated_at || generatedAt,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }

    const { data: listings } = await getDb()
      .from('classified_listings')
      .select('id, type, updated_at')
      .eq('status', 'active')
      .limit(500);

    for (const l of listings || []) {
      const path = (l as { type?: string }).type === 'imovel' ? 'imoveis' : 'carros';
      urls.push({
        url: `${base}/${path}/${(l as { id: string }).id}`,
        category: 'listing',
        lastModified: (l as { updated_at?: string }).updated_at || generatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    /* igual ao sitemap: mantém só estáticos */
  }

  const counts = {
    static: urls.filter((r) => r.category === 'static').length,
    minisite: urls.filter((r) => r.category === 'minisite').length,
    listing: urls.filter((r) => r.category === 'listing').length,
    total: urls.length,
  };

  return {
    generatedAt,
    canonicalBase: base,
    productRoot,
    sitemapUrl: `${base}/sitemap.xml`,
    robotsUrl: `${base}/robots.txt`,
    counts,
    urls,
  };
}

export function inventoryToMetadataSitemap(inv: SeoUrlInventory): MetadataRoute.Sitemap {
  return inv.urls.map((row) => ({
    url: row.url,
    lastModified: new Date(row.lastModified || inv.generatedAt),
    changeFrequency: row.changeFrequency,
    priority: row.priority,
  }));
}
