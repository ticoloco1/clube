import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { cartItemToFulfillmentLine } from '@/lib/cartFulfillment';
import { validateCartCreatorsHaveStripe } from '@/lib/cartConnectValidation';
import {
  getSiteBaseUrl,
  normalizePublicSiteUrl,
  parseAlternatePublicSiteUrls,
  publicSiteUrlFromEnv,
} from '@/lib/siteBaseUrl';
import { STRIPE_MIN_CHARGE_USD } from '@/lib/platformPricing';

const SITE_URL = getSiteBaseUrl();

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** Origens permitidas para CORS (fallback www ↔ apex e pré-visualizações Vercel). */
function allowedCheckoutOrigins(): Set<string> {
  const out = new Set<string>();
  const add = (raw: string) => {
    const t = raw?.trim();
    if (!t) return;
    try {
      out.add(new URL(normalizePublicSiteUrl(t)).origin);
    } catch {
      /* ignore */
    }
  };
  add(process.env.NEXT_PUBLIC_SITE_URL || '');
  add(process.env.NEXT_PUBLIC_URL || '');
  add(publicSiteUrlFromEnv());
  for (const u of parseAlternatePublicSiteUrls()) add(u);
  return out;
}

function corsHeadersForRequest(req: Request): Record<string, string> | undefined {
  const origin = req.headers.get('origin');
  if (!origin) return undefined;
  const allowed = allowedCheckoutOrigins();
  if (allowed.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };
  }
  try {
    const h = new URL(origin).hostname.toLowerCase();
    if (h.endsWith('.vercel.app')) {
      return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      };
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function withCors(req: Request, res: NextResponse): NextResponse {
  const extra = corsHeadersForRequest(req);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      res.headers.set(k, v);
    }
  }
  return res;
}

export async function handleCheckoutPost(req: Request): Promise<NextResponse> {
  try {
    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return withCors(req, NextResponse.json({ error: 'STRIPE_SECRET_KEY missing on server' }, { status: 500 }));
    }

    const stripe = new Stripe(secret);
    const body = await req.json();
    const { items, userId } = body as {
      items: { id: string; label: string; price: number; type: string }[];
      userId: string;
    };

    if (!items?.length || !userId) {
      return withCors(req, NextResponse.json({ error: 'Missing items or userId' }, { status: 400 }));
    }

    const db = getDb();
    const lines = items.map((item) => cartItemToFulfillmentLine(item, userId));
    const connectOk = await validateCartCreatorsHaveStripe(db, items, userId);
    if (!connectOk.ok) {
      return withCors(req, NextResponse.json({ error: connectOk.error }, { status: 400 }));
    }

    const totalUsd = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
    const totalCents = Math.round(totalUsd * 100);
    const minCents = Math.round(STRIPE_MIN_CHARGE_USD * 100);
    if (totalCents < minCents) {
      return withCors(
        req,
        NextResponse.json({ error: `Minimum charge is $${STRIPE_MIN_CHARGE_USD} USD` }, { status: 400 }),
      );
    }
    const storedLines = lines.map(({ userId: _u, ...rest }) => rest);

    let successUrl = `${SITE_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    let cancelUrl = `${SITE_URL}/dashboard?payment=cancel`;

    const { data: pending, error: pErr } = await db
      .from('checkout_pending' as any)
      .insert({
        user_id: userId,
        lines: storedLines,
      })
      .select('id')
      .single();

    if (pErr || !pending) {
      console.error('[Checkout] pending insert', pErr);
      return withCors(
        req,
        NextResponse.json(
          {
            error: 'Could not start checkout',
            details: pErr
              ? {
                  message: (pErr as { message?: string }).message || null,
                  code: (pErr as { code?: string }).code || null,
                  hint: (pErr as { hint?: string }).hint || null,
                  details: (pErr as { details?: string }).details || null,
                }
              : null,
          },
          { status: 500 },
        ),
      );
    }

    const pendingId = (pending as { id: string }).id;

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

    const session = await stripe.checkout.sessions.create(sessionCreateParams);

    await db.from('checkout_pending' as any).update({ stripe_checkout_session_id: session.id }).eq('id', pendingId);

    if (!session.url) {
      return withCors(req, NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 }));
    }

    return withCors(
      req,
      NextResponse.json({
        url: session.url,
        amount: totalUsd,
        directToCreator: false,
        pendingId,
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[Checkout]', err);
    return withCors(req, NextResponse.json({ error: message }, { status: 500 }));
  }
}

function webhookSecretCount(): number {
  let n = 0;
  for (const k of ['STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET_CONNECT', 'STRIPE_WEBHOOK_SECRET_PLATFORM'] as const) {
    const t = (process.env[k] || '').trim();
    if (t.startsWith('whsec_')) n++;
  }
  return n;
}

/** GET público: diagnóstico seguro (sem valores) — usar em produção para ver o que a Vercel injectou neste deploy. */
export async function handleCheckoutGet(req: Request): Promise<NextResponse> {
  const stripeOk = !!(process.env.STRIPE_SECRET_KEY || '').trim();
  return withCors(
    req,
    NextResponse.json({
      ok: true,
      vercelEnv: process.env.VERCEL_ENV || null,
      stripeConfigured: stripeOk,
      stripeWebhookSecretsCount: webhookSecretCount(),
      supabaseUrlConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
      supabaseServiceRoleConfigured: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
      siteUrlConfigured: !!SITE_URL,
      publicSiteUrl: SITE_URL,
    }),
  );
}

export function handleCheckoutOptions(req: Request): NextResponse {
  const h = corsHeadersForRequest(req);
  return new NextResponse(null, { status: 204, headers: h || {} });
}
