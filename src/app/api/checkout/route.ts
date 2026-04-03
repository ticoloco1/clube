export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { cartItemToFulfillmentLine } from '@/lib/cartFulfillment';
import { validateCartCreatorsHaveStripe } from '@/lib/cartConnectValidation';
import {
  mysticCheckoutCancelUrl,
  mysticCheckoutSuccessUrl,
  mysticDirectCheckoutEligibility,
} from '@/lib/mysticDirectCheckout';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://trustbank.xyz').replace(/\/+$/, '');

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY missing on server' }, { status: 500 });
    }

    const stripe = new Stripe(secret);
    const body = await req.json();
    const { items, userId } = body as { items: { id: string; label: string; price: number; type: string }[]; userId: string };

    if (!items?.length || !userId) {
      return NextResponse.json({ error: 'Missing items or userId' }, { status: 400 });
    }

    const db = getDb();
    const lines = items.map((item) => cartItemToFulfillmentLine(item, userId));

    const mysticOnly = mysticDirectCheckoutEligibility(lines);
    const hasMystic = lines.some((l) => l.kind === 'mystic_service');
    if (hasMystic && !mysticOnly.ok) {
      return NextResponse.json(
        {
          error:
            'Serviços místicos: coloca só itens deste perfil no carrinho (sem misturar com outros produtos). O pagamento é directo no Stripe do criador.',
        },
        { status: 400 },
      );
    }

    const connectOk = await validateCartCreatorsHaveStripe(db, items, userId);
    if (!connectOk.ok) {
      return NextResponse.json({ error: connectOk.error }, { status: 400 });
    }

    const totalUsd = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
    const totalCents = Math.round(totalUsd * 100);
    if (totalCents < 50) {
      return NextResponse.json({ error: 'Minimum charge is $0.50 USD' }, { status: 400 });
    }
    const storedLines = lines.map(({ userId: _u, ...rest }) => rest);

    let stripeConnectAccountId: string | null = null;
    let successUrl = `${SITE_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    let cancelUrl = `${SITE_URL}/dashboard?payment=cancel`;

    if (mysticOnly.ok) {
      const { data: siteRow } = await db
        .from('mini_sites')
        .select('slug, stripe_connect_account_id, stripe_connect_charges_enabled')
        .eq('id', mysticOnly.siteId)
        .maybeSingle();
      const s = siteRow as {
        slug?: string;
        stripe_connect_account_id?: string | null;
        stripe_connect_charges_enabled?: boolean | null;
      } | null;
      if (!s?.slug || !s.stripe_connect_account_id || !s.stripe_connect_charges_enabled) {
        return NextResponse.json({ error: 'Mini-site indisponível para checkout directo.' }, { status: 400 });
      }
      stripeConnectAccountId = s.stripe_connect_account_id;
    }

    const { data: pending, error: pErr } = await db
      .from('checkout_pending' as any)
      .insert({
        user_id: userId,
        lines: storedLines,
        stripe_connect_account_id: stripeConnectAccountId,
      })
      .select('id')
      .single();

    if (pErr || !pending) {
      console.error('[Checkout] pending insert', pErr);
      return NextResponse.json(
        { error: 'Could not start checkout. Run supabase-stripe-tables.sql and supabase-minisite-mystic-tarot-loteria.sql.' },
        { status: 500 },
      );
    }

    const pendingId = (pending as { id: string }).id;

    if (mysticOnly.ok && stripeConnectAccountId) {
      const { data: siteRow } = await db
        .from('mini_sites')
        .select('slug')
        .eq('id', mysticOnly.siteId)
        .maybeSingle();
      const slug = (siteRow as { slug?: string } | null)?.slug || '';
      if (slug) {
        successUrl = `${mysticCheckoutSuccessUrl(slug, pendingId)}&session_id={CHECKOUT_SESSION_ID}`;
        cancelUrl = mysticCheckoutCancelUrl(slug);
      }
    }

    const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.label || 'Serviço' },
          unit_amount: Math.round((Number(item.price) || 0) * 100),
        },
        quantity: 1,
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        pending_id: pendingId,
        user_id: userId,
      },
    };

    const session =
      stripeConnectAccountId
        ? await stripe.checkout.sessions.create(sessionCreateParams, { stripeAccount: stripeConnectAccountId })
        : await stripe.checkout.sessions.create(sessionCreateParams);

    await db
      .from('checkout_pending' as any)
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', pendingId);

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
    }

    return NextResponse.json({
      url: session.url,
      amount: totalUsd,
      directToCreator: !!stripeConnectAccountId,
      pendingId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[Checkout]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const stripeOk = !!process.env.STRIPE_SECRET_KEY;
  return NextResponse.json({
    ok: true,
    stripeConfigured: stripeOk,
    siteUrlConfigured: !!SITE_URL,
  });
}
