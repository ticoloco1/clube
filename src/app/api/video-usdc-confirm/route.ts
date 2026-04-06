export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { payoutCreatorUsdc, getServiceDb, verifyUsdcTransferToTreasury } from '@/lib/videoUsdcPaywall';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const intentId = typeof body.intentId === 'string' ? body.intentId.trim() : '';
    const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : '';
    const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim().toLowerCase() : '';
    if (!intentId || !txHash || !walletAddress) {
      return NextResponse.json({ error: 'intentId, txHash e walletAddress são obrigatórios' }, { status: 400 });
    }
    if (!isAddress(walletAddress) || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'walletAddress/txHash inválidos' }, { status: 400 });
    }

    const db = getServiceDb();
    const { data: intent, error: iErr } = await db
      .from('video_usdc_payment_intents' as never)
      .select('id, video_id, site_id, site_slug, payer_wallet, amount_units, amount_usd, status')
      .eq('id', intentId)
      .maybeSingle();
    if (iErr || !intent) {
      return NextResponse.json({ error: 'Intent não encontrado' }, { status: 404 });
    }

    const i = intent as {
      id: string;
      video_id: string;
      site_id: string;
      site_slug: string;
      payer_wallet: string;
      amount_units: string;
      amount_usd: number;
      status: string;
    };
    if (i.payer_wallet.toLowerCase() !== walletAddress) {
      return NextResponse.json({ error: 'Wallet não corresponde à intent' }, { status: 400 });
    }
    if (i.status === 'paid') {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    const okTransfer = await verifyUsdcTransferToTreasury({
      txHash: txHash as `0x${string}`,
      from: walletAddress,
      expectedAmount: BigInt(i.amount_units),
    });
    if (!okTransfer) {
      return NextResponse.json({ error: 'Transferência USDC não confirmada com o valor esperado' }, { status: 400 });
    }

    const { data: site } = await db
      .from('mini_sites')
      .select('user_id, wallet_address')
      .eq('id', i.site_id)
      .maybeSingle();
    const creatorWallet = (site as { wallet_address?: string | null } | null)?.wallet_address || '';
    let creatorPayoutTx = '';
    if (isAddress(creatorWallet)) {
      const creatorUnits = (BigInt(i.amount_units) * BigInt(80)) / BigInt(100);
      if (creatorUnits > BigInt(0)) {
        try {
          const payout = await payoutCreatorUsdc({ creatorWallet, amountUnits: creatorUnits });
          creatorPayoutTx = payout.txHash;
        } catch (e) {
          console.error('[video-usdc-confirm] payout creator', e);
        }
      }
    }

    await db.from('video_usdc_payment_intents' as never).update({
      status: 'paid',
      tx_hash: txHash.toLowerCase(),
      paid_at: new Date().toISOString(),
      creator_payout_tx: creatorPayoutTx || null,
    }).eq('id', intentId);

    await db.from('paywall_unlock_wallets' as never).upsert(
      {
        video_id: i.video_id,
        site_id: i.site_id,
        wallet_address: walletAddress,
        amount_paid: i.amount_usd,
        source: 'usdc_polygon',
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      },
      { onConflict: 'video_id,wallet_address' },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[video-usdc-confirm]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
