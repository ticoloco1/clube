import { getServiceDb } from '@/lib/livelyAvatarServer';

export type MagicBoostPayload = {
  campaignId: string;
  brandColor: string | null;
  productLabel: string | null;
  tone: string;
  scriptRaw: string;
  polishedScript: string | null;
  ttsPublicUrl: string | null;
  title: string | null;
};

function normalizeBoost(row: { id: string; magic_boost: unknown }): MagicBoostPayload | null {
  const m = row.magic_boost as Record<string, unknown> | null;
  if (!m || typeof m !== 'object') return null;
  const scriptRaw = typeof m.scriptRaw === 'string' ? m.scriptRaw : '';
  const productLabel = typeof m.productLabel === 'string' ? m.productLabel : null;
  const polished = typeof m.polishedScript === 'string' ? m.polishedScript : null;
  if (!productLabel?.trim() && !scriptRaw.trim() && !polished) return null;
  return {
    campaignId: row.id,
    brandColor: typeof m.brandColor === 'string' ? m.brandColor : null,
    productLabel,
    tone: m.tone === 'wild_monkey' ? 'wild_monkey' : 'professional',
    scriptRaw,
    polishedScript: typeof m.polishedScript === 'string' ? m.polishedScript : null,
    ttsPublicUrl: typeof m.ttsPublicUrl === 'string' ? m.ttsPublicUrl : null,
    title: typeof m.title === 'string' ? m.title : null,
  };
}

/** Campanha ativa com dados de boost mágico para um slug público. */
export async function getActiveMagicBoostForSlug(slug: string): Promise<MagicBoostPayload | null> {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  const db = getServiceDb();
  const { data: site } = await db.from('mini_sites').select('id, published').eq('slug', s).maybeSingle();
  if (!site || !(site as { published?: boolean }).published) return null;

  const now = new Date().toISOString();
  const { data: campaigns } = await db
    .from('ad_campaigns' as never)
    .select('id, magic_boost, ends_at, status')
    .eq('site_id', (site as { id: string }).id)
    .eq('status', 'active')
    .gt('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(5);

  for (const c of campaigns || []) {
    const row = c as { id: string; magic_boost: unknown };
    const n = normalizeBoost(row);
    if (n) return n;
  }
  return null;
}
