export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  deliverMysticResultsForPayment,
  loadMysticDeliverySnapshot,
} from '@/lib/mysticDeliverResults';
import { mysticDirectCheckoutEligibility } from '@/lib/mysticDirectCheckout';
import { fulfillCheckoutPendingRow, paymentRefFromCheckoutSession } from '@/lib/stripeCheckoutFulfill';
import type { FulfillmentLine } from '@/lib/paymentFulfillment';

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
        set: (n: string, v: string, o: Record<string, unknown>) =>
          cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: Record<string, unknown>) =>
          cookieStore.set({ name: n, value: '', ...o }),
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function siteIdFromLines(lines: unknown): string | null {
  const arr = lines as FulfillmentLine[];
  const m = arr.find((l) => l.kind === 'mystic_service');
  return m?.itemId || null;
}

/**
 * POST { pendingId } — após voltar do Stripe: confirma pagamento, cumpre linhas se ainda não,
 * gera números / tarô e devolve resultado para mostrar no mini-site (+ PDF depois via outra rota).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Inicia sessão.' }, { status: 401 });
    }

    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return NextResponse.json({ error: 'Stripe não configurado.' }, { status: 500 });
    }

    const body = (await req.json()) as { pendingId?: string };
    const pendingId = typeof body.pendingId === 'string' ? body.pendingId.trim() : '';
    if (!pendingId) {
      return NextResponse.json({ error: 'pendingId obrigatório.' }, { status: 400 });
    }

    const db = getDb();
    const { data: row, error } = await db.from('checkout_pending' as any).select('*').eq('id', pendingId).maybeSingle();
    if (error || !row) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }
    const pending = row as {
      user_id: string;
      lines: unknown;
      fulfilled: boolean;
      stripe_checkout_session_id: string | null;
      stripe_connect_account_id: string | null;
    };

    if (pending.user_id !== user.id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const lines = pending.lines as FulfillmentLine[];
    const mystic = mysticDirectCheckoutEligibility(lines);
    if (!mystic.ok) {
      return NextResponse.json({ error: 'Este fluxo é só para serviços místicos.' }, { status: 400 });
    }
    const siteId = mystic.siteId;

    if (!pending.stripe_checkout_session_id) {
      return NextResponse.json({ error: 'Sessão Stripe em falta.' }, { status: 400 });
    }

    const stripe = new Stripe(secret);
    const retrieveOpts = pending.stripe_connect_account_id
      ? ({ stripeAccount: pending.stripe_connect_account_id } as Stripe.RequestOptions)
      : undefined;

    const session = await stripe.checkout.sessions.retrieve(
      pending.stripe_checkout_session_id,
      { expand: ['payment_intent'] },
      retrieveOpts,
    );

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Pagamento ainda não concluído.' }, { status: 402 });
    }

    await fulfillCheckoutPendingRow(db, session, {
      id: pendingId,
      user_id: pending.user_id,
      lines: pending.lines,
      fulfilled: pending.fulfilled,
      stripe_checkout_session_id: pending.stripe_checkout_session_id,
      stripe_connect_account_id: pending.stripe_connect_account_id,
    });

    const paymentRef = paymentRefFromCheckoutSession(session);

    const { data: site } = await db.from('mini_sites').select('site_name').eq('id', siteId).maybeSingle();
    const siteName = String((site as { site_name?: string } | null)?.site_name || 'Perfil');

    await deliverMysticResultsForPayment(db, user.id, siteId, paymentRef, siteName);

    const snapshot = await loadMysticDeliverySnapshot(db, user.id, siteId, paymentRef);

    return NextResponse.json({
      ok: true,
      paymentRef,
      siteId,
      ...snapshot,
    });
  } catch (e) {
    console.error('[mystic/complete-purchase]', e);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
