/**
 * Planos de subscrição (campo `subscriptions.plan`).
 * `pro_ia` = Pro + pack IA Studio (add-on em /planos; ver `PLATFORM_USD.proIaAddonMonthly`).
 * `studio` mantido por compatibilidade com pagamentos antigos.
 */
export function subscriptionHasIaStudioPack(plan: string | null | undefined): boolean {
  const p = String(plan || '').toLowerCase().trim();
  return p === 'pro_ia' || p === 'studio';
}

export function subscriptionPlanLabel(plan: string | null | undefined, t: (k: string) => string): string {
  if (subscriptionHasIaStudioPack(plan)) return t('sub_plan_pro_ia');
  return t('sub_plan_pro');
}
