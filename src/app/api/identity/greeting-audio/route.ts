export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { elevenLabsTtsMp3 } from '@/lib/elevenLabsTts';
import { openAiCompatibleChat, resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';
import { getViewerUserId, getServiceDb, rateLimitLively } from '@/lib/livelyAvatarServer';
import { getIdentitySiteForGreeting } from '@/lib/identitySiteApi';
import { startVisitorTrialIfNeeded, trialActive } from '@/lib/iaCreditsServer';
import {
  applySiteAiBudgetDeduction,
  evaluateIaAccessUsd,
  IA_USD,
  readSiteAiBudget,
} from '@/lib/aiUsdBudget';
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

const LANG_HINT: Record<string, string> = {
  pt: 'Portuguese (Brazil)',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
};

/**
 * POST { slug, lang?: 'pt'|'en'|'ja'|'ko' }
 * Gera texto curto (DeepSeek) + TTS com a voz do site (clone ou ID manual).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const langRaw = typeof body.lang === 'string' ? body.lang.trim().toLowerCase() : 'pt';
    const lang = LANG_HINT[langRaw] ? langRaw : 'pt';

    if (!slug) {
      return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
    }

    if (!rateLimitLively(`idgreet:${ip}:${slug}`)) {
      return NextResponse.json({ error: 'Muitos pedidos.' }, { status: 429 });
    }

    const viewerId = await getViewerUserId();
    const site = await getIdentitySiteForGreeting(slug, viewerId);
    if (!site) {
      return NextResponse.json({ error: 'Saudação não disponível (voz ou site)' }, { status: 403 });
    }

    const db = getServiceDb();
    let trialStarted = site.lively_trial_started_at || null;
    const isOwner = site.isOwner;
    if (!isOwner) {
      trialStarted = await startVisitorTrialIfNeeded(db, site.id, isOwner, trialStarted);
    }

    const visitorTrialing = !isOwner && trialActive(trialStarted);
    const billingApplies = await iaUsdBillingApplies(db, {
      user_id: site.user_id,
      trial_publish_until: site.trial_publish_until,
    });
    const exemptFromUsd = visitorTrialing || !billingApplies;
    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const costUsd = IA_USD.identity_greeting();
    const access = evaluateIaAccessUsd({
      exemptFromUsdBudget: exemptFromUsd,
      freeUsd,
      paidUsd,
      costUsd,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.message, code: access.code }, { status: 402 });
    }

    const aiConfig = await loadAiConfig(db);
    const runtime = resolveAiRuntime(aiConfig);
    if (!runtime) {
      return NextResponse.json({ error: 'IA não configurada (API key / ai_config)' }, { status: 503 });
    }

    const langLabel = LANG_HINT[lang] || 'Portuguese (Brazil)';
    const system = `You write a very short welcome line (1–2 sentences) for a personal mini-site owner speaking to a new visitor. Output ONLY the spoken text in ${langLabel}, warm and concise, no quotes, no stage directions.`;
    const userPrompt = `Site name: ${site.site_name}. Bio: ${site.bio || 'n/a'}.`;

    const text = await openAiCompatibleChat({
      baseUrl: runtime.baseUrl,
      model: runtime.model,
      apiKey: runtime.apiKey,
      system,
      user: userPrompt,
      max_tokens: 200,
      temperature: 0.45,
    });

    if (!text || text.length < 3) {
      return NextResponse.json({ error: 'Falha ao gerar texto da saudação' }, { status: 503 });
    }

    const buf = await elevenLabsTtsMp3(text.slice(0, 2500), site.voiceId);
    if (!buf) {
      return NextResponse.json({ error: 'ElevenLabs indisponível' }, { status: 503 });
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
        'X-Identity-Greeting-Lang': lang,
      },
    });
  } catch (e) {
    console.error('[identity/greeting-audio]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
