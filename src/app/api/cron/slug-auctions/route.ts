export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** Fecha leilões expirados (`active` → `ended`). O vencedor paga depois via carrinho `slug_auction_pay_{id}`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.get('authorization') || '';
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  const { data: rows, error } = await db
    .from('slug_auctions' as any)
    .update({ status: 'ended' })
    .eq('status', 'active')
    .lt('ends_at', now)
    .select('id');

  if (error) {
    console.error('[cron slug-auctions]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ closed: (rows || []).length, ids: (rows || []).map((r: { id: string }) => r.id) });
}
