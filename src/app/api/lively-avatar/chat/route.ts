export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  openAiCompatibleChatMessages,
  resolveAiRuntime,
  type AiConfigRow,
} from '@/lib/aiOpenAiCompatible';
import { getLivelySiteForApi, getServiceDb, getViewerUserId, rateLimitLively } from '@/lib/livelyAvatarServer';
import { buildSiteKnowledgeJson, type LinkRow } from '@/lib/siteKnowledge';
import {
  startVisitorTrialIfNeeded,
  trialActive,
  trialEndsAtIso,
} from '@/lib/iaCreditsServer';
import {
  applySiteAiBudgetDeduction,
  evaluateIaAccessUsd,
  IA_USD,
  readSiteAiBudget,
} from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';
import { defaultElevenVoice } from '@/lib/elevenLabsTts';

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

type Msg = { role: 'user' | 'assistant'; content: string };

function parseDualReply(raw: string): { speaker: 'owner' | 'agent'; text: string }[] | null {
  const s = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const j = JSON.parse(s) as { turns?: unknown };
    if (!Array.isArray(j.turns)) return null;
    const turns = j.turns
      .map((t: unknown) => {
        const o = t as { speaker?: string; text?: string };
        const sp = o.speaker === 'owner' ? 'owner' : 'agent';
        return { speaker: sp as 'owner' | 'agent', text: String(o.text || '').trim() };
      })
      .filter((t) => t.text);
    return turns.length ? turns : null;
  } catch {
    return null;
  }
}

