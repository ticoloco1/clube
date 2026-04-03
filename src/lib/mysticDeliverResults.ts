import type { SupabaseClient } from '@supabase/supabase-js';
import { openAiCompatibleChat, resolveAiRuntime, type AiConfigRow } from '@/lib/aiOpenAiCompatible';

function paymentRefKey(ref: string): string {
  return ref.slice(0, 200);
}

async function loadAiConfig(db: SupabaseClient): Promise<AiConfigRow> {
  const { data } = await db.from('platform_settings' as never).select('value').eq('key', 'ai_config').maybeSingle();
  const row = data as { value?: string } | null;
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as AiConfigRow;
  } catch {
    return {};
  }
}

function drawLotteryNumbers(): { main: number[]; stars: number[] } {
  const pool = Array.from({ length: 49 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const main = pool.slice(0, 6).sort((a, b) => a - b);
  const stars = [Math.floor(Math.random() * 12) + 1];
  return { main, stars };
}

export type MysticDelivered = {
  tarot: { text: string } | null;
  lottery: { main: number[]; stars: number[]; text: string | null } | null;
};

export async function loadMysticDeliverySnapshot(
  db: SupabaseClient,
  buyerId: string,
  siteId: string,
  paymentRef: string,
): Promise<MysticDelivered> {
  const ref = paymentRefKey(paymentRef);
  const { data: rows } = await db
    .from('mystic_entitlements' as any)
    .select('service, result_text, result_payload')
    .eq('buyer_id', buyerId)
    .eq('site_id', siteId)
    .eq('payment_ref', ref);

  const out: MysticDelivered = { tarot: null, lottery: null };
  for (const row of rows || []) {
    const r = row as {
      service?: string;
      result_text?: string | null;
      result_payload?: { main?: number[]; stars?: number[] } | null;
    };
    if (r.service === 'tarot' && typeof r.result_text === 'string' && r.result_text.trim()) {
      out.tarot = { text: r.result_text.trim() };
    }
    if (r.service === 'lottery_premium' && r.result_payload && Array.isArray(r.result_payload.main)) {
      out.lottery = {
        main: r.result_payload.main.map(Number).filter((n) => Number.isFinite(n)),
        stars: Array.isArray(r.result_payload.stars)
          ? r.result_payload.stars.map(Number).filter((n) => Number.isFinite(n))
          : [],
        text: typeof r.result_text === 'string' ? r.result_text : null,
      };
    }
  }
  return out;
}

/**
 * Preenche result_text / result_payload e zera uses_remaining nos entitlements deste pagamento.
 */
export async function deliverMysticResultsForPayment(
  db: SupabaseClient,
  buyerId: string,
  siteId: string,
  paymentRef: string,
  siteName: string,
  /** Contexto opcional guardado no pedido — por agora null; pode estender metadata checkout */
  _context?: { tarot?: string; lottery?: string },
): Promise<MysticDelivered> {
  const ref = paymentRefKey(paymentRef);
  const { data: rows } = await db
    .from('mystic_entitlements' as any)
    .select('id, service, uses_remaining, result_text, result_payload')
    .eq('buyer_id', buyerId)
    .eq('site_id', siteId)
    .eq('payment_ref', ref);

  const out: MysticDelivered = { tarot: null, lottery: null };
  const list = (rows || []) as {
    id: string;
    service: string;
    uses_remaining: number;
    result_text?: string | null;
    result_payload?: unknown;
  }[];

  const aiRow = await loadAiConfig(db);
  const runtime = resolveAiRuntime(aiRow);

  for (const row of list) {
    if (row.service === 'lottery_premium' && !row.result_payload) {
      const { main, stars } = drawLotteryNumbers();
      let extraText: string | null = null;
      if (runtime) {
        const sys = `És um assistente de lotaria só para entretenimento no perfil "${siteName}". Responde em português em 2 frases, sem garantir prémios.`;
        const user = `Números sugeridos (simbólicos): principais ${main.join(', ')}; estrela(s) ${stars.join(', ')}. Breve mensagem motivacional.`;
        extraText = await openAiCompatibleChat({
          ...runtime,
          system: sys,
          user,
          max_tokens: 200,
          temperature: 0.5,
        });
      }
      const payload = { main, stars, generatedAt: new Date().toISOString() };
      await db
        .from('mystic_entitlements' as any)
        .update({
          result_payload: payload,
          result_text: extraText,
          uses_remaining: 0,
        })
        .eq('id', row.id);
      out.lottery = { main, stars, text: extraText };
    }

    if (row.service === 'tarot' && !row.result_text) {
      let text: string | null = null;
      if (runtime) {
        const system = `És um leitor de tarô para entretenimento no perfil "${siteName}". Responde em português. É simbólico; não alegues poderes reais. Tiragem curta (3 cartas com nomes), interpretação breve. Máx. ~350 palavras.`;
        text = await openAiCompatibleChat({
          ...runtime,
          system,
          user: 'Faz uma leitura geral para o visitante que acabou de pagar.',
          max_tokens: 700,
          temperature: 0.55,
        });
      }
      if (!text) {
        text =
          'Leitura temporariamente indisponível (IA não configurada). O teu pagamento foi registado; contacta o suporte da plataforma ou tenta mais tarde.';
      }
      await db
        .from('mystic_entitlements' as any)
        .update({
          result_text: text,
          uses_remaining: 0,
        })
        .eq('id', row.id);
      out.tarot = { text };
    }
  }

  return out;
}
