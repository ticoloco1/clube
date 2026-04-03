export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { fulfillCheckoutPendingRow } from '@/lib/stripeCheckoutFulfill';
import type { CheckoutPendingRow } from '@/lib/stripeCheckoutFulfill';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY || '';
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!secret || !whSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(secret);
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (e) {
    console.error('[Stripe webhook] signature', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getDb();

  const { error: insEvErr } = await db.from('stripe_webhook_events' as any).insert({ id: event.id });
  if (insEvErr && String((insEvErr as any).code) === '23505') {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  if (insEvErr) {
    console.error('[Stripe webhook] event log', insEvErr);
    return NextResponse.json({ error: 'event log failed' }, { status: 500 });
  }

  try {
    if (event.type === 'account.updated') {
      const acc = event.data.object as Stripe.Account;
      if (acc.id) {
        await db
          .from('mini_sites' as any)
          .update({
            stripe_connect_charges_enabled: !!acc.charges_enabled,
            stripe_connect_payouts_enabled: !!acc.payouts_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_connect_account_id', acc.id);
      }
      return NextResponse.json({ received: true });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const pendingId = session.metadata?.pending_id;
      const userId = session.metadata?.user_id || session.client_reference_id || '';

      if (pendingId && userId) {
        const { data: row } = await db.from('checkout_pending' as any).select('*').eq('id', pendingId).maybeSingle();
        if (row && !(row as any).fulfilled) {
          const ok = await fulfillCheckoutPendingRow(db, session, row as CheckoutPendingRow);
          if (!ok) {
            console.warn('[Stripe webhook] checkout.session not paid or fulfill skipped', pendingId);
          }
        }
      } else {
        console.warn('[Stripe webhook] checkout.session.completed without pending_id metadata');
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe webhook]', err);
    await db.from('stripe_webhook_events' as any).delete().eq('id', event.id);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }
}
