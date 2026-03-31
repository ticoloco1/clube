export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const HELIO_API_KEY   = process.env.HELIO_API_KEY || process.env.HELIO_SECRET_KEY || process.env.NEXT_PUBLIC_HELIO_API_KEY || '';
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || '';
const SITE_URL        = process.env.NEXT_PUBLIC_SITE_URL || 'https://trustbankzero.vercel.app';

/** Helio webhook reads meta.type — must match webhook cases (subscription, boost, slug, …) */
function buildHelioMeta(userId: string, items: { id: string; label: string; price: number; type: string }[]) {
  const first = items[0];
  const rawType = first?.type || 'plan';

  let type = rawType;
  if (rawType === 'plan') type = 'subscription';
  if ((first?.id || '').startsWith('slug_bid_')) type = 'slug_bid';
  if (rawType === 'brand_ad') type = 'brand_ad';

  const meta: Record<string, string> = {
    user_id: userId,
    userId: userId,
    type,
    items: items.map(i => i.id).join(','),
  };

  if (type === 'subscription') {
    const m = first.id.match(/^plan_([^_]+)_(mo|yr)$/);
    if (m) {
      meta.plan_id = m[1];
      meta.billing_period = m[2] === 'yr' ? 'yearly' : 'monthly';
    } else {
      meta.plan_id = 'pro';
      meta.billing_period = 'monthly';
    }
    meta.item_id = userId;
  }

  if (type === 'boost') {
    const m = first.id.match(/^boost_([0-9a-f-]{36})_/i);
    meta.item_id = m ? m[1] : first.id.replace(/^boost_/, '').replace(/_\d+$/, '');
    meta.target_type = 'site';
  }

  if (type === 'slug' || type === 'slug_bid') {
    const id = first.id;
    let slugToken = id;
    if (id.startsWith('slug_')) slugToken = id.slice(5);
    if (id.startsWith('slug_prem_')) slugToken = id.slice(10);
    if (id.startsWith('slug_market_')) slugToken = id.slice(12);
    if (id.startsWith('slug_renewal_')) slugToken = id.replace(/^slug_renewal_/, '');
    if (id.startsWith('slug_bid_')) slugToken = id.replace(/^slug_bid_/, '');
    meta.item_id = slugToken;
  }

  // Pagamento de proposta de anúncio (marketplace) — meta.item_id = UUID da linha ad_proposals
  if (type === 'brand_ad') {
    const id = first?.id || '';
    meta.item_id = id.startsWith('ad_proposal_') ? id.replace(/^ad_proposal_/, '') : id;
  }

  return { type, meta };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, userId } = body;

    if (!items?.length || !userId) {
      return NextResponse.json({ error: 'Missing items or userId' }, { status: 400 });
    }

    const totalAmount = items.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0);
    const { type: purchaseType, meta: metaData } = buildHelioMeta(userId, items);

    if (!HELIO_API_KEY) {
      return NextResponse.json({ error: 'HELIO_API_KEY ausente no servidor' }, { status: 500 });
    }

    const splitPayments = PLATFORM_WALLET
      ? [{ address: PLATFORM_WALLET, share: 100 }]
      : [];

    const helioBody = {
      amount: totalAmount.toString(),
      currency: 'USDC',
      network: 'polygon',
      name: `TrustBank · ${purchaseType}`,
      paymentMethods: ['crypto', 'card'],
      returnUrl: `${SITE_URL}/dashboard?payment=success`,
      cancelUrl: `${SITE_URL}/dashboard?payment=cancel`,
      metaData,
      ...(splitPayments.length > 0 ? { splitPayments } : {}),
    };

    const endpoints = [
      'https://api.helio.pay/v1/paylink/create/fixed',
      'https://api.helio.cash/v1/paylink/create/fixed',
    ];
    let helioData: any = null;
    let lastError: any = null;
    for (const endpoint of endpoints) {
      const helioRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HELIO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(helioBody),
      });
      helioData = await helioRes.json().catch(() => ({}));
      if (helioRes.ok) {
        lastError = null;
        break;
      }
      lastError = `${endpoint} :: ${helioRes.status} :: ${helioData?.message || helioData?.error || 'unknown'}`;
    }

    if (lastError) {
      console.error('[Helio Error]', lastError);
      return NextResponse.json({ error: `Helio: ${lastError}` }, { status: 502 });
    }

    const url = helioData?.paylinkUrl || helioData?.url;
    if (!url) {
      return NextResponse.json({ error: 'Helio não retornou URL' }, { status: 502 });
    }

    return NextResponse.json({ url, amount: totalAmount });

  } catch (err: any) {
    console.error('[Checkout]', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
