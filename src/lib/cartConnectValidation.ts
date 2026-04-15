import type { SupabaseClient } from '@supabase/supabase-js';
import { cartItemToFulfillmentLine } from '@/lib/cartFulfillment';
import { getMiniSiteStripeForUser } from '@/lib/stripeConnectSite';
import { validateSlugMarketFixedPrice } from '@/lib/slugMarketPurchaseValidation';

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

    if (line.kind === 'feed_post' && line.itemId) {
      const { data: post } = await db
        .from('feed_posts')
        .select('site_id, user_id, paywall_locked, paywall_price_usd')
        .eq('id', line.itemId)
        .maybeSingle();
      const fp = post as {
        site_id?: string;
        user_id?: string;
        paywall_locked?: boolean | null;
        paywall_price_usd?: number | string | null;
      } | null;
      if (!fp?.site_id || !fp.paywall_locked) {
        return { ok: false, error: 'Este post do feed não está à venda ou não existe.' };
      }
      if (payerUserId && fp.user_id === payerUserId) {
        return { ok: false, error: 'Não podes comprar o desbloqueio do teu próprio post.' };
      }
      const expected = Number(fp.paywall_price_usd);
      if (!Number.isFinite(expected) || expected < 0.5 || !priceClose(Number(item.price), expected)) {
        return { ok: false, error: 'O preço deste post mudou — atualiza a página e tenta de novo.' };
      }
      const { data: site } = await db
        .from('mini_sites')
        .select('slug, stripe_connect_account_id, stripe_connect_charges_enabled')
        .eq('id', fp.site_id)
        .maybeSingle();
      if (!site?.stripe_connect_account_id || !site?.stripe_connect_charges_enabled) {
        return {
          ok: false,
          error: `Feed pago: o criador tem de ligar o Stripe no editor (/${(site as { slug?: string })?.slug || '…'}).`,
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
      const gate = await validateSlugMarketFixedPrice(db, line.itemId);
      if (!gate.ok) {
        return { ok: false, error: gate.error };
      }
      const sellerId = gate.row.user_id;
      if (sellerId === payerUserId) {
        return { ok: false, error: 'Não podes comprar o teu próprio slug.' };
      }
      const sp = gate.row.sale_price;
      if (!priceClose(Number(item.price), sp)) {
        return { ok: false, error: 'O preço mudou — atualiza a página e tenta de novo.' };
      }
      const site = await getMiniSiteStripeForUser(db, sellerId);
      if (!site?.stripe_connect_account_id || !site?.stripe_connect_charges_enabled) {
        const { data: siteRows } = await db
          .from('mini_sites')
          .select('slug, stripe_connect_account_id, stripe_connect_charges_enabled')
          .eq('user_id', sellerId)
          .order('updated_at', { ascending: false })
          .limit(5);
        const summary = Array.isArray(siteRows)
          ? siteRows
              .map((r) => {
                const s = r as {
                  slug?: string | null;
                  stripe_connect_account_id?: string | null;
                  stripe_connect_charges_enabled?: boolean | null;
                };
                return `${s.slug || 'sem-slug'}:acct=${s.stripe_connect_account_id ? 'yes' : 'no'},charges=${s.stripe_connect_charges_enabled ? 'yes' : 'no'}`;
              })
              .join(' | ')
          : 'no-sites';
        return {
          ok: false,
          error: `O vendedor tem de ligar o Stripe antes desta compra (/${gate.row.slug}). seller=${sellerId}. sites=[${summary}]`,
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
