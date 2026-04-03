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
  const { data, error } = await supabase
    .from('mini_sites')
    .select('*')
    .eq('slug', s)
    .eq('published', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as MiniSite;
}
