export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { isDbPaywallEnabled } from '@/lib/utils';
import { getServiceDb, treasuryAddress, usdcUnitsFromUsd } from '@/lib/videoUsdcPaywall';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const siteSlug = typeof body.siteSlug === 'string' ? body.siteSlug.trim().toLowerCase() : '';
    const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';
    if (!videoId || !siteSlug || !walletAddress) {
      return NextResponse.json({ error: 'videoId, siteSlug e walletAddress são obrigatórios' }, { status: 400 });
    }
    if (!isAddress(walletAddress)) {
      return NextResponse.json({ error: 'walletAddress inválido' }, { status: 400 });
    }

    const db = getServiceDb();
    const { data: video } = await db
      .from('mini_site_videos')
      .select('id, site_id, paywall_enabled, paywall_price')
      .eq('id', videoId)
      .maybeSingle();
    if (!video) return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 });

    const { data: site } = await db
      .from('mini_sites')
      .select('id, slug, published, user_id, wallet_address')
      .eq('id', (video as { site_id: string }).site_id)
      .maybeSingle();
    if (!site) return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });

    const s = site as { slug: string; published: boolean };
    if (s.slug.toLowerCase() !== siteSlug) return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });
    if (!s.published) return NextResponse.json({ error: 'Indisponível' }, { status: 403 });
    if (!isDbPaywallEnabled((video as { paywall_enabled?: unknown }).paywall_enabled)) {
      return NextResponse.json({ error: 'Vídeo sem paywall' }, { status: 400 });
    }

    const amountUsd = Number((video as { paywall_price?: number | null }).paywall_price || 0);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: 'Preço inválido do vídeo' }, { status: 400 });
    }

    const amountUnits = usdcUnitsFromUsd(amountUsd);
    const { data: intent, error } = await db
      .from('video_usdc_payment_intents' as never)
      .insert({
        video_id: videoId,
        site_id: (site as { id: string }).id,
        site_slug: siteSlug,
        payer_wallet: walletAddress.toLowerCase(),
        amount_usd: amountUsd,
        amount_units: amountUnits.toString(),
        treasury_wallet: treasuryAddress().toLowerCase(),
        status: 'pending',
      })
      .select('id, amount_usd, amount_units, treasury_wallet')
      .single();

    if (error || !intent) {
      console.error('[video-usdc-intent] insert', error);
      return NextResponse.json({ error: 'Não foi possível criar intenção' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      intentId: (intent as { id: string }).id,
      amountUsd: (intent as { amount_usd: number }).amount_usd,
      amountUnits: (intent as { amount_units: string }).amount_units,
      treasuryWallet: (intent as { treasury_wallet: string }).treasury_wallet,
    });
  } catch (e) {
    console.error('[video-usdc-intent]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
