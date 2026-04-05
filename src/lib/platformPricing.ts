/**
 * Preços em USD — site e checkout alinhados aos EUA (Stripe `currency: 'usd'`).
 * Pro base = `proMonthly`; Pro + IA = proMonthly + proIaAddonMonthly (checkout `pro_ia`).
 * Alinhar `platform_plans` no Supabase com `supabase-plan-pro-pricing.sql`.
 */
export const PLATFORM_USD = {
  /** Pro base (sem IA Studio) — alinhar `supabase-plan-pro-pricing.sql` na BD. */
  proMonthly: 26.9,
  /** Anual base (~10× mensal, mesma lógica que antes com 398.99/39.9). */
  proYearly: 269.9,
  /** Add-on IA Studio: Pro + IA = 39,90/mês (26,90 + 13). */
  proIaAddonMonthly: 13,
  /** Add-on IA anual (~10× mensal). */
  proIaAddonYearly: 130,
  /** % do paywall de vídeo para o criador (marketing / hero / stats). */
  paywallVideoCreatorPercent: 85,
  /** Sugestão inicial no editor; o criador define o preço do CV. */
  cvUnlockDefault: 20,
  /** Preço sugerido por vídeo com paywall (ativar paywall não tem taxa da plataforma). */
  videoPaywallDefault: 6.99,
  mysticTarotDefault: 6.99,
  mysticLotteryPremiumDefault: 3.99,
  /**
   * Boost no diretório: cada unidade do slider = `boostUsdPerSliderUnit` USD e soma `boostPositionsPerSliderUnit` posições.
   * Ex.: $0,50 → +2 posições; slider máx × 0,5 = até $1000.
   */
  boostUsdPerSliderUnit: 0.5,
  boostPositionsPerSliderUnit: 2,
  boostSliderMax: 2000,
  boostHighlightDays: 7,
  boostDropPositionsAfterHighlight: 150,
  /** A partir do dia 8, opcional: US$/dia para manter destaque nas primeiras posições (comunicar na UI; checkout dedicado pode vir depois). */
  boostTopExtensionUsdPerDay: 50,
  cvDirectoryMonthly: 199,
  cvDirectoryYearly: 1990,
  cvDirectoryExtraCv: 10,
  classifiedListingMonthly: 1.49,
  feedPinPost: 10,
  slugRenewal: 7,
} as const;

export const STRIPE_MIN_CHARGE_USD = 0.5;

/** Compat: cálculo de posições a partir do valor pago (USD). */
export function boostPositionsFromAmountUsd(amountUsd: number): number {
  const u = PLATFORM_USD.boostUsdPerSliderUnit;
  const p = PLATFORM_USD.boostPositionsPerSliderUnit;
  return Math.max(p, Math.floor(amountUsd / u) * p);
}
