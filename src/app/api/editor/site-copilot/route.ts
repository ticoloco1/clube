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
import { outputLanguageNameForPrompt, parseUiLang } from '@/lib/aiVisitorLanguage';
import type { Lang } from '@/lib/i18n/types';

const OWNER_EMAIL = (process.env.ADMIN_OWNER_EMAIL || 'arytcf@gmail.com').toLowerCase();

const COPILOT_TASKS = new Set([
  'profile_bio',
  'cv_headline',
  'seo_title',
  'seo_meta_description',
  'paywall_pitch',
  'page_html',
  'sponsor_voice_script',
  'site_audit',
]);

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

const copilotHits = new Map<string, { n: number; reset: number }>();
const COPILOT_WINDOW_MS = 60_000;
const COPILOT_MAX = 24;

function rateLimitCopilot(key: string): boolean {
  const now = Date.now();
  let h = copilotHits.get(key);
  if (!h || now > h.reset) {
    copilotHits.set(key, { n: 1, reset: now + COPILOT_WINDOW_MS });
    return true;
  }
  if (h.n >= COPILOT_MAX) return false;
  h.n += 1;
  return true;
}

function buildPrompts(task: string, ctx: Record<string, unknown>, extra: string, draft: string, outputLang: Lang) {
  const pack = JSON.stringify(ctx, null, 0);
  const tail = [extra && `Creator extra request:\n${extra}`, draft && `Current draft / text:\n${draft}`]
    .filter(Boolean)
    .join('\n\n');

  const baseUser = `${pack}\n\n${tail}`;
  const langName = outputLanguageNameForPrompt(outputLang);
  const langFooter = `\n\nOutput language (required): write everything in ${langName}.`;

  switch (task) {
    case 'profile_bio':
      return {
        system:
          `You are a copywriter for link-in-bio mini-sites (TrustBank). Write a short, warm, clear profile bio (2–4 sentences, max ~420 characters). No excessive hashtags. No markdown. Single final message only.${langFooter}`,
        user: `Improve or create the profile bio from:\n${baseUser}`,
        max_tokens: 400,
        temperature: 0.5,
      };
    case 'cv_headline':
      return {
        system:
          `You are a career coach. Generate a short CV headline (one line, max 120 characters), specific and memorable. No quotes. No markdown.${langFooter}`,
        user: `CV headline:\n${baseUser}`,
        max_tokens: 200,
        temperature: 0.45,
      };
    case 'seo_title':
      return {
        system:
          `SEO: generate a meta title (max 60 characters) for Google. Include site name or brand if it fits. One line, no quotes, no markdown.${langFooter}`,
        user: `Meta title:\n${baseUser}`,
        max_tokens: 120,
        temperature: 0.4,
      };
    case 'seo_meta_description':
      return {
        system:
          `SEO: meta description for Google (130–155 characters). Soft call-to-action. One line, no quotes, no markdown.${langFooter}`,
        user: `Meta description:\n${baseUser}`,
        max_tokens: 220,
        temperature: 0.45,
      };
    case 'paywall_pitch':
      return {
        system:
          `Write 2–3 ethical sales sentences for premium paywalled content (video). Enthusiastic but honest tone. Mention value, not unrealistic promises. No markdown.${langFooter}`,
        user: `Paywall pitch (price and context in JSON):\n${baseUser}`,
        max_tokens: 280,
        temperature: 0.5,
      };
    case 'page_html':
      return {
        system:
          `Generate simple HTML for a mini-site page: only <p>, <strong>, <ul>, <li>, <br/>. No scripts, no iframes, no heavy inline styles. Structured, readable content.${langFooter}`,
        user: `Menu page. Fill with useful content:\n${baseUser}`,
        max_tokens: 900,
        temperature: 0.45,
      };
    case 'sponsor_voice_script':
      return {
        system:
          `Write a short monologue (4–8 sentences) for a voice assistant on the site: welcome visitors, mention that the space accepts partnerships/ads elegantly, invite them to explore feed or links. If the creator names a brand in the extra request, you may mention it as a fictional illustrative example only — never claim real sponsorship. Natural tone. No markdown.${langFooter}`,
        user: `Speaking assistant script:\n${baseUser}`,
        max_tokens: 450,
        temperature: 0.55,
      };
    case 'site_audit':
      return {
        system:
          `You audit mini-sites. Return a bullet list with "- " (6 to 10 items) with concrete improvements: bio, SEO, links, paywall, clarity, trust. No markdown title line.${langFooter}`,
        user: `Quick audit:\n${baseUser}`,
        max_tokens: 650,
        temperature: 0.35,
      };
    default:
      return null;
  }
}

