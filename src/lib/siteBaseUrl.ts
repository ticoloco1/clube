import { headers } from 'next/headers';
import { normalizePublicSiteUrl, parseAlternatePublicSiteUrls } from '@/lib/publicSiteUrl';

export { normalizePublicSiteUrl, parseAlternatePublicSiteUrls } from '@/lib/publicSiteUrl';

/** URL canónica do site (apex), sem barra final. */
export function getSiteBaseUrl(): string {
  return normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

/**
 * Host do site principal (apex ou www), mesmo produto que `getProductRootDomain()`.
 * Usado para sitemap/robots: qualquer um dos dois resolve para `getSiteBaseUrl()` (canónico).
 */
export function isMainPublicSiteHostname(host: string): boolean {
  const h = (host || '').toLowerCase().split(':')[0];
  if (!h) return false;

  const root = getProductRootDomain();
  if (h === root || h === `www.${root}`) return true;

  const candidates = [getSiteBaseUrl(), ...parseAlternatePublicSiteUrls()];
  for (const url of candidates) {
    try {
      if (new URL(url).hostname.toLowerCase() === h) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** Host de deploy Vercel (*.vercel.app) — não usar em sitemap/robots como domínio público. */
function isVercelDeployHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith('.vercel.app') || h === 'vercel.app';
}

/**
 * Base URL pública para sitemap, robots e metadados quando o pedido chega ao domínio real.
 * Evita listar `*.vercel.app` no XML se `NEXT_PUBLIC_SITE_URL` estiver errado em produção.
 *
 * Ordem: `SITE_CANONICAL_URL` (só servidor, Vercel) → `NEXT_PUBLIC_SITE_URL` válido → cabeçalhos do pedido.
 *
 * `www` e apex (`trustbank.xyz`): tratados como o mesmo site; o XML usa sempre `getSiteBaseUrl()`.
 * Opcional na Vercel: `NEXT_PUBLIC_SITE_URL_ALT` com a outra origem (vírgula se várias).
 */
export async function getCanonicalSiteBaseUrl(): Promise<string> {
  const serverCanonical = normalizePublicSiteUrl(process.env.SITE_CANONICAL_URL || undefined);
  if (process.env.SITE_CANONICAL_URL?.trim()) {
    try {
      const host = new URL(serverCanonical).hostname;
      if (!isVercelDeployHost(host) && host !== 'localhost' && !host.startsWith('127.')) {
        return serverCanonical;
      }
    } catch {
      /* ignore */
    }
  }

  const envRaw = normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || undefined);
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    try {
      const host = new URL(envRaw).hostname;
      if (!isVercelDeployHost(host) && host !== 'localhost' && !host.startsWith('127.')) {
        return envRaw;
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const h = await headers();
    const host = (h.get('x-forwarded-host') || h.get('host') || '')
      .split(',')[0]
      .trim()
      .split(':')[0]
      .toLowerCase();
    if (host && host !== 'localhost' && !host.startsWith('127.') && !isVercelDeployHost(host)) {
      if (isMainPublicSiteHostname(host)) {
        return getSiteBaseUrl();
      }
      const proto = (h.get('x-forwarded-proto') || 'https').split(',')[0].trim() || 'https';
      return `${proto}://${host}`;
    }
  } catch {
    /* headers() indisponível */
  }

  return envRaw || 'https://trustbank.xyz';
}

/** Hostname raiz (ex.: trustbank.xyz) a partir de uma base já canónica. */
export function getRootHostnameFromBase(canonicalBase: string): string {
  try {
    return new URL(canonicalBase).hostname.replace(/^www\./i, '');
  } catch {
    return 'trustbank.xyz';
  }
}

/**
 * Domínio para subdomínios `{slug}.dominio` (igual à lógica do middleware).
 * Não confiar só em `NEXT_PUBLIC_SITE_URL` se estiver em `*.vercel.app`.
 */
export function getProductRootDomain(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().replace(/^www\./i, '');
  if (fromEnv) return fromEnv.toLowerCase();
  try {
    const host = new URL(getSiteBaseUrl()).hostname.replace(/^www\./i, '');
    if (host.endsWith('.vercel.app')) return 'trustbank.xyz';
    return host;
  } catch {
    return 'trustbank.xyz';
  }
}

/** @deprecated Preferir `getProductRootDomain()` — mantido para chamadas antigas. */
export function getRootHostname(): string {
  return getProductRootDomain();
}

/** URL pública do mini-site em subdomínio (canónica para SEO). */
export function miniSiteCanonicalUrl(slug: string): string {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  if (!s) return getSiteBaseUrl();
  return `https://${s}.${getProductRootDomain()}`;
}

/** Mini-site em subdomínio; `rootHostname` sem subdomínio (ex.: trustbank.xyz). */
export function miniSiteUrlOnRoot(slug: string, rootHostname: string): string | null {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  if (!s) return null;
  const root = rootHostname.replace(/^www\./i, '');
  return `https://${s}.${root}`;
}
