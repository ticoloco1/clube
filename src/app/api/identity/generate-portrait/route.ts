export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIdentitySessionUser } from '@/lib/identitySession';
import { runInstantIdPortrait } from '@/lib/replicateInstantId';
import { IDENTITY_STYLE_PRESETS, getStylePreset } from '@/lib/identityStylePresets';
import { applySiteAiBudgetDeduction, assertOwnerAiBudgetUsd, IA_USD, readSiteAiBudget } from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';
import { rateLimitLively } from '@/lib/livelyAvatarServer';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function isSafePublicImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * POST { siteId, imageUrl, stylePreset, brandColorHex?, productName? }
 * Opcionais para patrocínio: cor da marca e produto na mão (InstantID).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getIdentitySessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimitLively(`idimg:${ip}:${user.id}`)) {
      return NextResponse.json({ error: 'Muitos pedidos.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const stylePreset = typeof body.stylePreset === 'string' ? body.stylePreset.trim() : '';
    const brandColorHex =
      typeof body.brandColorHex === 'string' ? body.brandColorHex.replace(/[^#a-fA-F0-9]/g, '').slice(0, 14) : '';
    const productName =
      typeof body.productName === 'string'
        ? body.productName.replace(/[^a-zA-ZÀ-ÿ0-9\s\-.,'’]/g, '').slice(0, 90)
        : '';

    if (!siteId || !imageUrl) {
      return NextResponse.json({ error: 'siteId e imageUrl obrigatórios' }, { status: 400 });
    }
    if (!isSafePublicImageUrl(imageUrl)) {
      return NextResponse.json({ error: 'URL da imagem inválida (use HTTPS público)' }, { status: 400 });
    }

    const validIds = new Set(IDENTITY_STYLE_PRESETS.map((p) => p.id));
    if (!validIds.has(stylePreset as (typeof IDENTITY_STYLE_PRESETS)[number]['id'])) {
      return NextResponse.json({ error: 'stylePreset inválido' }, { status: 400 });
    }

    const db = getDb();
    const { data: site, error: siteErr } = await db
      .from('mini_sites')
      .select('id,user_id,trial_publish_until,ai_free_usd_remaining,ai_paid_usd_balance')
      .eq('id', siteId)
      .maybeSingle();

    if (siteErr || !site || (site as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }

    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const costUsd = IA_USD.identity_portrait();
    const billingApplies = await iaUsdBillingApplies(db, {
      user_id: (site as { user_id: string }).user_id,
      trial_publish_until: (site as { trial_publish_until?: string | null }).trial_publish_until,
    });
    const access = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
    if (!access.ok) {
      return NextResponse.json({ error: access.message, code: 'IA_PAYWALL' }, { status: 402 });
    }

    const preset = getStylePreset(stylePreset);
    let prompt = preset.prompt;
    if (brandColorHex) {
      prompt += `, outfit with visible accents in brand color ${brandColorHex}`;
    }
    if (productName) {
      prompt += `, clearly holding ${productName} in one hand toward the viewer`;
    }
    let negative = preset.negative;
    if (productName) {
      negative += ', duplicate products, cluttered labels, illegible text on product';
    }
    const result = await runInstantIdPortrait({
      imageUrl,
      prompt,
      negativePrompt: negative,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const debOk = await applySiteAiBudgetDeduction(db, siteId, access.deductFreeUsd, access.deductPaidUsd);
    if (!debOk) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }

    const { error: upErr } = await db
      .from('mini_sites')
      .update({
        identity_portrait_url: result.outputUrl,
        identity_style_preset: stylePreset,
      })
      .eq('id', siteId)
      .eq('user_id', user.id);

    if (upErr) {
      console.error('[identity/generate-portrait] update', upErr);
      return NextResponse.json({ error: 'Erro ao gravar retrato' }, { status: 500 });
    }

    return NextResponse.json({
      portraitUrl: result.outputUrl,
      stylePreset,
    });
  } catch (e) {
    console.error('[identity/generate-portrait]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
