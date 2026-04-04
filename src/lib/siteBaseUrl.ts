import { headers } from 'next/headers';

/** URL canónica do site (apex), sem barra final. */
export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://trustbank.xyz').replace(/\/+$/, '');
}

function stripTrailingSlash(u: string): string {
  return u.replace(/\/+$/, '');
}

/** Host de deploy Vercel (*.vercel.app) — não usar em sitemap/robots como domínio público. */
function isVercelDeployHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith('.vercel.app') || h === 'vercel.app';
}

/**
 * Base URL pública para sitemap, robots e metadados quando o pedido chega ao domínio real.
 * Evita listar `*.vercel.app` no XML se `NEXT_PUBLIC_SITE_URL` estiver errado em produção.
 */
export async function getCanonicalSiteBaseUrl(): Promise<string> {
  const envRaw = stripTrailingSlash((process.env.NEXT_PUBLIC_SITE_URL || '').trim());
  if (envRaw) {
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
