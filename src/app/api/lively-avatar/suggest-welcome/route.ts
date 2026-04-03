export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { openAiCompatibleChat, resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';
import { getLivelySiteForApi, getServiceDb, getViewerUserId, rateLimitLively } from '@/lib/livelyAvatarServer';
import { applySiteAiBudgetDeduction, assertOwnerAiBudgetUsd, IA_USD, readSiteAiBudget } from '@/lib/aiUsdBudget';
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
 * POST { slug, topic? } — dono do site: gera texto curto de boas-vindas / script para o assistente.
 */
export async function POST(req: NextRequest) {
  try {
    const viewer = await getViewerUserId();
    if (!viewer) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimitLively(`swelcome:${ip}:${viewer}`)) {
      return NextResponse.json({ error: 'Muitos pedidos.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 400) : '';

    if (!slug) {
      return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
    }

    const site = await getLivelySiteForApi(slug, viewer);
    if (!site || site.user_id !== viewer) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const db = getServiceDb();
    const dbAi = await loadAiConfig(db);
    const runtime = resolveAiRuntime(dbAi);
    if (!runtime) {
      return NextResponse.json({ error: 'IA não configurada (DEEPSEEK_API_KEY ou Admin).' }, { status: 503 });
    }

    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const costUsd = IA_USD.suggest_welcome();
    const billingApplies = site.user_id
      ? await iaUsdBillingApplies(db, {
          user_id: site.user_id,
          trial_publish_until: site.trial_publish_until,
        })
      : true;
    const bud = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
    if (!bud.ok) {
      return NextResponse.json({ error: bud.message, code: 'IA_PAYWALL' }, { status: 402 });
    }

    const userPrompt = topic
      ? `Mini-site: "${site.site_name}". Nicho/tema: ${topic}. Gera UMA mensagem de boas-vindas (máx. 350 caracteres), em português, tom acolhedor, convidando à conversa.`
      : `Mini-site: "${site.site_name}". Bio: ${(site.bio || '').slice(0, 500)}. Gera UMA mensagem de boas-vindas (máx. 350 caracteres), em português, profissional e calorosa.`;

    const text = await openAiCompatibleChat({
      ...runtime,
      system:
        'Respondes só com o texto final da mensagem, sem aspas, sem título, sem markdown. Uma frase ou dois períodos curtos.',
      user: userPrompt,
      max_tokens: 200,
      temperature: 0.55,
    });

    if (!text) {
      return NextResponse.json({ error: 'Falha ao gerar texto' }, { status: 502 });
    }

    const debOk = await applySiteAiBudgetDeduction(db, site.id, bud.deductFreeUsd, bud.deductPaidUsd);
    if (!debOk) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }

    return NextResponse.json({ welcome: text.slice(0, 500) });
  } catch (e) {
    console.error('[lively-avatar/suggest-welcome]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
