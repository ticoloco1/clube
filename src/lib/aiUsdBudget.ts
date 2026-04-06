import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Orçamento promocional por mini-site (USD). Default 0 — compra em /creditos.
 * Env: `IA_FREE_USD_PER_SITE`
 * Ex.: ~1000 turnos coach/copilot com custo médio ~US$0,04 → `IA_FREE_USD_PER_SITE=40` (ajusta com `IA_USD_COST_*`).
 */
export function iaFreeAllowanceUsd(): number {
  const v = parseFloat(process.env.IA_FREE_USD_PER_SITE || '0');
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * Top-up: face USD creditado no mini-site; cobrança Stripe = face × IA_TOPUP_PRICE_MULTIPLIER.
 * Mínimo configurável: env `IA_TOPUP_MIN_FACE_USD` (default 5).
 */
const _minFace = parseFloat(process.env.IA_TOPUP_MIN_FACE_USD || '5');
export const IA_TOPUP_MIN_FACE_USD =
  Number.isFinite(_minFace) && _minFace >= 1 ? _minFace : 5;
export const IA_TOPUP_PRICE_MULTIPLIER = 2;

export function iaTopupChargeUsd(faceUsd: number): number {
  return faceUsd * IA_TOPUP_PRICE_MULTIPLIER;
}

function parseUsdEnv(name: string, fallback: number): number {
  const v = parseFloat(process.env[name] || '');
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** Custos estimados por operação (USD) — ajustáveis por env. */
export const IA_USD = {
  chat: () => parseUsdEnv('IA_USD_COST_CHAT', 0.04),
  tts_eleven: () => parseUsdEnv('IA_USD_COST_TTS_ELEVEN', 0.06),
  tts_openai: () => parseUsdEnv('IA_USD_COST_TTS_OPENAI', 0.02),
  identity_greeting: () => parseUsdEnv('IA_USD_COST_GREETING', 0.05),
  identity_portrait: () => parseUsdEnv('IA_USD_COST_PORTRAIT', 0.35),
  voice_clone: () => parseUsdEnv('IA_USD_COST_VOICE_CLONE', 0.55),
  magic_boost_prepare: () => parseUsdEnv('IA_USD_COST_MAGIC_BOOST', 0.12),
  site_coach_turn: () => parseUsdEnv('IA_USD_COST_SITE_COACH', 0.035),
  genesis_pack: () => parseUsdEnv('IA_USD_COST_GENESIS', 0.1),
  site_copilot_task: () => parseUsdEnv('IA_USD_COST_COPILOT', 0.045),
  suggest_welcome: () => parseUsdEnv('IA_USD_COST_SUGGEST_WELCOME', 0.02),
} as const;

export type SiteAiBudgetRow = {
  ai_free_usd_remaining?: number | string | null;
  ai_paid_usd_balance?: number | string | null;
  ia_credits_balance?: number | string | null;
};

export function readSiteAiBudget(row: SiteAiBudgetRow | null | undefined): {
  freeUsd: number;
  paidUsd: number;
} {
  if (!row) return { freeUsd: iaFreeAllowanceUsd(), paidUsd: 0 };
  const rawF = row.ai_free_usd_remaining;
  const rawP = row.ai_paid_usd_balance;
  const free =
    rawF != null && rawF !== '' && Number.isFinite(Number(rawF)) ? Math.max(0, Number(rawF)) : iaFreeAllowanceUsd();
  const paid =
    rawP != null && rawP !== '' && Number.isFinite(Number(rawP)) ? Math.max(0, Number(rawP)) : 0;
  return { freeUsd: free, paidUsd: paid };
}

/**
 * Sem débito USD quando: visitante em trial 40 min, ou site em trial 24h sem plano pago (`exemptFromUsdBudget`).
 * Caso contrário: free USD primeiro, depois paid USD.
 */
export function evaluateIaAccessUsd(params: {
  /** true = não debitar (trial visitante 40m OU trial plataforma 24h sem sub paga) */
  exemptFromUsdBudget: boolean;
  freeUsd: number;
  paidUsd: number;
  costUsd: number;
}):
  | { ok: true; deductFreeUsd: number; deductPaidUsd: number }
  | { ok: false; code: 'IA_PAYWALL'; message: string; trialExpired?: boolean } {
  if (params.costUsd <= 0) {
    return { ok: true, deductFreeUsd: 0, deductPaidUsd: 0 };
  }

  if (params.exemptFromUsdBudget) {
    return { ok: true, deductFreeUsd: 0, deductPaidUsd: 0 };
  }

  const total = params.freeUsd + params.paidUsd;
  if (total + 1e-9 < params.costUsd) {
    return {
      ok: false,
      code: 'IA_PAYWALL',
      message:
        'AI budget exhausted. Add AI balance on the credits page (/creditos).',
      trialExpired: false,
    };
  }

  let need = params.costUsd;
  const takeFree = Math.min(params.freeUsd, need);
  need -= takeFree;
  const takePaid = Math.min(params.paidUsd, need);
  need -= takePaid;
  if (need > 1e-9) {
    return {
      ok: false,
      code: 'IA_PAYWALL',
      message:
        'Not enough AI budget. Top up on the credits page (/creditos).',
    };
  }

  return { ok: true, deductFreeUsd: takeFree, deductPaidUsd: takePaid };
}

/** Dono / rotas só-owner. `exemptFromUsdBudget` = trial 24h sem plano (sem débito). */
export function assertOwnerAiBudgetUsd(
  freeUsd: number,
  paidUsd: number,
  costUsd: number,
  exemptFromUsdBudget = false,
): { ok: true; deductFreeUsd: number; deductPaidUsd: number } | { ok: false; message: string } {
  const r = evaluateIaAccessUsd({ exemptFromUsdBudget, freeUsd, paidUsd, costUsd });
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true, deductFreeUsd: r.deductFreeUsd, deductPaidUsd: r.deductPaidUsd };
}

export async function applySiteAiBudgetDeduction(
  db: SupabaseClient,
  siteId: string,
  deductFreeUsd: number,
  deductPaidUsd: number,
): Promise<boolean> {
  if (deductFreeUsd <= 0 && deductPaidUsd <= 0) return true;

  const { data: row, error: fErr } = await db
    .from('mini_sites')
    .select('ai_free_usd_remaining, ai_paid_usd_balance')
    .eq('id', siteId)
    .maybeSingle();

  if (fErr || !row) return false;

  const curFree = Number((row as { ai_free_usd_remaining?: number }).ai_free_usd_remaining);
  const curPaid = Number((row as { ai_paid_usd_balance?: number }).ai_paid_usd_balance);
  const free0 = Number.isFinite(curFree) ? curFree : iaFreeAllowanceUsd();
  const paid0 = Number.isFinite(curPaid) ? curPaid : 0;

  const nf = free0 - deductFreeUsd;
  const np = paid0 - deductPaidUsd;
  if (nf < -1e-9 || np < -1e-9) return false;

  const { error } = await db
    .from('mini_sites')
    .update({
      ai_free_usd_remaining: Math.max(0, nf),
      ai_paid_usd_balance: Math.max(0, np),
    })
    .eq('id', siteId);

  return !error;
}
