export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import type { AiConfigRow } from '@/lib/aiOpenAiCompatible';
import { pickAiRuntimeForSite } from '@/lib/byokRuntime';
import { getLivelySiteForApi, getServiceDb, getViewerUserId } from '@/lib/livelyAvatarServer';
import { trialActive } from '@/lib/iaCreditsServer';
import { evaluateIaAccessUsd, IA_USD, readSiteAiBudget } from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';

async function loadAiConfig(db: ReturnType<typeof getServiceDb>): Promise<AiConfigRow> {
  const { data } = await db.from('platform_settings' as never).select('value').eq('key', 'ai_config').maybeSingle();
  const row = data as { value?: string } | null;
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as AiConfigRow;
  } catch {
    return {};
  }
}

/**
 * GET ?slug= — indica se o assistente Lively pode ser mostrado (API + orçamento quando aplica).
 * Alinhado às verificações iniciais de POST /api/lively-avatar/chat.
 */
export async function GET(req: NextRequest) {
  try {
    const slug = (req.nextUrl.searchParams.get('slug') || '').trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ eligible: false, reason: 'slug' }, { status: 400 });
    }

    const viewerId = await getViewerUserId();
    const site = await getLivelySiteForApi(slug, viewerId);
    if (!site) {
      return NextResponse.json({ eligible: false, reason: 'disabled' });
    }

    const db = getServiceDb();
    const isOwner = !!viewerId && site.user_id === viewerId;
    const trialStarted = site.lively_trial_started_at || null;
    const visitorTrialing = !isOwner && trialActive(trialStarted);
    /** Primeira visita ainda sem `lively_trial_started_at`: o POST do chat inicia o trial — tratamos como isento para mostrar o assistente. */
    const visitorFirstVisitTrial = !isOwner && !trialStarted;

    const dbAi = await loadAiConfig(db);
    const picked = await pickAiRuntimeForSite(db, site.id, dbAi);
    if (!picked) {
      return NextResponse.json({ eligible: false, reason: 'no_api' });
    }

    const { useSiteUsdBudget } = picked;
    if (!useSiteUsdBudget) {
      return NextResponse.json({ eligible: true, byok: true });
    }

    const billingApplies = site.user_id
      ? await iaUsdBillingApplies(db, {
          user_id: site.user_id,
          trial_publish_until: site.trial_publish_until,
        })
      : true;
    const exemptFromUsd = visitorTrialing || visitorFirstVisitTrial || !billingApplies;
    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const checked = evaluateIaAccessUsd({
      exemptFromUsdBudget: exemptFromUsd,
      freeUsd,
      paidUsd,
      costUsd: IA_USD.chat(),
    });
    if (!checked.ok) {
      return NextResponse.json({
        eligible: false,
        reason: 'no_budget',
        code: 'IA_PAYWALL',
      });
    }

    return NextResponse.json({ eligible: true, byok: false });
  } catch (e) {
    console.error('[lively-avatar/eligibility]', e);
    return NextResponse.json({ eligible: false, reason: 'error' }, { status: 500 });
  }
}
