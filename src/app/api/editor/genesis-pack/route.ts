export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { openAiCompatibleChat, type AiConfigRow } from '@/lib/aiOpenAiCompatible';
import { pickAiRuntimeForSite } from '@/lib/byokRuntime';
import {
  applySiteAiBudgetDeduction,
  assertOwnerAiBudgetUsd,
  IA_USD,
  readSiteAiBudget,
} from '@/lib/aiUsdBudget';
import { iaUsdBillingApplies } from '@/lib/iaBillingSubscription';
import type { GenesisPack } from '@/lib/genesisPackTypes';
import { outputLanguageNameForPrompt, parseUiLang } from '@/lib/aiVisitorLanguage';

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

const hits = new Map<string, { n: number; reset: number }>();
const WIN = 60_000;
const MAX = 10;

function rateLimit(key: string): boolean {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || now > h.reset) {
    hits.set(key, { n: 1, reset: now + WIN });
    return true;
  }
  if (h.n >= MAX) return false;
  h.n += 1;
  return true;
}

function stripFences(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * POST { siteId, snapshot, brief? }
 * Devolve pacote JSON para preencher mini-site de uma vez.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimit(`genesis:${user.id}:${ip}`)) {
      return NextResponse.json({ error: 'Muitos pedidos. Espera um minuto.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    const brief = typeof body.brief === 'string' ? body.brief.trim().slice(0, 2000) : '';
    const snapshot = body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : {};
    const uiLang = parseUiLang(body.uiLang);
    const outLang = outputLanguageNameForPrompt(uiLang);

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
    const picked = await pickAiRuntimeForSite(db, siteId, aiConfig);
    if (!picked) {
      return NextResponse.json(
        { error: 'IA não configurada: chave DeepSeek no mini-site, DEEPSEEK_API_KEY ou Admin.' },
        { status: 503 },
      );
    }
    const { runtime, useSiteUsdBudget } = picked;

    let deductFreeUsd = 0;
    let deductPaidUsd = 0;
    if (useSiteUsdBudget) {
      const { freeUsd, paidUsd } = readSiteAiBudget(site);
      const costUsd = IA_USD.genesis_pack();
      const billingApplies = await iaUsdBillingApplies(db, {
        user_id: (site as { user_id: string }).user_id,
        trial_publish_until: (site as { trial_publish_until?: string | null }).trial_publish_until,
      });
      const bud = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
      if (!bud.ok) {
        return NextResponse.json({ error: bud.message, code: 'IA_PAYWALL' }, { status: 402 });
      }
      deductFreeUsd = bud.deductFreeUsd;
      deductPaidUsd = bud.deductPaidUsd;
    }

    const snapStr = JSON.stringify(snapshot).slice(0, 12_000);

    const raw = await openAiCompatibleChat({
      ...runtime,
      system: `You are the TrustBank Genesis engine (DeepSeek). Output a SINGLE valid JSON object — no markdown fences, no text before or after.

Visitor/editor UI language (from flags): ${outLang}.

Schema (all user-facing string values MUST be written in ${outLang}):
{
  "bio": "string, 2-4 sentences, max 450 chars",
  "cv_headline": "string, one strong line, max 110 chars",
  "cv_body_markdown": "string with ## sections and - lists: About, Experience, Skills, Contact/links",
  "seo_title": "max 58 chars",
  "seo_description": "130-155 chars",
  "link_ideas": [{"title":"string","url_hint":"https://... or hint if URL unknown"}],
  "feed_ideas": ["3 to 6 short post ideas for the feed"],
  "paywall_pitch": "2 sentences explaining premium content value, ethical tone"
}

Rules: use the snapshot JSON + creator brief. Do not invent concrete biographical facts not mentioned — use honest placeholders (e.g. "Company X") if missing. link_ideas: 4 to 7 realistic suggestions.`,
      user: `Snapshot:\n${snapStr}\n\nCreator brief:\n${brief || '(none — infer from snapshot)'}`,
      max_tokens: 2200,
      temperature: 0.5,
    });

    if (!raw) {
      return NextResponse.json({ error: 'IA sem resposta' }, { status: 502 });
    }

    let parsed: Partial<GenesisPack>;
    try {
      parsed = JSON.parse(stripFences(raw)) as Partial<GenesisPack>;
    } catch {
      return NextResponse.json({ error: 'JSON inválido da IA' }, { status: 502 });
    }

    const pack: GenesisPack = {
      bio: String(parsed.bio || '').slice(0, 500),
      cv_headline: String(parsed.cv_headline || '').slice(0, 120),
      cv_body_markdown: String(parsed.cv_body_markdown || '').slice(0, 12_000),
      seo_title: String(parsed.seo_title || '').slice(0, 70),
      seo_description: String(parsed.seo_description || '').slice(0, 160),
      link_ideas: Array.isArray(parsed.link_ideas)
        ? parsed.link_ideas
            .map((x: unknown) => {
              const o = x as { title?: string; url_hint?: string };
              return {
                title: String(o.title || '').slice(0, 80),
                url_hint: String(o.url_hint || '').slice(0, 300),
              };
            })
            .filter((x) => x.title)
            .slice(0, 10)
        : [],
      feed_ideas: Array.isArray(parsed.feed_ideas)
        ? parsed.feed_ideas.map((x: unknown) => String(x).slice(0, 200)).filter(Boolean).slice(0, 8)
        : [],
      paywall_pitch: String(parsed.paywall_pitch || '').slice(0, 500),
    };

    if (!pack.bio && !pack.cv_headline) {
      return NextResponse.json({ error: 'Pacote vazio' }, { status: 502 });
    }

    const debOk = await applySiteAiBudgetDeduction(db, siteId, deductFreeUsd, deductPaidUsd);
    if (!debOk) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }

    return NextResponse.json({ pack });
  } catch (e) {
    console.error('[genesis-pack]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
