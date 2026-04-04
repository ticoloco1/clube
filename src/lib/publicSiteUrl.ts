/**
 * URL pública do site (https, sem barra final).
 * Aceita `trustbank.xyz`, `www.trustbank.xyz` ou `https://...` — necessário para `new URL()` e OAuth.
 */
export function normalizePublicSiteUrl(raw?: string | null): string {
  let t = (raw ?? '').trim();
  if (!t) return 'https://trustbank.xyz';
  t = t.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(t)) {
    t = `https://${t.replace(/^\/+/, '')}`;
  }
  return t.replace(/\/+$/, '');
}
