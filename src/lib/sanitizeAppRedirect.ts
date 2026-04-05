/**
 * Evita open-redirect: só caminhos relativos internos.
 * Default /editor para não mandar utilizadores para "/" sem querer após login.
 */
export function sanitizeAppRedirect(raw: string | null | undefined, defaultPath = '/editor'): string {
  if (raw == null || typeof raw !== 'string') return defaultPath;
  const t = decodeURIComponent(raw).trim();
  if (!t.startsWith('/') || t.startsWith('//')) return defaultPath;
  if (/^\/\//.test(t) || /[\r\n\0]/.test(t)) return defaultPath;
  if (/^https?:\/\//i.test(t)) return defaultPath;
  return t.length ? t : defaultPath;
}
