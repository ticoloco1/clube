import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { fetchSlugMarketRowsRest } from '@/lib/slugMarketRestQuery';

export const dynamic = 'force-dynamic';

/**
 * Lista slugs à venda: RPC (preferido) → REST explícito (fallback se RPC em falta ou PostgREST
 * acusar relação slug_registrations / mini_sites no cliente).
 */
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') || '0', 10) || 0);
  const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '24', 10) || 24));
  const ownerUserId = req.nextUrl.searchParams.get('owner_user_id')?.trim() || null;
  const supabase = createClient(url, key);
  const rpcArgs: Record<string, unknown> = {
    p_offset: offset,
    p_limit: limit,
  };
  if (ownerUserId) rpcArgs.p_owner_user_id = ownerUserId;
  const { data, error } = await supabase.rpc('slug_market_listings', rpcArgs);
  if (!error) {
    const rows = Array.isArray(data) ? data : data != null ? [data] : [];
    return NextResponse.json({ rows });
  }

  const { rows, error: restErr } = await fetchSlugMarketRowsRest(url, key, offset, limit, ownerUserId);
  if (restErr) {
    console.error('[slug-market-list] rpc:', error?.message, 'rest:', restErr);
    return NextResponse.json({ error: 'slug_market_unavailable' }, { status: 502 });
  }
  return NextResponse.json({ rows });
}
