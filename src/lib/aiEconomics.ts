/**
 * Modelo económico IA (DeepSeek / compatível OpenAI):
 * - Custo por operação: `IA_USD` em `aiUsdBudget.ts` (env por tipo).
 * - Recarga: valor útil (face USD) no saldo pago; cobrança = face × `IA_TOPUP_PRICE_MULTIPLIER` (100% margem).
 * - Oferta “~1000 interações”: definir `IA_FREE_USD_PER_SITE` ≈ 1000 × custo médio por turno (coach/copilot).
 */
import { IA_USD, iaFreeAllowanceUsd, iaTopupChargeUsd, IA_TOPUP_PRICE_MULTIPLIER } from '@/lib/aiUsdBudget';

/** Custo médio por “turno” de construção (coach + copilot) — conservador para estimativas na UI. */
export function blendedCoachCopilotCostUsd(): number {
  return (IA_USD.site_coach_turn() + IA_USD.site_copilot_task()) / 2;
}

/** Quantos turnos coach/copilot o saldo atual cobre (aprox., ordem de grandeza). */
export function estimatedCoachCopilotTurnsRemaining(freeUsd: number, paidUsd: number): number {
  const c = blendedCoachCopilotCostUsd();
  if (c <= 0) return 0;
  return Math.max(0, Math.floor((freeUsd + paidUsd) / c + 1e-9));
}

/** Face USD necessário no saldo para ~n interações (sem margem). */
export function usdFaceValueForInteractions(n: number): number {
  const c = blendedCoachCopilotCostUsd();
  if (n <= 0 || c <= 0) return 0;
  return Math.ceil(n * c * 100) / 100;
}

/** Quanto o utilizador paga em retail (Stripe) para obter essa face USD (com multiplicador da plataforma). */
export function retailUsdForFaceUsd(face: number): number {
  return iaTopupChargeUsd(face);
}

/** Quanto pagar em retail para ~n interações coach/copilot. */
export function retailUsdForInteractionCount(n: number): number {
  return retailUsdForFaceUsd(usdFaceValueForInteractions(n));
}

export function aiTopupMarginMultiplier(): number {
  return IA_TOPUP_PRICE_MULTIPLIER;
}

/** Resumo da oferta gratuita por mini-site (env `IA_FREE_USD_PER_SITE`). */
export function freeTierSiteAllowanceSummary(): {
  allowanceUsd: number;
  estimatedTurns: number;
  costPerTurnUsd: number;
} {
  const allowanceUsd = iaFreeAllowanceUsd();
  const costPerTurnUsd = blendedCoachCopilotCostUsd();
  const estimatedTurns =
    costPerTurnUsd > 0 ? Math.max(0, Math.floor(allowanceUsd / costPerTurnUsd)) : 0;
  return { allowanceUsd, estimatedTurns, costPerTurnUsd };
}
