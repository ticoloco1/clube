export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getSiteBaseUrl } from '@/lib/siteBaseUrl';

const SITE_URL = getSiteBaseUrl();

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
        set: (n: string, v: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: Record<string, unknown>) => cookieStore.set({ name: n, value: '', ...o }),
      },
    },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Create/link Stripe Express account and return Account Link URL for onboarding. */
export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY || '';
    if (!secret) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY missing' }, { status: 500 });
    }

    const user = (await getSessionUser()) || (await getUserFromBearer(req));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reqBody = (await req.json().catch(() => ({}))) as { siteId?: string | null };

    const db = getDb();
    let siteQuery = db
      .from('mini_sites')
      .select('id, user_id, stripe_connect_account_id')
      .eq('user_id', user.id);
    if (reqBody.siteId && typeof reqBody.siteId === 'string') {
      siteQuery = siteQuery.eq('id', reqBody.siteId);
    } else {
      siteQuery = siteQuery.order('updated_at', { ascending: false }).limit(1);
    }
    const siteResp = await siteQuery;
    const site = Array.isArray(siteResp.data) ? siteResp.data[0] : siteResp.data;
    const siteErr = siteResp.error;

    if (siteErr || !site) {
      return NextResponse.json({ error: 'Create your mini-site in the editor first.' }, { status: 400 });
    }

    const stripe = new Stripe(secret);
    let accountId = (site as { stripe_connect_account_id?: string | null }).stripe_connect_account_id || null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: (process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || 'US').toUpperCase(),
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          trustbank_site_id: (site as { id: string }).id,
          supabase_user_id: user.id,
        },
      });
      accountId = account.id;
      await db
        .from('mini_sites')
        .update({
          stripe_connect_account_id: accountId,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', (site as { id: string }).id)
        .eq('user_id', user.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/editor?stripe=refresh`,
      return_url: `${SITE_URL}/editor?stripe=done`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url, accountId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Stripe Connect error';
    console.error('[Stripe Connect onboard]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
