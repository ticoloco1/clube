/**
 * Presets PNG de animais foram removidos — o agente usa a foto de perfil / retrato.
 * Mantemos `classic` só para compatibilidade com coluna `lively_floating_preset` na BD.
 */
export type FloatingPresetId = 'classic';

export function isPremiumFloatingPreset(_id: string | null | undefined): boolean {
  return false;
}

/** @deprecated Sem presets visuais; devolve sempre classic. */
export function resolveFloatingPresetImage(_id: string | null | undefined): string | null {
  return null;
}

export function effectiveFloatingPreset(
  _requested: string | null | undefined,
  _opts: { premiumNftVerified: boolean; openBeta: boolean; isOwner: boolean },
): FloatingPresetId {
  return 'classic';
}
