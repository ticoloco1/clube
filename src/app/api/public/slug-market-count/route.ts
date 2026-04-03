import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { fetchSlugMarketCountRest } from '@/lib/slugMarketRestQuery';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc('slug_market_listings_count');
  if (!error) {
    const n = Number(data);
    return NextResponse.json({ count: Number.isFinite(n) ? n : 0 });
  }

  const { count, error: restErr } = await fetchSlugMarketCountRest(url, key);
  if (restErr) {
    console.error('[slug-market-count] rpc:', error?.message, 'rest:', restErr);
    return NextResponse.json({ error: 'slug_market_unavailable' }, { status: 502 });
  }
  return NextResponse.json({ count });
}
