/**
 * Planos de subscrição (campo `subscriptions.plan`).
 * Checkout actual: só `pro`. `pro_ia` / `studio` = legado (subs antigas; ainda podem receber bónus IA se configurado).
 */
export function subscriptionHasIaStudioPack(plan: string | null | undefined): boolean {
  const p = String(plan || '').toLowerCase().trim();
  return p === 'pro_ia' || p === 'studio';
}

export function subscriptionPlanLabel(plan: string | null | undefined, t: (k: string) => string): string {
  if (subscriptionHasIaStudioPack(plan)) return t('sub_plan_pro_ia');
  return t('sub_plan_pro');
}
