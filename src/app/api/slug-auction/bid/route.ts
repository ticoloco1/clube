export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getSessionUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: '', ...o }),
      },
    },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Lance gratuito: o vencedor paga só no fim (Stripe), após o leilão passar a `ended` (cron). */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const auctionId = String(body.auctionId || '');
    const bid = Number(body.bid);
    if (!auctionId || !Number.isFinite(bid) || bid <= 0) {
      return NextResponse.json({ error: 'Invalid auction or bid' }, { status: 400 });
    }

    const db = getDb();
    const { data: auction, error: fetchErr } = await db
      .from('slug_auctions' as any)
      .select('id, current_bid, min_bid, min_increment, bid_count, status, ends_at, seller_id')
      .eq('id', auctionId)
      .maybeSingle();

    if (fetchErr || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }
    if ((auction as any).status !== 'active' || new Date((auction as any).ends_at) <= new Date()) {
      return NextResponse.json({ error: 'Auction is not accepting bids' }, { status: 400 });
    }
    if ((auction as any).seller_id === user.id) {
      return NextResponse.json({ error: 'You cannot bid on your own auction' }, { status: 400 });
    }

    const current = Number((auction as any).current_bid || 0);
    const minBid = Number((auction as any).min_bid || 0);
    const increment = Number((auction as any).min_increment || 5);
    const required = Math.max(minBid, current + increment);
    if (bid < required) {
      return NextResponse.json({ error: `Minimum bid is $${required.toFixed(2)} USD` }, { status: 400 });
    }

    const { error: upErr } = await db
      .from('slug_auctions' as any)
      .update({
        current_bid: bid,
        bid_count: Number((auction as any).bid_count || 0) + 1,
        winner_id: user.id,
      })
      .eq('id', auctionId)
      .eq('status', 'active');

    if (upErr) {
      console.error('[slug-auction bid]', upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, current_bid: bid });
  } catch (e) {
    console.error('[slug-auction bid]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
