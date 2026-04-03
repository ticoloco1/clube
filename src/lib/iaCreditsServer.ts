import type { SupabaseClient } from '@supabase/supabase-js';

const TRIAL_MS = 40 * 60 * 1000;

export function parseCreditCost(envName: string, fallback: number): number {
  const v = process.env[envName];
  if (v == null || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const IA_CHAT_COST = () => parseCreditCost('IA_CREDIT_CHAT_COST', 0.25);
export const IA_TTS_ELEVEN_COST = () => parseCreditCost('IA_CREDIT_TTS_ELEVEN_COST', 0.4);
export const IA_TTS_OPENAI_COST = () => parseCreditCost('IA_CREDIT_TTS_OPENAI_COST', 0.1);
export const IA_IDENTITY_IMAGE_COST = () => parseCreditCost('IA_CREDIT_IDENTITY_IMAGE', 2.5);
export const IA_VOICE_CLONE_COST = () => parseCreditCost('IA_CREDIT_VOICE_CLONE', 5);
/** Saudação IA (texto DeepSeek + TTS ElevenLabs com clone). */
export const IA_IDENTITY_GREETING_COST = () => parseCreditCost('IA_CREDIT_IDENTITY_GREETING', 0.65);
/** Preparar áudio do boost patrocinado (polir + TTS + cache) — debita o criador. */
export const IA_MAGIC_BOOST_PREPARE_COST = () => parseCreditCost('IA_CREDIT_MAGIC_BOOST_PREPARE', 1.2);

/** Operações caras no Laboratório de Identidade: sempre debita saldo (inclui dono). */
export function assertOwnerCreditsForIdentity(
  credits: number,
  cost: number,
): { ok: true; deduct: number } | { ok: false; message: string } {
  if (cost <= 0) return { ok: true, deduct: 0 };
  if (credits >= cost) return { ok: true, deduct: cost };
  return { ok: false, message: 'Créditos insuficientes para esta operação.' };
}

export function trialActive(trialStartedAt: string | null | undefined): boolean {
  if (!trialStartedAt) return false;
  const t = new Date(trialStartedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < TRIAL_MS;
}

export function trialEndsAtIso(trialStartedAt: string | null | undefined): string | null {
  if (!trialStartedAt) return null;
  const t = new Date(trialStartedAt).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + TRIAL_MS).toISOString();
}

export type IaAccessResult =
  | { ok: true; trialActive: boolean; deductCredits: number }
  | { ok: false; code: 'IA_PAYWALL'; message: string; trialExpired: boolean };

/**
 * Visitantes: trial 40 min desde a 1.ª mensagem (não-dono) ou créditos.
 * Dono: sem bloqueio de créditos (preview).
 */
export function evaluateIaAccess(params: {
  isOwner: boolean;
  trialStartedAt: string | null | undefined;
  credits: number;
  cost: number;
}): IaAccessResult {
  if (params.isOwner) {
    return { ok: true, trialActive: true, deductCredits: 0 };
  }

  const trialing = trialActive(params.trialStartedAt);

  if (trialing) {
    return { ok: true, trialActive: true, deductCredits: 0 };
  }

  if (params.credits >= params.cost) {
    return { ok: true, trialActive: false, deductCredits: params.cost };
  }

  return {
    ok: false,
    code: 'IA_PAYWALL',
    message:
      'Trial de 40 minutos terminado. Adquire NFT + créditos de IA para manter o assistente ativo.',
    trialExpired: !!params.trialStartedAt,
  };
}

export async function startVisitorTrialIfNeeded(
  db: SupabaseClient,
  siteId: string,
  isOwner: boolean,
  currentTrialStarted: string | null | undefined,
): Promise<string | null> {
  if (isOwner || currentTrialStarted) return currentTrialStarted || null;
  const now = new Date().toISOString();
  const { error } = await db
    .from('mini_sites')
    .update({ lively_trial_started_at: now })
    .eq('id', siteId)
    .is('lively_trial_started_at', null);
  if (error) {
    console.error('[startVisitorTrialIfNeeded]', error);
    return currentTrialStarted || null;
  }
  return now;
}

export async function deductIaCredits(
  db: SupabaseClient,
  siteId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return true;
  const { data: row, error: fetchErr } = await db
    .from('mini_sites')
    .select('ia_credits_balance')
    .eq('id', siteId)
    .maybeSingle();
  if (fetchErr || !row) return false;
  const cur = Number((row as { ia_credits_balance?: number }).ia_credits_balance) || 0;
  if (cur < amount) return false;
  const { error } = await db
    .from('mini_sites')
    .update({ ia_credits_balance: cur - amount })
    .eq('id', siteId);
  return !error;
}
