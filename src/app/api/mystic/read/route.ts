export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { openAiCompatibleChat, resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getSessionSupabase() {
  const cookieStore = cookies();
  return createServerClient(
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
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateOk(key: string): boolean {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || now > h.reset) {
    hits.set(key, { n: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (h.n >= MAX_PER_WINDOW) return false;
  h.n += 1;
  return true;
}

/**
 * POST { siteId, service: 'tarot' | 'lottery_premium', context?: string }
 * Consome 1 crédito (mystic_entitlements) e devolve texto gerado (DeepSeek / OpenAI compatível).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSessionSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Inicia sessão para usar uma leitura paga.' }, { status: 401 });
    }

    const body = (await req.json()) as {
      siteId?: string;
      service?: string;
      context?: string;
    };
    const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
    const service = body.service === 'lottery_premium' ? 'lottery_premium' : body.service === 'tarot' ? 'tarot' : '';
    const ctx = typeof body.context === 'string' ? body.context.trim().slice(0, 800) : '';

    if (!siteId || !service) {
      return NextResponse.json({ error: 'siteId e service (tarot | lottery_premium) são obrigatórios.' }, { status: 400 });
    }

    if (!rateOk(`${user.id}:${siteId}`)) {
      return NextResponse.json({ error: 'Muitos pedidos. Tenta daqui a um minuto.' }, { status: 429 });
    }

    const admin = getDb();
    const { data: site } = await admin
      .from('mini_sites')
      .select('id, mystic_public_enabled, site_name')
      .eq('id', siteId)
      .maybeSingle();
    if (!site || !(site as { mystic_public_enabled?: boolean }).mystic_public_enabled) {
      return NextResponse.json({ error: 'Serviço indisponível neste site.' }, { status: 404 });
    }

    const { data: consumed, error: rpcErr } = await supabase.rpc('consume_mystic_entitlement' as never, {
      p_site_id: siteId,
      p_service: service,
    } as never);
    if (rpcErr) {
      console.error('[mystic/read] rpc', rpcErr);
      return NextResponse.json(
        { error: 'Não foi possível validar o crédito. Executa supabase-minisite-mystic-tarot-loteria.sql no Supabase (tabela + RPC).' },
        { status: 500 },
      );
    }
    if (consumed !== true) {
      return NextResponse.json(
        { error: 'Sem créditos para este serviço. Compra no carrinho e conclui o pagamento no Stripe.' },
        { status: 402 },
      );
    }

    const aiRow = await loadAiConfig(admin);
    const runtime = resolveAiRuntime(aiRow);
    if (!runtime) {
      return NextResponse.json({ error: 'IA do sistema não configurada (chave ou ai_config).' }, { status: 503 });
    }

    const siteName = String((site as { site_name?: string }).site_name || 'este perfil');

    let system: string;
    let userPrompt: string;
    if (service === 'tarot') {
      system = `És um leitor de tarô para entretenimento no perfil "${siteName}". Responde em português. Não alegues poderes sobrenaturais reais; é simbólico e reflexivo. Traz uma tiragem curta (3 cartas com nomes tradicionais), interpretação breve e tom acolhedor. Máx. ~350 palavras.`;
      userPrompt = ctx
        ? `Pergunta ou tema do visitante: ${ctx}`
        : 'Faz uma leitura geral para o visitante, sem pergunta específica.';
    } else {
      system = `És um assistente de lotaria apenas para entretenimento no perfil "${siteName}". Responde em português. Deixa claro que não há garantia de prémios. Sugere uma combinação simbólica "premium" (números + breve texto motivacional). Máx. ~250 palavras.`;
      userPrompt = ctx ? `Preferências ou jogo referido: ${ctx}` : 'Gera uma sugestão simbólica premium para o visitante.';
    }

    const text = await openAiCompatibleChat({
      ...runtime,
      system,
      user: userPrompt,
      max_tokens: 700,
      temperature: 0.55,
    });
    if (!text) {
      return NextResponse.json({ error: 'A IA não devolveu texto. Tenta outra vez.' }, { status: 503 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error('[mystic/read]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
