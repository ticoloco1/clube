import { resolveFloatingPresetImage } from '@/lib/floatingAgentPresets';

/** Imagem a mostrar no círculo do perfil quando o modo “mágico” Lively está ativo. */
export function resolveLivelyProfileImageUrl(params: {
  livelyCentralMagic: boolean;
  livelyAvatarEnabled: boolean;
  identityPortraitUrl: string | null | undefined;
  floatingPresetId: string;
}): string | null {
  if (!params.livelyAvatarEnabled || !params.livelyCentralMagic) return null;
  const id = typeof params.identityPortraitUrl === 'string' ? params.identityPortraitUrl.trim() : '';
  if (id) return id;
  return resolveFloatingPresetImage(params.floatingPresetId);
}

/** Olhos “cartoon” por cima só fazem sentido nos presets com PNG; retrato InstantID é realista. */
export function livelyProfileUsesPupilOverlay(
  identityPortraitUrl: string | null | undefined,
  floatingPresetId: string,
): boolean {
  const id = typeof identityPortraitUrl === 'string' ? identityPortraitUrl.trim() : '';
  if (id) return false;
  return resolveFloatingPresetImage(floatingPresetId) != null;
}
