/** URL canónica do site (apex), sem barra final. */
export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://trustbank.xyz').replace(/\/+$/, '');
}

/** Hostname raiz do produto (ex.: trustbank.xyz), sem www. */
export function getRootHostname(): string {
  try {
    return new URL(getSiteBaseUrl()).hostname.replace(/^www\./i, '');
  } catch {
    return 'trustbank.xyz';
  }
}

/** URL pública do mini-site em subdomínio (canónica para SEO). */
export function miniSiteCanonicalUrl(slug: string): string {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  if (!s) return getSiteBaseUrl();
  return `https://${s}.${getRootHostname()}`;
}