/**
 * POST { slug, messages }
 * dual: lively_dual_agent → JSON turns owner|agent + vozes ElevenLabs default.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const messages = Array.isArray(body.messages) ? (body.messages as Msg[]) : [];

    if (!slug) {
      return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });
    }

    const viewerId = await getViewerUserId();
    const site = await getLivelySiteForApi(slug, viewerId);
    if (!site) {
      return NextResponse.json({ error: 'Assistente não disponível' }, { status: 403 });
    }

    if (!rateLimitLively(`chat:${ip}:${slug}`)) {
      return NextResponse.json({ error: 'Muitos pedidos. Tenta daqui a um minuto.' }, { status: 429 });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user' && m.content?.trim());
    if (!lastUser?.content?.trim()) {
      return NextResponse.json({ error: 'Mensagem em falta' }, { status: 400 });
    }
    if (lastUser.content.length > 2000) {
      return NextResponse.json({ error: 'Mensagem demasiado longa' }, { status: 400 });
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
      costUsd: IA_USD.chat(),
    });

    if (!access.ok) {
      return NextResponse.json(
        {
          error: access.message,
          code: access.code,
          trialExpired: 'trialExpired' in access ? Boolean(access.trialExpired) : false,
          trialEndsAt: trialEndsAtIso(trialStarted),
        },
        { status: 402 },
      );
    }

    const { data: linkRows } = await db
      .from('mini_site_links')
      .select('title,url')
      .eq('site_id', site.id)
      .order('sort_order', { ascending: true })
      .limit(40);

    const links: LinkRow[] = (linkRows || [])
      .map((r: { title?: string; url?: string }) => ({
        title: String(r.title || '').trim() || 'Link',
        url: String(r.url || '').trim(),
      }))
      .filter((l) => l.url);

    const knowledge = buildSiteKnowledgeJson(site, links);
    const instr = (site.lively_agent_instructions || '').trim();
    const dual = site.lively_dual_agent === true;

    const preset = site.lively_floating_preset || 'classic';
    const agentPersona: Record<string, string> = {
      monkey_trader: 'Agente é um macaco trader agressivo em vendas, direto e confiante.',
      shark_lawyer: 'Agente é um tubarão advogado: autoridade, seriedade, precisão.',
      pet_influencer: 'Agente é fofo e amigável, estilo influencer pet/mod.',
      alien_tech: 'Agente é alien tech, futurista, para público dev/tech.',
      classic: 'Agente é profissional e acolhedor.',
    };

    const baseRules = `Base de conhecimento (JSON do perfil — usa só isto e as diretrizes):
${knowledge}

Diretrizes personalizadas do criador (obrigatório seguir quando aplicável):
${instr || '(nenhuma)'}

Persona do assistente visual: ${agentPersona[preset] || agentPersona.classic}

Agendamento: se existir link de marcação, calendário ou contacto direto na base de conhecimento, sugere-o para consultas ou reuniões. Não inventes URLs que não estejam no JSON.

Patrocínio / tom comercial: se as diretrizes do criador pedirem menções a marcas ou “experiência” patrocinada, integra com naturalidade, curto e amigável. Nunca afirmes que uma marca patrocina o site ou o criador sem isso estar explícito nas diretrizes; podes usar exemplos hipotéticos (“imagina saborear…”) se o criador assim pedir. Cumpre leis de publicidade do teu raciocínio (transparência, não enganar).`;

    const dbAi = await loadAiConfig(db);
    const runtime = resolveAiRuntime(dbAi);
    if (!runtime) {
      return NextResponse.json(
        { error: 'IA não configurada na plataforma (chave API / Admin).' },
        { status: 503 },
      );
    }

    const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    if (dual) {
      history.push({
        role: 'system',
        content: `Sistema dual-agente na TrustBank.
${baseRules}

O visitante fala com o criador "${site.site_name}" e o seu assistente mascote.
Gera um diálogo curto (máx. 6 réplicas alternadas) entre:
- "owner" = o criador (tom humano, primeira pessoa)
- "agent" = o mascote assistente (persona acima)

Responde APENAS com JSON válido, sem markdown:
{"turns":[{"speaker":"owner"|"agent","text":"..."}, ...]}

Regras: não inventes factos fora do JSON de conhecimento; português por defeito; respostas curtas. Patrocínio: igual que nas diretrizes gerais — sem afirmações falsas de patrocínio.`,
      });
    } else {
      history.push({
        role: 'system',
        content: `És o assistente virtual do mini-site "${site.site_name}" na TrustBank.
${baseRules}

Responde de forma breve (máx. ~120 palavras), profissional. Português por defeito.`,
      });
    }

    for (const m of messages.slice(-10)) {
      if (m.role !== 'user' && m.role !== 'assistant') continue;
      const c = String(m.content || '').trim();
      if (!c) continue;
      history.push({ role: m.role, content: c.slice(0, 2000) });
    }

    const reply = await openAiCompatibleChatMessages({
      ...runtime,
      messages: history,
      max_tokens: dual ? 700 : 500,
      temperature: 0.45,
    });

    if (!reply) {
      return NextResponse.json({ error: 'Falha ao gerar resposta' }, { status: 502 });
    }

    if (access.deductFreeUsd > 0 || access.deductPaidUsd > 0) {
      const ok = await applySiteAiBudgetDeduction(db, site.id, access.deductFreeUsd, access.deductPaidUsd);
      if (!ok) {
        return NextResponse.json({ error: 'Orçamento IA insuficiente (atualiza e tenta de novo).' }, { status: 402 });
      }
    }

    const voiceOwner =
      (site.lively_elevenlabs_voice_owner || '').trim() || defaultElevenVoice('owner');
    const voiceAgent =
      (site.lively_elevenlabs_voice_agent || '').trim() || defaultElevenVoice('agent');

    if (dual) {
      const turns = parseDualReply(reply);
      if (!turns) {
        return NextResponse.json({
          dual: false,
          reply: reply.trim(),
          voices: { owner: voiceOwner, agent: voiceAgent },
          trialActive: visitorTrialing,
          trialEndsAt: trialEndsAtIso(trialStarted),
        });
      }
      return NextResponse.json({
        dual: true,
        turns,
        voices: { owner: voiceOwner, agent: voiceAgent },
        trialActive: visitorTrialing,
        trialEndsAt: trialEndsAtIso(trialStarted),
      });
    }

    return NextResponse.json({
      dual: false,
      reply: reply.trim(),
      voices: { owner: voiceOwner, agent: voiceAgent },
      trialActive: visitorTrialing,
      trialEndsAt: trialEndsAtIso(trialStarted),
    });
  } catch (e) {
    console.error('[lively-avatar/chat]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
