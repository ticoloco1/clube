import { resolvePublicSiteFaceUrl } from '@/lib/floatingAgentImage';

/** Imagem no círculo do perfil quando o modo “mágico” Lively está ativo (foto de perfil ou retrato). */
export function resolveLivelyProfileImageUrl(params: {
  livelyCentralMagic: boolean;
  livelyAvatarEnabled: boolean;
  magicPortraitEnabled: boolean;
  identityPortraitUrl: string | null | undefined;
  avatarUrl: string | null | undefined;
}): string | null {
  if (!params.livelyAvatarEnabled || !params.livelyCentralMagic || !params.magicPortraitEnabled) return null;
  return resolvePublicSiteFaceUrl({
    avatarUrl: params.avatarUrl,
    identityPortraitUrl: params.identityPortraitUrl,
    magicPortraitEnabled: true,
  });
}

/** Olhos cartoon por cima da foto real — desativado (só imagem do utilizador). */
export function livelyProfileUsesPupilOverlay(
  _identityPortraitUrl: string | null | undefined,
  _avatarUrl: string | null | undefined,
): boolean {
  return false;
}
