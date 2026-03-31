export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { computeSuggestedWeeklyPriceRange, type PricingInputs } from '@/lib/dynamicPricing';

const OWNER_EMAIL = (process.env.ADMIN_OWNER_EMAIL || 'arytcf@gmail.com').toLowerCase();

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

type AiConfig = {
  enabled?: boolean;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

async function loadAiConfig(db: ReturnType<typeof getDb>): Promise<AiConfig> {
  const { data } = await db
    .from('platform_settings' as never)
    .select('value')
    .eq('key', 'ai_config')
    .maybeSingle();
  const row = data as { value?: string } | null;
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as AiConfig;
  } catch {
    return {};
  }
}

async function callDeepSeekCompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  prompt: string
): Promise<string | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Respondes só com um JSON válido: {"min_usd_week":number,"max_usd_week":number,"note_pt":"breve explicação em português"}. Valores são preços semanais sugeridos para patrocínio em perfil web.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('[pricing-suggest] AI HTTP', res.status, t.slice(0, 500));
    return null;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json?.choices?.[0]?.message?.content?.trim() || null;
}

/**
 * POST { siteId: uuid } — dono do site ou admin; devolve heurística + opcional refinamento IA.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login necessário' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    if (!siteId) {
      return NextResponse.json({ error: 'siteId obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const { data: site, error: siteErr } = await db
      .from('mini_sites')
      .select(
        'id,user_id,follower_count,directory_profile_slug,site_category_slug,is_verified'
      )
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

    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { count: visitsLast30d } = await db
      .from('site_visits')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('created_at', since);

    const input: PricingInputs = {
      followers: Number((site as { follower_count?: number }).follower_count) || 0,
      visitsLast30d: visitsLast30d || 0,
      directoryProfileSlug: (site as { directory_profile_slug?: string }).directory_profile_slug,
      siteCategorySlug: (site as { site_category_slug?: string }).site_category_slug,
      isVerified: !!(site as { is_verified?: boolean }).is_verified,
    };

    const heuristic = computeSuggestedWeeklyPriceRange(input);

    const aiConfig = await loadAiConfig(db);
    const envKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    const apiKey = (aiConfig.apiKey || envKey || '').trim();
    // IA só se houver chave E (ativado no Admin OU AI_PRICING_ENABLED=true na Vercel).
    const useAi =
      !!apiKey &&
      (aiConfig.enabled === true || process.env.AI_PRICING_ENABLED === 'true');
    const baseUrl = (aiConfig.baseUrl || process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const model = aiConfig.model || process.env.AI_MODEL || 'deepseek-chat';

    let ai: { min_usd_week?: number; max_usd_week?: number; note_pt?: string } | null = null;

    if (useAi) {
      const prompt = `Mini-site com:
- Seguidores: ${input.followers}
- Visitas últimos 30 dias: ${input.visitsLast30d}
- Perfil diretório: ${input.directoryProfileSlug || 'n/d'}
- Categoria: ${input.siteCategorySlug || 'n/d'}
- Verificado: ${input.isVerified ? 'sim' : 'não'}

Heurística interna (US$/semana): min ${heuristic.min}, sugerido ~${heuristic.base}, max ${heuristic.max}.
Ajusta ligeiramente se fizer sentido para mercado de patrocínio B2B pequeno/médio. Responde só JSON.`;

      const raw = await callDeepSeekCompatible(baseUrl, model, apiKey, prompt);
      if (raw) {
        try {
          const cleaned = raw.replace(/^```json\s*|```$/g, '').trim();
          ai = JSON.parse(cleaned);
        } catch {
          console.warn('[pricing-suggest] parse AI JSON failed', raw.slice(0, 200));
        }
      }
    }

    return NextResponse.json({
      heuristic,
      ai: ai && typeof ai.min_usd_week === 'number' ? ai : null,
      inputs: input,
    });
  } catch (e) {
    console.error('[pricing-suggest]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
