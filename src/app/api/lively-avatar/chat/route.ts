export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { openAiCompatibleChatMessages, type AiConfigRow } from '@/lib/aiOpenAiCompatible';
import { pickAiRuntimeForSite } from '@/lib/byokRuntime';
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
import { addDays } from 'date-fns';
import {
  bookingVerticalPrompt,
  buildBookingAiAppendix,
  parseWeeklyHours,
} from '@/lib/bookingSchedule';
import {
  bookingCopyLang,
  livelyAgentPersonaLine,
  livelyAssistantStyleRules,
  livelyReplyInstruction,
  outputLanguageNameForPrompt,
  parseUiLang,
  resolveLivelyReplyLang,
} from '@/lib/aiVisitorLanguage';

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
    const uiLang = parseUiLang(body.uiLang);

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

    const dbAi = await loadAiConfig(db);
    const picked = await pickAiRuntimeForSite(db, site.id, dbAi, {
      ownerUserId: site.user_id || null,
      preferDeepseekByok: site.lively_use_deepseek_byok === true,
    });
    if (!picked) {
      return NextResponse.json(
        {
          error:
            'IA não configurada: coloca a tua chave DeepSeek no editor (IA) ou pede à plataforma para configurar a API.',
        },
        { status: 503 },
      );
    }
    const { runtime, useSiteUsdBudget } = picked;

    let access: { ok: true; deductFreeUsd: number; deductPaidUsd: number };
    if (!useSiteUsdBudget) {
      access = { ok: true, deductFreeUsd: 0, deductPaidUsd: 0 };
    } else {
      const billingApplies = site.user_id
        ? await iaUsdBillingApplies(db, {
            user_id: site.user_id,
            trial_publish_until: site.trial_publish_until,
          })
        : true;
      const exemptFromUsd = visitorTrialing || !billingApplies;
      const { freeUsd, paidUsd } = readSiteAiBudget(site);
      const checked = evaluateIaAccessUsd({
        exemptFromUsdBudget: exemptFromUsd,
        freeUsd,
        paidUsd,
        costUsd: IA_USD.chat(),
      });
      if (!checked.ok) {
        return NextResponse.json(
          {
            error: checked.message,
            code: checked.code,
            trialExpired: 'trialExpired' in checked ? Boolean(checked.trialExpired) : false,
            trialEndsAt: trialEndsAtIso(trialStarted),
          },
          { status: 402 },
        );
      }
      access = checked;
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

    const waDigits = String((site as { contact_phone?: string | null }).contact_phone || '').replace(/\D/g, '');
    const knowledge = buildSiteKnowledgeJson(
      {
        ...site,
        contact_whatsapp_digits: waDigits.length >= 8 ? waDigits : null,
      },
      links,
    );
    const instr = (site.lively_agent_instructions || '').trim();
    const dual = site.lively_dual_agent === true;

    const lastUserText = String(lastUser.content || '');
    const replyLang = resolveLivelyReplyLang({ uiLang, lastUserText });
    const langHint: 'en' | 'pt' = bookingCopyLang(replyLang);

    let bookingBlock = '';
    if ((site as { booking_enabled?: boolean }).booking_enabled === true) {
      try {
        const tz = String((site as { booking_timezone?: string }).booking_timezone || 'America/Sao_Paulo');
        const weekly = parseWeeklyHours((site as { booking_weekly_hours?: unknown }).booking_weekly_hours);
        const slotMin = Math.max(
          15,
          Math.min(180, Number((site as { booking_slot_minutes?: number }).booking_slot_minutes) || 30),
        );
        const until = addDays(new Date(), 14);
        const { data: br } = await db
          .from('site_bookings')
          .select('starts_at,ends_at,status')
          .eq('site_id', site.id)
          .lt('starts_at', until.toISOString())
          .gt('ends_at', new Date().toISOString());
        bookingBlock = `\n\nAGENDA / BOOKING:\n${buildBookingAiAppendix({
          timeZone: tz,
          weekly,
          slotMinutes: slotMin,
          bookingRows: (br || []) as { starts_at: string; ends_at: string; status?: string }[],
          langHint,
        })}`;
      } catch (e) {
        console.error('[lively-avatar/chat] booking context', e);
      }
    }

    const verticalBooking = bookingVerticalPrompt(
      (site as { booking_vertical?: string }).booking_vertical,
      langHint,
    );

    const personaLine = livelyAgentPersonaLine(replyLang);
    const langLine = livelyReplyInstruction(replyLang);
    const langName = outputLanguageNameForPrompt(replyLang);
    const styleRules = livelyAssistantStyleRules(langName);

    const baseRules = `Base de conhecimento (JSON do perfil — usa só isto e as diretrizes):
${knowledge}
${bookingBlock}

Diretrizes personalizadas do criador (obrigatório seguir quando aplicável):
${instr || '(nenhuma)'}

${verticalBooking}

Persona do assistente visual: ${personaLine}

Idioma da interface do visitante (bandeira / mini-site): ${langName} (código ${replyLang}).
${langLine}

${styleRules}

Agendamento: se existir calendário no site (secção de marcação) ou contacto na base de conhecimento, orienta o visitante a usar o calendário ou esse contacto. Não inventes URLs que não estejam no JSON.

Patrocínio / tom comercial: se as diretrizes do criador pedirem menções a marcas ou “experiência” patrocinada, integra com naturalidade, curto e amigável. Nunca afirmes que uma marca patrocina o site ou o criador sem isso estar explícito nas diretrizes; podes usar exemplos hipotéticos (“imagina saborear…”) se o criador assim pedir. Cumpre leis de publicidade do teu raciocínio (transparência, não enganar).`;

    const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    if (dual) {
      history.push({
        role: 'system',
        content: `TrustBank dual-agent system.
${baseRules}

The visitor talks with creator "${site.site_name}" and their mascot assistant.
Produce a short dialogue (max. 5 alternating lines) between:
- "owner" = the creator (human tone, first person)
- "agent" = the mascot assistant (persona above)

Reply ONLY with valid JSON, no markdown:
{"turns":[{"speaker":"owner"|"agent","text":"..."}, ...]}

All "text" fields must be written in ${langName} unless the visitor explicitly requested another language in their last message.
Rules: do not invent facts outside the knowledge JSON. Each line: one short sentence (max ~25 words), direct — no filler. Total dialogue under ~120 words. Sponsorship: same as global rules — no false sponsorship claims.`,
      });
    } else {
      history.push({
        role: 'system',
        content: `You are the virtual assistant for mini-site "${site.site_name}" on TrustBank.
${baseRules}

Follow RESPONSE STYLE above strictly. Professional but concise. Write in ${langName} unless the visitor explicitly asked for another language in their last message.`,
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
      max_tokens: dual ? 420 : 260,
      temperature: 0.32,
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
