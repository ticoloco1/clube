export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { openAiCompatibleChatMessages, resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';
import {
  applySiteAiBudgetDeduction,
  assertOwnerAiBudgetUsd,
  IA_USD,
  readSiteAiBudget,
} from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';

const OWNER_EMAIL = (process.env.ADMIN_OWNER_EMAIL || 'arytcf@gmail.com').toLowerCase();

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

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

async function loadAiConfig(db: ReturnType<typeof getDb>): Promise<AiConfigRow> {
  const { data } = await db.from('platform_settings' as never).select('value').eq('key', 'ai_config').maybeSingle();
  const row = data as { value?: string } | null;
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as AiConfigRow;
  } catch {
    return {};
  }
}

const coachHits = new Map<string, { n: number; reset: number }>();
const COACH_WINDOW_MS = 60_000;
const COACH_MAX = 16;

function rateLimitCoach(key: string): boolean {
  const now = Date.now();
  let h = coachHits.get(key);
  if (!h || now > h.reset) {
    coachHits.set(key, { n: 1, reset: now + COACH_WINDOW_MS });
    return true;
  }
  if (h.n >= COACH_MAX) return false;
  h.n += 1;
  return true;
}

type Msg = { role: 'user' | 'assistant'; content: string };

/**
 * POST { siteId, messages, snapshot }
 * snapshot = estado actual do editor (pode incluir alterações ainda não gravadas).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimitCoach(`coach:${user.id}:${ip}`)) {
      return NextResponse.json({ error: 'Muitos pedidos. Espera um minuto.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const snapshot = body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : {};

    if (!siteId) {
      return NextResponse.json({ error: 'siteId obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const { data: site, error: siteErr } = await db
      .from('mini_sites')
      .select('id,user_id,trial_publish_until,ai_free_usd_remaining,ai_paid_usd_balance')
      .eq('id', siteId)
      .maybeSingle();

    if (siteErr || !site) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }

    const ownerId = (site as { user_id: string }).user_id;
    const email = (user.email || '').toLowerCase();
    if (ownerId !== user.id && email !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Apenas o dono' }, { status: 403 });
    }

    const aiConfig = await loadAiConfig(db);
    const runtime = resolveAiRuntime(aiConfig);
    if (!runtime) {
      return NextResponse.json(
        { error: 'IA não configurada (DEEPSEEK_API_KEY ou Admin).' },
        { status: 503 },
      );
    }

    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const costUsd = IA_USD.site_coach_turn();
    const billingApplies = await iaUsdBillingApplies(db, {
      user_id: (site as { user_id: string }).user_id,
      trial_publish_until: (site as { trial_publish_until?: string | null }).trial_publish_until,
    });
    const bud = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
    if (!bud.ok) {
      return NextResponse.json({ error: bud.message, code: 'IA_PAYWALL' }, { status: 402 });
    }

    const messages: Msg[] = rawMessages
      .map((m: unknown) => {
        const o = m as { role?: string; content?: string };
        const role = o.role === 'assistant' ? 'assistant' : 'user';
        const content = String(o.content || '').trim().slice(0, 6000);
        return { role, content } as Msg;
      })
      .filter((m: Msg) => m.content);

    if (!messages.length) {
      return NextResponse.json({ error: 'Mensagens em falta' }, { status: 400 });
    }

    const snapStr = JSON.stringify(snapshot).slice(0, 14_000);

    const system = `És o guia IA do TrustBank (DeepSeek) no editor de mini-sites. O criador está a montar o perfil em tempo real.

REGRAS:
- Lê o snapshot JSON (estado actual: nome, bio, links, vídeos, CV, SEO, páginas, feed). Pode estar desactualizado em segundos — usa como guia.
- Responde em português, tom encorajador, directo, futurista mas claro.
- Cada mensagem: no máximo 2–3 parágrafos curtos OU lista com 3–5 bullets. Evita blocos gigantes.
- Faz UMA pergunta principal no fim quando estiveres a guiar (nome, links, temas de posts, paywall, SEO).
- Se o utilizador colar notas soltas para o CV, propõe um CV estruturado (secções: headline, sobre, experiência, skills, contacto) em markdown dentro da resposta — ele pode copiar para o separador CV.
- Para posts no feed: sugere ideias de títulos ou ângulos, não inventes factos sobre a pessoa.
- Paywall: explica quando faz sentido e como comunicar valor; não prometas rendimentos.
- SEO: lembra título + meta descrição + links com texto descritivo.
- Se a última mensagem do utilizador for exactamente ___BOOTSTRAP___, ignora essa tag: analisa o snapshot, saúda em 1 frase e dá o melhor próximo passo + uma pergunta.

Snapshot:
${snapStr}`;

    const history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: system },
    ];

    for (const m of messages.slice(-14)) {
      history.push({ role: m.role, content: m.content });
    }

    const reply = await openAiCompatibleChatMessages({
      ...runtime,
      messages: history,
      max_tokens: 900,
      temperature: 0.55,
    });

    if (!reply) {
      return NextResponse.json({ error: 'Falha da IA' }, { status: 502 });
    }

    const debOk = await applySiteAiBudgetDeduction(db, siteId, bud.deductFreeUsd, bud.deductPaidUsd);
    if (!debOk) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }

    return NextResponse.json({ reply: reply.trim().slice(0, 8000) });
  } catch (e) {
    console.error('[site-coach]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
