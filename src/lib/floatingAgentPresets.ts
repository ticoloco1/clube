/** Presets do agente flutuante. Premium exige NFT (contrato em LIVELY_PREMIUM_AVATAR_NFT_CONTRACT). */

export const FLOATING_PRESETS: {
  id: string;
  labelKey: 'lively_preset_classic' | 'lively_preset_monkey' | 'lively_preset_shark' | 'lively_preset_pet' | 'lively_preset_alien';
  premium: boolean;
  image: string | null;
}[] = [
  { id: 'classic', labelKey: 'lively_preset_classic', premium: false, image: null },
  {
    id: 'monkey_trader',
    labelKey: 'lively_preset_monkey',
    premium: true,
    image: '/avatars/monkey-trader.png',
  },
  {
    id: 'shark_lawyer',
    labelKey: 'lively_preset_shark',
    premium: true,
    image: '/avatars/shark-lawyer.png',
  },
  { id: 'pet_influencer', labelKey: 'lively_preset_pet', premium: true, image: null },
  {
    id: 'alien_tech',
    labelKey: 'lively_preset_alien',
    premium: true,
    image: '/avatars/alien-tech.png',
  },
];

export type FloatingPresetId = (typeof FLOATING_PRESETS)[number]['id'];

export function isPremiumFloatingPreset(id: string | null | undefined): boolean {
  const p = FLOATING_PRESETS.find((x) => x.id === id);
  return !!p?.premium;
}

export function resolveFloatingPresetImage(id: string | null | undefined): string | null {
  const p = FLOATING_PRESETS.find((x) => x.id === id);
  return p?.image ?? null;
}

export function effectiveFloatingPreset(
  requested: string | null | undefined,
  opts: { premiumNftVerified: boolean; openBeta: boolean; isOwner: boolean },
): FloatingPresetId {
  const raw = requested || 'classic';
  const p = FLOATING_PRESETS.find((x) => x.id === raw);
  const id = (p?.id || 'classic') as FloatingPresetId;
  if (!isPremiumFloatingPreset(id)) return id;
  if (opts.isOwner || opts.openBeta || opts.premiumNftVerified) return id;
  return 'classic';
}
