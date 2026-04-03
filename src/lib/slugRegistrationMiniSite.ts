/**
 * PostgREST só faz embed automático com FK no schema.
 * slug_registrations não referencia mini_sites — fazemos o join por slug em duas queries.
 */
export async function attachMiniSitesToSlugRows(
  supabase: { from: (t: string) => any },
  rows: Record<string, unknown>[] | null | undefined,
): Promise<any[]> {
  const list = rows || [];
  if (!list.length) return list as any[];
  const slugs = [...new Set(list.map((r) => (r as { slug?: string }).slug).filter(Boolean))] as string[];
  if (!slugs.length) return list as any[];
  const { data: sites } = await supabase
    .from('mini_sites')
    .select('slug, site_name, published, avatar_url, user_id')
    .in('slug', slugs);
  const map = new Map<string, { slug: string; site_name: string; published: boolean; avatar_url?: string | null; user_id: string }>();
  for (const s of sites || []) {
    if (s?.slug) map.set(s.slug, s as any);
  }
  return list.map((r) => {
    const slug = (r as { slug?: string }).slug;
    const mini = slug ? map.get(slug) : undefined;
    return { ...r, mini_sites: mini ?? null };
  });
}
