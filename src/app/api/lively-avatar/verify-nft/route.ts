export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServiceDb, walletOwnsLivelyNft, walletOwnsPremiumAvatarNft } from '@/lib/livelyAvatarServer';

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

/**
 * POST { wallet?: string } — usa carteira do corpo ou wallet_address do mini-site.
 * Atualiza lively_avatar_nft_verified_at se o endereço tiver o NFT (Polygon + Alchemy).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const walletParam = typeof body.wallet === 'string' ? body.wallet.trim() : '';
    const tier = body.tier === 'premium' ? 'premium' : 'base';

    const db = getServiceDb();
    const { data: site, error } = await db
      .from('mini_sites')
      .select('id,user_id,wallet_address')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !site) {
      return NextResponse.json({ error: 'Mini-site não encontrado' }, { status: 404 });
    }

    const wallet = (walletParam || (site as { wallet_address?: string }).wallet_address || '').trim();
    if (!wallet) {
      return NextResponse.json(
        { error: 'Indica uma carteira Polygon (corpo ou campo no editor).' },
        { status: 400 },
      );
    }

    const ok = tier === 'premium' ? await walletOwnsPremiumAvatarNft(wallet) : await walletOwnsLivelyNft(wallet);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            tier === 'premium'
              ? 'NFT premium não encontrado. Define LIVELY_PREMIUM_AVATAR_NFT_CONTRACT (Polygon + Alchemy).'
              : 'NFT não encontrado nesta carteira. Confirma LIVELY_AVATAR_NFT_CONTRACT e rede Polygon.',
        },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    const patch =
      tier === 'premium'
        ? { lively_premium_nft_verified_at: now }
        : { lively_avatar_nft_verified_at: now };
    const { error: upErr } = await db
      .from('mini_sites')
      .update(patch)
      .eq('id', (site as { id: string }).id)
      .eq('user_id', user.id);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, verifiedAt: now });
  } catch (e) {
    console.error('[lively-avatar/verify-nft]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
