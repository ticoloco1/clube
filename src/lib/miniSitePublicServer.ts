import { createClient } from '@supabase/supabase-js';
import type { MiniSite } from '@/hooks/useSite'; // type-only — mesmo shape que mini_sites

function normalizeSlug(slug: string): string {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

/** Dados do mini-site publicado para pré-render no servidor (SEO / HTML inicial). */
export async function fetchPublishedMiniSiteForSsr(slug: string): Promise<MiniSite | null> {
  const s = normalizeSlug(slug);
  if (!s) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const baseQuery = supabase
    .from('mini_sites')
    .select('*')
    .eq('slug', s);
  const primary = await baseQuery
    .eq('published', true)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (!primary.error && Array.isArray(primary.data) && primary.data[0]) {
    return primary.data[0] as MiniSite;
  }

  // Fallback for old schemas without `published` column.
  const fallback = await supabase
    .from('mini_sites')
    .select('*')
    .eq('slug', s)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (!fallback.error && Array.isArray(fallback.data) && fallback.data[0]) {
    return fallback.data[0] as MiniSite;
  }

  const caseInsensitive = await supabase
    .from('mini_sites')
    .select('*')
    .ilike('slug', s)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (caseInsensitive.error || !Array.isArray(caseInsensitive.data) || !caseInsensitive.data[0]) return null;
  return caseInsensitive.data[0] as MiniSite;
}
