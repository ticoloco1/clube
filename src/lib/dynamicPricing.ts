/**
 * Bolsa de preços (heurística): visitas + seguidores + nicho.
 * A IA (opcional) pode refinar estes valores; esta função é determinística e barata.
 */

export type PricingInputs = {
  followers: number;
  visitsLast30d: number;
  directoryProfileSlug?: string | null;
  siteCategorySlug?: string | null;
  isVerified?: boolean;
};

/** Multiplicadores por tipo de perfil (ajustáveis via Admin JSON no futuro) */
const PROFILE_MULT: Record<string, number> = {
  creator: 1.0,
  influencer: 1.35,
  actor: 1.6,
  actress: 1.6,
  athlete: 1.45,
  entrepreneur: 1.25,
  automotive: 1.2,
  services: 0.95,
  other: 1.0,
};

const CATEGORY_MULT: Record<string, number> = {
  creator: 1.15,
  services: 0.9,
  tech: 1.2,
  business: 1.15,
  local: 0.85,
  other: 1.0,
};

function nicheMultiplier(combinedSlugText: string): number {
  let m = 1.0;
  if (/crypto|web3|defi|nft|bitcoin|solana|blockchain/i.test(combinedSlugText)) m *= 1.25;
  if (/music|música|famos|celebrity|star|actor|actress|atriz|ator|artist/i.test(combinedSlugText)) m *= 1.35;
  return m;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Retorna faixa sugerida US$/semana para patrocínio no feed/ticker.
 */
export function computeSuggestedWeeklyPriceRange(input: PricingInputs): {
  min: number;
  max: number;
  base: number;
  factors: Record<string, number>;
} {
  const f = Math.max(0, input.followers || 0);
  const v = Math.max(0, input.visitsLast30d || 0);

  // Base em US$: escala log para não explodir
  const followerPart = 40 * Math.log1p(f) / Math.log1p(100000);
  const visitPart = 25 * Math.log1p(v) / Math.log1p(50000);
  let base = 80 + followerPart * 120 + visitPart * 80;

  const pSlug = (input.directoryProfileSlug || '').toLowerCase();
  const cSlug = (input.siteCategorySlug || '').toLowerCase();
  const combined = `${pSlug} ${cSlug}`;

  let pMult = PROFILE_MULT[pSlug] ?? 1.0;
  let cMult = CATEGORY_MULT[cSlug] ?? 1.0;

  const nicheMult = nicheMultiplier(combined);

  if (input.isVerified) base *= 1.12;

  const totalMult = clamp(pMult * cMult * nicheMult, 0.5, 3.5);
  base *= totalMult;

  const min = clamp(Math.round(base * 0.75), 50, 500000);
  const max = clamp(Math.round(base * 1.35), min + 10, 500000);

  return {
    min,
    max,
    base: Math.round(base),
    factors: {
      profile: pMult,
      category: cMult,
      niche: nicheMult,
      verified: input.isVerified ? 1.12 : 1,
    },
  };
}
