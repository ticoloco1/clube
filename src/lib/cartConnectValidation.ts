import type { SupabaseClient } from '@supabase/supabase-js';
import { cartItemToFulfillmentLine } from '@/lib/cartFulfillment';
import { getMiniSiteStripeForUser } from '@/lib/stripeConnectSite';

const DUMMY_USER = '00000000-0000-0000-0000-000000000001';

function priceClose(a: number, b: number) {
  return Math.abs(a - b) < 0.05;
}

/**
 * Paywall/CV/slug P2P: criadores e vendedores precisam de Stripe Connect com charges ativas.
 */
export async function validateCartCreatorsHaveStripe(
  db: SupabaseClient,
  items: { id: string; type: string; price: number; label: string }[],
  payerUserId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uid = payerUserId || DUMMY_USER;

  for (const item of items) {
    let line: ReturnType<typeof cartItemToFulfillmentLine>;
    try {
      line = cartItemToFulfillmentLine(item, uid);
    } catch {
      continue;
    }

    if (line.kind === 'video' && line.itemId) {
      const { data: video } = await db.from('mini_site_videos').select('site_id').eq('id', line.itemId).maybeSingle();
      if (!video) return { ok: false, error: 'Video not found.' };
      const { data: site } = await db
        .from('mini_sites')
        .select('slug, stripe_connect_account_id, stripe_connect_charges_enabled')
        .eq('id', (video as { site_id: string }).site_id)
        .maybeSingle();
      if (!site?.stripe_connect_account_id || !site?.stripe_connect_charges_enabled) {
        return {
          ok: false,
          error: `Paywall: the creator must connect Stripe in the editor first (site /${(site as { slug?: string })?.slug || '…'}).`,
        };
      }
    }

    if (line.kind === 'cv' && line.itemId) {
      const { data: site } = await db
        .from('mini_sites')
        .select('slug, stripe_connect_account_id, stripe_connect_charges_enabled')
        .eq('id', line.itemId)
        .maybeSingle();
      if (!site?.stripe_connect_account_id || !site?.stripe_connect_charges_enabled) {
        return {
          ok: false,
          error: `CV unlock: the creator must connect Stripe in the editor first (site /${(site as { slug?: string })?.slug || '…'}).`,
        };
      }
    }

    if (line.kind === 'mystic_service' && line.itemId && line.mysticService && payerUserId) {
      const { data: site } = await db
        .from('mini_sites')
        .select(
          'slug, user_id, mystic_public_enabled, mystic_tarot_price_usd, mystic_lottery_premium_price_usd, stripe_connect_account_id, stripe_connect_charges_enabled',
        )
        .eq('id', line.itemId)
        .maybeSingle();
      const s = site as {
        slug?: string;
        user_id?: string;
        mystic_public_enabled?: boolean | null;
        mystic_tarot_price_usd?: number | string | null;
        mystic_lottery_premium_price_usd?: number | string | null;
        stripe_connect_account_id?: string | null;
        stripe_connect_charges_enabled?: boolean | null;
      } | null;
      if (!s?.mystic_public_enabled) {
        return { ok: false, error: 'Este mini-site não tem serviços místicos à venda.' };
      }
      if (s.user_id === payerUserId) {
        return { ok: false, error: 'Não podes comprar serviços no teu próprio mini-site.' };
      }
      if (!s.stripe_connect_account_id || !s.stripe_connect_charges_enabled) {
        return {
          ok: false,
          error: `O criador tem de ligar o Stripe no editor antes de vender leituras (/${s.slug || '…'}).`,
        };
      }
      const expected =
        line.mysticService === 'tarot'
          ? Number(s.mystic_tarot_price_usd ?? 0)
          : Number(s.mystic_lottery_premium_price_usd ?? 0);
      if (!Number.isFinite(expected) || expected < 0.5 || !priceClose(Number(item.price), expected)) {
        return { ok: false, error: 'O preço deste serviço mudou — atualiza a página e tenta de novo.' };
      }
    }

    if (line.kind === 'slug_market' && line.itemId) {
      const { data: reg } = await db
        .from('slug_registrations')
        .select('user_id, slug, for_sale, sale_price, status')
        .eq('slug', line.itemId)
        .eq('for_sale', true)
        .maybeSingle();
      if (!reg || (reg as { status?: string }).status === 'auction') {
        return { ok: false, error: `Slug /${line.itemId} is not listed for sale (or only in auction).` };
      }
      const sellerId = (reg as { user_id: string }).user_id;
      if (sellerId === payerUserId) {
        return { ok: false, error: 'You cannot buy your own slug listing.' };
      }
      const sp = Number((reg as { sale_price?: number }).sale_price);
      if (!Number.isFinite(sp) || !priceClose(Number(item.price), sp)) {
        return { ok: false, error: 'Sale price changed — refresh the page and try again.' };
      }
      const site = await getMiniSiteStripeForUser(db, sellerId);
      if (!site?.stripe_connect_account_id || !site?.stripe_connect_charges_enabled) {
        return {
          ok: false,
          error: `Seller must connect Stripe before this slug can be purchased (/${line.itemId}).`,
        };
      }
    }

    if (line.kind === 'slug_auction_settle' && line.itemId && payerUserId) {
      const { data: auc } = await db
        .from('slug_auctions' as any)
        .select('seller_id, winner_id, current_bid, status, slug')
        .eq('id', line.itemId)
        .maybeSingle();
      if (!auc) return { ok: false, error: 'Auction not found.' };
      if ((auc as any).status === 'settled') {
        return { ok: false, error: 'This auction was already paid.' };
      }
      if ((auc as any).status !== 'ended') {
        return { ok: false, error: 'Auction is not finished yet — wait until the countdown ends (cron closes listings).' };
      }
      if ((auc as any).winner_id !== payerUserId) {
        return { ok: false, error: 'Only the auction winner can pay for this slug.' };
      }
      const finalBid = Number((auc as any).current_bid || 0);
      if (finalBid <= 0 || !priceClose(Number(item.price), finalBid)) {
        return { ok: false, error: 'Amount must match the winning bid. Refresh and try again.' };
      }
      const sellerId = (auc as any).seller_id as string;
      const site = await getMiniSiteStripeForUser(db, sellerId);
      if (!site?.stripe_connect_account_id || !site?.stripe_connect_charges_enabled) {
        return {
          ok: false,
          error: `Seller must connect Stripe before the auction payment can complete (slug /${(auc as any).slug}).`,
        };
      }
    }
  }

  return { ok: true };
}
