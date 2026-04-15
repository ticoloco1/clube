import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { fulfillCheckoutPendingRow } from '@/lib/stripeCheckoutFulfill';
import type { CheckoutPendingRow } from '@/lib/stripeCheckoutFulfill';

export const dynamic = 'force-dynamic';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

type StatusBody = {
  pendingId?: string;
};

/**
 * Verifica se um checkout pendente já foi cumprido.
 * Se Stripe já marcar pagamento como `paid`, cumpre imediatamente no servidor.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as StatusBody;
    const pendingId = String(body.pendingId || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(pendingId)) {
      return NextResponse.json({ error: 'pendingId inválido' }, { status: 400 });
    }

    const db = getDb();
    const { data: row, error } = await db.from('checkout_pending' as any).select('*').eq('id', pendingId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message || 'db error' }, { status: 500 });
    if (!row) return NextResponse.json({ error: 'checkout_pending não encontrado' }, { status: 404 });

    const pending = row as CheckoutPendingRow;
    if (pending.fulfilled) {
      return NextResponse.json({ ok: true, fulfilled: true });
    }

    const stripeSecret = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeSecret || !pending.stripe_checkout_session_id) {
      return NextResponse.json({ ok: true, fulfilled: false });
    }

    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.retrieve(pending.stripe_checkout_session_id);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ ok: true, fulfilled: false, paymentStatus: session.payment_status });
    }

    const done = await fulfillCheckoutPendingRow(db, session, pending);
    return NextResponse.json({ ok: true, fulfilled: !!done, paymentStatus: session.payment_status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
