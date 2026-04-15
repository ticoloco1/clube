import type { SupabaseClient } from '@supabase/supabase-js';

export type StripeConnectSiteRow = {
  slug: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean | null;
};

/** Escolhe mini-site com Connect ativo; fallback para o mais recente. */
export async function getMiniSiteStripeForUser(
  db: SupabaseClient,
  userId: string,
): Promise<StripeConnectSiteRow | null> {
  const { data: connected } = await db
    .from('mini_sites')
    .select('slug, stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('user_id', userId)
    .not('stripe_connect_account_id', 'is', null)
    .eq('stripe_connect_charges_enabled', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (connected) return connected as StripeConnectSiteRow;

  const { data: anySite } = await db
    .from('mini_sites')
    .select('slug, stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (anySite as StripeConnectSiteRow) || null;
}

/** Liberta `slug` no mini-site do vendedor para o comprador poder aplicar o slug. */
export async function releaseMiniSiteSlugFromSeller(
  db: SupabaseClient,
  sellerUserId: string,
  slug: string,
): Promise<void> {
  const { data: row } = await db.from('mini_sites').select('id, slug').eq('user_id', sellerUserId).eq('slug', slug).maybeSingle();
  if (!row) return;
  const safe = `released-${slug}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  await db.from('mini_sites').update({ slug: safe, published: false, updated_at: new Date().toISOString() }).eq('id', (row as { id: string }).id);
}