/**
 * POST { siteId, task, context?, draft?, pageLabel? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!rateLimitCopilot(`copilot:${user.id}:${ip}`)) {
      return NextResponse.json({ error: 'Muitos pedidos. Espera um minuto.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    const task = typeof body.task === 'string' ? body.task.trim() : '';
    const context = typeof body.context === 'string' ? body.context.trim().slice(0, 1200) : '';
    const draft = typeof body.draft === 'string' ? body.draft.trim().slice(0, 8000) : '';
    const pageLabel = typeof body.pageLabel === 'string' ? body.pageLabel.trim().slice(0, 80) : '';
    const paywallEnabled = body.paywallEnabled === true;
    const paywallPrice =
      typeof body.paywallPrice === 'string' ? body.paywallPrice.trim().slice(0, 20) : '';
    const uiLang = parseUiLang(body.uiLang);

    if (!siteId || !COPILOT_TASKS.has(task)) {
      return NextResponse.json({ error: 'siteId ou task inválido' }, { status: 400 });
    }

    const db = getDb();
    const { data: site, error: siteErr } = await db
      .from('mini_sites')
      .select(
        'id,user_id,site_name,bio,slug,cv_headline,cv_skills,seo_title,seo_description,lively_agent_instructions,trial_publish_until,ai_free_usd_remaining,ai_paid_usd_balance',
      )
      .eq('id', siteId)
      .maybeSingle();

    if (siteErr || !site) {
      return NextResponse.json({ error: 'Site não encontrado' }, { status: 404 });
    }

    const row = site as {
      user_id: string;
      site_name?: string;
      bio?: string;
      slug?: string;
      cv_headline?: string;
      cv_skills?: string[];
      seo_title?: string;
      seo_description?: string;
      lively_agent_instructions?: string;
    };

    const email = (user.email || '').toLowerCase();
    if (row.user_id !== user.id && email !== OWNER_EMAIL) {
      return NextResponse.json({ error: 'Apenas o dono do mini-site' }, { status: 403 });
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
      const costUsd = IA_USD.site_copilot_task();
      const billingApplies = await iaUsdBillingApplies(db, {
        user_id: row.user_id,
        trial_publish_until: (site as { trial_publish_until?: string | null }).trial_publish_until,
      });
      const bud = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
      if (!bud.ok) {
        return NextResponse.json({ error: bud.message, code: 'IA_PAYWALL' }, { status: 402 });
      }
      deductFreeUsd = bud.deductFreeUsd;
      deductPaidUsd = bud.deductPaidUsd;
    }

    const ctxObj: Record<string, unknown> = {
      nome: row.site_name || '',
      slug: row.slug || '',
      bio: row.bio || '',
      headline_cv: row.cv_headline || '',
      skills: Array.isArray(row.cv_skills) ? row.cv_skills.slice(0, 24) : [],
      seo_title: row.seo_title || '',
      seo_desc: row.seo_description || '',
      instrucoes_assistente_existentes: (row.lively_agent_instructions || '').slice(0, 500),
      paywall_video: { ativo: paywallEnabled, preco_sugerido_usd: paywallPrice || '—' },
    };

    if (task === 'page_html') {
      ctxObj.pagina = pageLabel || 'Página';
    }

    const prompts = buildPrompts(task, ctxObj, context, draft, uiLang);
    if (!prompts) {
      return NextResponse.json({ error: 'Task inválido' }, { status: 400 });
    }

    const out = await openAiCompatibleChat({
      ...runtime,
      system: prompts.system,
      user: prompts.user,
      max_tokens: prompts.max_tokens,
      temperature: prompts.temperature,
    });

    if (!out) {
      return NextResponse.json({ error: 'A IA não devolveu texto' }, { status: 502 });
    }

    let text = out.replace(/^\s*```(?:html|markdown)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    if (task === 'seo_title' && text.length > 65) {
      text = text.slice(0, 62).trim() + '…';
    }
    if (task === 'seo_meta_description' && text.length > 160) {
      text = text.slice(0, 157).trim() + '…';
    }

    const debOk = await applySiteAiBudgetDeduction(db, siteId, deductFreeUsd, deductPaidUsd);
    if (!debOk) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error('[site-copilot]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
