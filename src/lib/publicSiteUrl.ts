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

/**
 * URLs alternativas do mesmo site (ex.: apex se o canónico for `www`).
 * Vercel: `NEXT_PUBLIC_SITE_URL_ALT` — uma URL ou várias separadas por vírgula.
 */
export function parseAlternatePublicSiteUrls(): string[] {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL_ALT || '').trim();
  if (!raw) return [];
  return raw
    .split(/[,|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizePublicSiteUrl(s));
}
