export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { loadMysticDeliverySnapshot } from '@/lib/mysticDeliverResults';
import { mysticDirectCheckoutEligibility } from '@/lib/mysticDirectCheckout';
import { paymentRefFromCheckoutSession } from '@/lib/stripeCheckoutFulfill';
import type { FulfillmentLine } from '@/lib/paymentFulfillment';
import { buildLotteryReceiptPdf } from '@/lib/mysticLotteryPdf';

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
    const { data: row } = await db.from('checkout_pending' as any).select('*').eq('id', pendingId).maybeSingle();
    if (!row || (row as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
    }

    const pending = row as {
      lines: unknown;
      fulfilled: boolean;
      stripe_checkout_session_id: string | null;
      stripe_connect_account_id: string | null;
    };

    if (!pending.fulfilled || !pending.stripe_checkout_session_id) {
      return NextResponse.json({ error: 'Pagamento ainda não finalizado.' }, { status: 400 });
    }

    const lines = pending.lines as FulfillmentLine[];
    const mystic = mysticDirectCheckoutEligibility(lines);
    if (!mystic.ok) {
      return NextResponse.json({ error: 'Sem dados de loteria neste pedido.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Pagamento inválido.' }, { status: 400 });
    }

    const paymentRef = paymentRefFromCheckoutSession(session);
    const snapshot = await loadMysticDeliverySnapshot(db, user.id, mystic.siteId, paymentRef);

    if (!snapshot.lottery?.main?.length) {
      return NextResponse.json({ error: 'Sem recibo de loteria nesta compra.' }, { status: 404 });
    }

    const { data: site } = await db.from('mini_sites').select('site_name').eq('id', mystic.siteId).maybeSingle();
    const siteName = String((site as { site_name?: string } | null)?.site_name || 'Perfil');

    const pdfBytes = await buildLotteryReceiptPdf({
      siteName,
      main: snapshot.lottery.main,
      stars: snapshot.lottery.stars,
    });

    const filename = `loteria-${pendingId.slice(0, 8)}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('[mystic/receipt-pdf]', e);
    return NextResponse.json({ error: 'Erro ao gerar PDF.' }, { status: 500 });
  }
}
