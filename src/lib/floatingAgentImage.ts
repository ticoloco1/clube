/**
 * Imagem do agente flutuante: prioridade à foto de perfil do mini-site;
 * se não houver, usa o retrato gerado no Identity Lab.
 */
export function resolveFloatingAgentImageUrl(params: {
  avatarUrl?: string | null;
  identityPortraitUrl?: string | null;
}): string | null {
  const a = typeof params.avatarUrl === 'string' ? params.avatarUrl.trim() : '';
  const p = typeof params.identityPortraitUrl === 'string' ? params.identityPortraitUrl.trim() : '';
  if (a) return a;
  if (p) return p;
  return null;
}
