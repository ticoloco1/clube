export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DEFAULT_SPLITS = {
  video:        { creator: 0.70, platform: 0.30 },
  cv:           { creator: 0.50, platform: 0.50 },
  cv_directory: { creator: 0.00, platform: 1.00 },
  slug:         { creator: 0.90, platform: 0.10 },
  subscription: { creator: 0.00, platform: 1.00 },
  boost:        { creator: 0.00, platform: 0.80, jackpot: 0.20 },
  credits:      { creator: 0.00, platform: 1.00 },
  classified:   { creator: 0.00, platform: 1.00 },
};

export async function POST(request: NextRequest) {
  const db = getDb();
  try {
    const body = await request.json();

    const isSuccess =
      body.status === 'SUCCESS' ||
      body.transactionStatus === 'SUCCESS' ||
      body.event === 'PAYMENT_SUCCESS';

    if (!isSuccess) {
      return NextResponse.json({ ok: true, skipped: 'not success' });
    }

    const meta       = body.metaData || body.meta || {};
    let type         = meta.type || 'unknown';
    if (type === 'plan') type = 'subscription';
    const itemId     = meta.item_id || meta.itemId;
    const userId     = meta.user_id || meta.userId;
    const amountRaw  = body.amount || body.totalAmount || 0;
    const amountUsdc = amountRaw > 1000 ? amountRaw / 1_000_000 : amountRaw;
    const txHash     = body.transactionSignature || body.txHash || '';

    console.log(`[Webhook] type=${type} amount=${amountUsdc} user=${userId}`);

    // ── VIDEO UNLOCK ──────────────────────────────────────────────────────────
    if (type === 'video' && itemId && userId) {
      const creatorShare = amountUsdc * DEFAULT_SPLITS.video.creator;
      await db.from('paywall_unlocks' as any).insert({
        user_id: userId,
        video_id: itemId,
        amount_paid: creatorShare,
        source: 'video',
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      await creditCreatorForVideo(itemId, creatorShare);
    }

    // ── CV UNLOCK ─────────────────────────────────────────────────────────────
    else if (type === 'cv' && itemId && userId) {
      await db.from('cv_unlocks' as any).insert({
        unlocker_id: userId,
        site_id: itemId,
        amount_paid: amountUsdc * DEFAULT_SPLITS.cv.creator,
        source: 'direct',
      });
    }

    // ── CV DIRECTORY ──────────────────────────────────────────────────────────
    else if (type === 'cv_directory' && itemId && userId) {
      await db.from('cv_unlocks' as any).insert({
        unlocker_id: userId,
        site_id: itemId,
        amount_paid: 0,
        source: 'directory',
      });
    }

    // ── BOOST ─────────────────────────────────────────────────────────────────
    else if (type === 'boost' && itemId && userId) {
      const jackpotAmount = amountUsdc * DEFAULT_SPLITS.boost.jackpot;
      const positions     = Math.max(1, Math.floor(amountUsdc / 0.50));

      // Record boost
      const { data: boost } = await db.from('boosts' as any).insert({
        target_type: meta.target_type || 'site',
        target_id: itemId,
        booster_id: userId,
        amount: amountUsdc,
        positions_gained: positions,
      }).select('id').maybeSingle();

      // Mini site ranking score (BoostButton / sites directory)
      if ((meta.target_type || 'site') === 'site' && itemId) {
        await db.from('site_boosts' as any).insert({
          site_id: itemId,
          user_id: userId,
          amount: positions,
        });
      }

      // Update boost_score on classified listings
      if (meta.target_type === 'classified') {
        const { data: listing } = await db.from('classified_listings')
          .select('boost_score').eq('id', itemId).maybeSingle();
        if (listing !== null) {
          await db.from('classified_listings')
            .update({ boost_score: ((listing as any)?.boost_score || 0) + amountUsdc })
            .eq('id', itemId);
        }
      }

      // Credit jackpot pool — try RPC first, fallback to manual update
      const rpcResult = await db.rpc('add_to_jackpot' as any, {
        usdc_amount: jackpotAmount,
        ticket_count: positions,
      });

      if (rpcResult.error) {
        // Fallback: manual increment
        const { data: poolData } = await db.from('jackpot_pool' as any)
          .select('balance_usdc, total_entries')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .maybeSingle();
        if (poolData) {
          await db.from('jackpot_pool' as any).update({
            balance_usdc:  ((poolData as any).balance_usdc  || 0) + jackpotAmount,
            total_entries: ((poolData as any).total_entries || 0) + positions,
            updated_at: new Date().toISOString(),
          }).eq('id', '00000000-0000-0000-0000-000000000001');
        }
      }

      // Add jackpot entry — only if booster has a published mini site
      const { data: siteData } = await db.from('mini_sites')
        .select('id').eq('user_id', userId).eq('published', true).maybeSingle();
      if (siteData) {
        await db.from('jackpot_entries' as any).insert({
          user_id: userId,
          boost_id: (boost as any)?.id || null,
          tickets: positions,
        });
      }
    }

    // ── CREDITS PURCHASE ──────────────────────────────────────────────────────
    else if (type === 'credits' && userId) {
      const creditsBase  = Math.floor(amountUsdc * 100);
      const bonus        = creditsBase >= 10000 ? Math.floor(creditsBase * 0.15)
                         : creditsBase >= 5000  ? Math.floor(creditsBase * 0.10)
                         : creditsBase >= 1000  ? Math.floor(creditsBase * 0.05) : 0;
      const total = creditsBase + bonus;

      const { data: wallet } = await db.from('credit_wallets' as any)
        .select('balance, total_purchased').eq('user_id', userId).maybeSingle();

      await db.from('credit_wallets' as any).upsert({
        user_id: userId,
        balance: ((wallet as any)?.balance || 0) + total,
        total_purchased: ((wallet as any)?.total_purchased || 0) + creditsBase,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      await db.from('credit_transactions' as any).insert({
        user_id: userId,
        type: 'purchase',
        amount: total,
        usdc_amount: amountUsdc,
        description: `${creditsBase} credits${bonus > 0 ? ` + ${bonus} bonus` : ''}`,
        ref_id: txHash,
      });
    }

    // ── SUBSCRIPTION ──────────────────────────────────────────────────────────
    else if (type === 'subscription' && userId) {
      const billing = (meta.billing_period || 'monthly') as string;
      const days = billing === 'yearly' || billing === 'annual' ? 365 : 30;
      await db.from('subscriptions' as any).upsert({
        user_id: userId,
        plan: meta.plan_id || 'pro',
        status: 'active',
        expires_at: new Date(Date.now() + days * 24 * 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      await db.from('mini_sites').update({ published: true }).eq('user_id', userId);
    }

    // ── SLUG BID (auction) ────────────────────────────────────────────────────
    else if (type === 'slug_bid' && itemId && userId) {
      const { data: auction } = await db.from('slug_auctions' as any)
        .select('id, current_bid, min_bid, min_increment, bid_count, status, ends_at')
        .eq('id', itemId)
        .maybeSingle();
      if (auction && auction.status === 'active' && new Date(auction.ends_at) > new Date()) {
        const current = Number((auction as any).current_bid || 0);
        const minBid = Number((auction as any).min_bid || 0);
        const increment = Number((auction as any).min_increment || 5);
        const required = Math.max(minBid, current + increment);
        const nextBid = Math.max(required, amountUsdc);
        await db.from('slug_auctions' as any).update({
          current_bid: nextBid,
          bid_count: Number((auction as any).bid_count || 0) + 1,
          winner_id: userId,
        }).eq('id', itemId);
      }
    }

    // ── SLUG ──────────────────────────────────────────────────────────────────
    else if (type === 'slug' && itemId && userId) {
      await db.from('slug_registrations' as any).upsert({
        user_id: userId,
        slug: itemId,
        status: 'active',
        expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      }, { onConflict: 'slug', ignoreDuplicates: false });
    }

    // ── CLASSIFIED LISTING ────────────────────────────────────────────────────
    else if (type === 'classified' && itemId) {
      await db.from('classified_listings').update({ status: 'active' }).eq('id', itemId);
    }

    return NextResponse.json({ ok: true, type, amountUsdc });
  } catch (err) {
    console.error('[Webhook]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function creditCreatorForVideo(videoId: string, amount: number) {
  const db = getDb();
  const { data: video } = await db.from('mini_site_videos')
    .select('site_id').eq('id', videoId).maybeSingle();
  if (!video) return;
  const { data: site } = await db.from('mini_sites')
    .select('user_id').eq('id', (video as any).site_id).maybeSingle();
  if (!site) return;
  const creatorId = (site as any).user_id;
  const credits = Math.floor(amount * 100);
  const { data: wallet } = await db.from('credit_wallets' as any)
    .select('balance').eq('user_id', creatorId).maybeSingle();
  await db.from('credit_wallets' as any).upsert({
    user_id: creatorId,
    balance: ((wallet as any)?.balance || 0) + credits,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}
