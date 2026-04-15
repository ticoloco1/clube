/**
 * Imagem do agente flutuante: prioridade à foto de perfil do mini-site;
 * se não houver, usa o retrato gerado no Identity Lab.
 */
export function normalizePublicMediaUrl(raw?: string | null): string | null {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return null;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (v.startsWith('/storage/v1/') && supabaseUrl) return `${supabaseUrl}${v}`;
  if ((v.startsWith('profile-photos/') || v.startsWith('mini-site-media/')) && supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${v}`;
  }
  return v;
}

export function resolveFloatingAgentImageUrl(params: {
  avatarUrl?: string | null;
  identityPortraitUrl?: string | null;
}): string | null {
  const a = normalizePublicMediaUrl(params.avatarUrl) || '';
  const p = normalizePublicMediaUrl(params.identityPortraitUrl) || '';
  if (a) return a;
  if (p) return p;
  return null;
}

/**
 * Mini-site público: com «retrato mágico» desligado, não usar o retrato gerado por IA
 * como cara principal — só a foto de perfil normal.
 */
export function resolvePublicSiteFaceUrl(params: {
  avatarUrl?: string | null;
  identityPortraitUrl?: string | null;
  magicPortraitEnabled: boolean;
}): string | null {
  const a = normalizePublicMediaUrl(params.avatarUrl) || '';
  const p = normalizePublicMediaUrl(params.identityPortraitUrl) || '';
  if (params.magicPortraitEnabled) {
    if (a) return a;
    if (p) return p;
    return null;
  }
  // Retrato mágico desligado: nunca mostrar o retrato IA como cara pública — nem via identity_portrait_url
  // nem quando foi copiado para avatar_url («Usar como foto de perfil» no Identity Lab).
  if (a && p && a === p) return null;
  if (a) return a;
  return null;
}
