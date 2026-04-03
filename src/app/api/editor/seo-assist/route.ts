export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { openAiCompatibleChat, resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';
import { getRootHostname, miniSiteCanonicalUrl } from '@/lib/siteBaseUrl';
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

type SeoPayload = {
  siteName?: string;
  bio?: string;
  slug?: string;
  cvHeadline?: string;
  cvSkills?: string[];
  links?: { title?: string; url?: string }[];
  pageLabels?: string[];
  /** Nicho / categoria (ex.: site_category) */
  category?: string;
  /** Subcategoria (ex.: directory profile type) */
  subcategory?: string;
};

type SeoPackJson = {
  seoTitle?: string;
  seoDescription?: string;
  heading?: string;
  intro?: string;
  services?: string[];
  cta?: string;
  schemaType?: string;
};

function stripCodeFences(s: string): string {
  return s
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * POST { siteId, action: 'magic_description' | 'suggest_keywords', payload? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    const rawAction = typeof body.action === 'string' ? body.action : 'magic_description';
    const action =
      rawAction === 'suggest_keywords'
        ? 'suggest_keywords'
        : rawAction === 'seo_pack'
          ? 'seo_pack'
          : 'magic_description';
    const payload = (body.payload || {}) as SeoPayload;

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
      return NextResponse.json({ error: 'Apenas o dono do mini-site' }, { status: 403 });
    }

    const aiConfig = await loadAiConfig(db);
    const runtime = resolveAiRuntime(aiConfig);
    if (!runtime) {
      return NextResponse.json(
        { error: 'IA não configurada. Define DEEPSEEK_API_KEY ou OPENAI_API_KEY (ou chave no Admin).' },
        { status: 503 },
      );
    }

    const { freeUsd, paidUsd } = readSiteAiBudget(site);
    const costUsd = IA_USD.site_copilot_task();
    const billingApplies = await iaUsdBillingApplies(db, {
      user_id: (site as { user_id: string }).user_id,
      trial_publish_until: (site as { trial_publish_until?: string | null }).trial_publish_until,
    });
    const bud = assertOwnerAiBudgetUsd(freeUsd, paidUsd, costUsd, !billingApplies);
    if (!bud.ok) {
      return NextResponse.json({ error: bud.message, code: 'IA_PAYWALL' }, { status: 402 });
    }

    const ctx = JSON.stringify(
      {
        nome: payload.siteName || '',
        bio: payload.bio || '',
        slug: payload.slug || '',
        headline: payload.cvHeadline || '',
        skills: payload.cvSkills || [],
        links: (payload.links || []).slice(0, 20),
        paginas: payload.pageLabels || [],
        categoria: payload.category || '',
        subcategoria: payload.subcategory || '',
      },
      null,
      0,
    );

    if (action === 'seo_pack') {
      const slug = (payload.slug || '').trim().toLowerCase();
      const rootHost = getRootHostname();
      const domain = slug ? `${slug}.${rootHost}` : `{slug}.${rootHost}`;
      const canonical = slug ? miniSiteCanonicalUrl(slug) : `https://{slug}.${rootHost}`;
      const cat = (payload.category || 'general').trim() || 'general';
      const sub = (payload.subcategory || 'professional').trim() || 'professional';

      const raw = await openAiCompatibleChat({
        ...runtime,
        system: `You are an SEO specialist for independent mini-sites on TrustBank.
Respond ONLY with a single valid JSON object (no markdown fences, no commentary). All user-facing strings in English.
Schema for the JSON:
{
  "seoTitle": "string, 55-60 characters for Google",
  "seoDescription": "string, 150-160 characters",
  "heading": "string, main H1",
  "intro": "string, one opening paragraph 200-300 words, persuasive and keyword-aware",
  "services": ["string","string","string"],
  "cta": "string, short call to action",
  "schemaType": "LocalBusiness | ProfessionalService | Product"
}`,
        user: `Generate optimized content for a mini-site.

Domain: ${domain}
Canonical URL: ${canonical}
Business type: ${cat} — ${sub}
Context (JSON): ${ctx}`,
        max_tokens: 2800,
        temperature: 0.35,
      });
      if (!raw) {
        return NextResponse.json({ error: 'A IA não devolveu texto' }, { status: 502 });
      }
      let pack: SeoPackJson = {};
      try {
        pack = JSON.parse(stripCodeFences(raw)) as SeoPackJson;
      } catch {
        return NextResponse.json({ error: 'JSON inválido da IA' }, { status: 502 });
      }
      const allowed = new Set(['LocalBusiness', 'ProfessionalService', 'Product']);
      let schemaType = String(pack.schemaType || 'ProfessionalService').trim();
      if (!allowed.has(schemaType)) schemaType = 'ProfessionalService';

      let seoTitle = String(pack.seoTitle || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      let seoDescription = String(pack.seoDescription || '').replace(/\s+/g, ' ').trim();
      if (seoDescription.length > 160) seoDescription = seoDescription.slice(0, 157).trim() + '…';

      const extraNode: Record<string, unknown> = {
        '@type': schemaType,
        name: String(pack.heading || payload.siteName || slug || 'Professional').slice(0, 120),
        description: seoDescription || String(pack.intro || '').slice(0, 300),
        url: canonical,
      };
      if (Array.isArray(pack.services) && pack.services.length) {
        extraNode.makesOffer = pack.services.slice(0, 6).map((s) => ({
          '@type': 'Offer',
          name: String(s).slice(0, 80),
        }));
      }
      const seoJsonLd = JSON.stringify(extraNode, null, 2);

      const debPack = await applySiteAiBudgetDeduction(db, siteId, bud.deductFreeUsd, bud.deductPaidUsd);
      if (!debPack) {
        return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
      }

      return NextResponse.json({
        pack: {
          ...pack,
          seoTitle,
          seoDescription,
          schemaType,
        },
        seoJsonLd,
      });
    }

    if (action === 'magic_description') {
      const raw = await openAiCompatibleChat({
        ...runtime,
        system:
          'És especialista em SEO para páginas pessoais / link-in-bio. Responde APENAS com o texto da meta descrição, sem aspas, sem markdown, sem prefixos. Português europeu ou brasileiro conforme o conteúdo. Entre 120 e 155 caracteres. Inclui call-to-action suave se couber. Uma única linha.',
        user: `Gera a meta descrição para este mini-site:\n${ctx}`,
        max_tokens: 220,
        temperature: 0.45,
      });
      if (!raw) {
        return NextResponse.json({ error: 'A IA não devolveu texto' }, { status: 502 });
      }
      let text = raw.replace(/^["«»]|["«»]$/g, '').replace(/\s+/g, ' ').trim();
      if (text.length > 160) text = text.slice(0, 157).trim() + '…';
      const debOk = await applySiteAiBudgetDeduction(db, siteId, bud.deductFreeUsd, bud.deductPaidUsd);
      if (!debOk) {
        return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
      }
      return NextResponse.json({ description: text });
    }

    const raw = await openAiCompatibleChat({
      ...runtime,
      system:
        'Respondes APENAS com JSON válido: {"tags":["frase 1","frase 2",...]}. 5 a 8 tags curtas (2 a 5 palavras) para pesquisa Google, nicho e cauda longa, em português. Sem markdown, sem texto extra.',
      user: `Sugere tags de pesquisa (nicho profissional) para:\n${ctx}`,
      max_tokens: 400,
      temperature: 0.35,
    });
    if (!raw) {
      return NextResponse.json({ error: 'A IA não devolveu JSON' }, { status: 502 });
    }
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(stripCodeFences(raw)) as { tags?: unknown };
      if (Array.isArray(parsed.tags)) {
        tags = parsed.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 12);
      }
    } catch {
      return NextResponse.json({ error: 'JSON inválido da IA' }, { status: 502 });
    }
    const debOk2 = await applySiteAiBudgetDeduction(db, siteId, bud.deductFreeUsd, bud.deductPaidUsd);
    if (!debOk2) {
      return NextResponse.json({ error: 'Falha ao debitar orçamento IA' }, { status: 402 });
    }
    return NextResponse.json({ tags });
  } catch (e) {
    console.error('[seo-assist]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
