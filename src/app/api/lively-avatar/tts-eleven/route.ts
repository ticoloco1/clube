export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { elevenLabsTtsMp3 } from '@/lib/elevenLabsTts';
import {
  getLivelySiteForApi,
  getServiceDb,
  getViewerUserId,
  rateLimitLively,
} from '@/lib/livelyAvatarServer';
import { startVisitorTrialIfNeeded, trialActive, trialEndsAtIso } from '@/lib/iaCreditsServer';
import {
  applySiteAiBudgetDeduction,
  evaluateIaAccessUsd,
  IA_USD,
  readSiteAiBudget,
} from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';

/**
 * POST { slug, text, voiceId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : '';

    if (!slug) {
      return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
    }
    if (!text || text.length > 2500) {
      return NextResponse.json({ error: 'texto inválido' }, { status: 400 });
    }
    if (!voiceId) {
      return NextResponse.json({ error: 'voiceId obrigatório' }, { status: 400 });
    }

    const viewerId = await getViewerUserId();
    const site = await getLivelySiteForApi(slug, viewerId);
    if (!site) {
      return NextResponse.json({ error: 'Assistente não disponível' }, { status: 403 });
    }

    if (!rateLimitLively(`tts11:${ip}:${slug}`)) {
      return NextResponse.json({ error: 'Muitos pedidos.' }, { status: 429 });
    }

    const isOwner = !!viewerId && site.user_id === viewerId;
    const db = getServiceDb();
    let trialStarted = site.lively_trial_started_at || null;
    if (!isOwner) {
      trialStarted = await startVisitorTrialIfNeeded(db, site.id, isOwner, trialStarted);
    }

    const visitorTrialing = !isOwner && trialActive(trialStarted);
    const billingApplies = site.user_id
      ? await iaUsdBillingApplies(db, {
          user_id: site.user_id,
          trial_publish_until: site.trial_publish_until,
        })
      : true;
    const exemptFromUsd = visitorTrialing || !billingApplies;
    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const access = evaluateIaAccessUsd({
      exemptFromUsdBudget: exemptFromUsd,
      freeUsd,
      paidUsd,
      costUsd: IA_USD.tts_eleven(),
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.code, trialEndsAt: trialEndsAtIso(trialStarted) },
        { status: 402 },
      );
    }

    const buf = await elevenLabsTtsMp3(text, voiceId);
    if (!buf) {
      return NextResponse.json({ error: 'ElevenLabs indisponível (ELEVENLABS_API_KEY / voiceId).' }, { status: 503 });
    }

    if (access.deductFreeUsd > 0 || access.deductPaidUsd > 0) {
      const ok = await applySiteAiBudgetDeduction(db, site.id, access.deductFreeUsd, access.deductPaidUsd);
      if (!ok) {
        return NextResponse.json({ error: 'Orçamento IA insuficiente' }, { status: 402 });
      }
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[lively-avatar/tts-eleven]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
