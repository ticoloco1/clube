/**
 * Avisos a motores de busca após publicar/atualizar um mini-site.
 * - Google / Bing: ping do sitemap do subdomínio (complemento ao Search Console / Bing Webmaster).
 * - IndexNow: Bing, Yandex, Naver, Seznam, etc. (requer INDEXNOW_KEY + ficheiro na raiz do site).
 */

import { getSiteBaseUrl, miniSiteCanonicalUrl } from '@/lib/siteBaseUrl';

export type PingResult = { google: boolean; bing: boolean; indexNow: boolean };

function withTimeout(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function safeFetch(url: string, init?: RequestInit): Promise<boolean> {
  return fetch(url, { ...init, signal: withTimeout(8000) })
    .then((r) => r.ok)
    .catch(() => false);
}

/** Ping clássico do sitemap (Google ainda aceita em muitos casos; Bing documentado). */
export async function pingSitemapUrls(sitemapUrl: string): Promise<{ google: boolean; bing: boolean }> {
  const enc = encodeURIComponent(sitemapUrl);
  const [google, bing] = await Promise.all([
    safeFetch(`https://www.google.com/ping?sitemap=${enc}`),
    safeFetch(`https://www.bing.com/ping?sitemap=${enc}`),
  ]);
  return { google, bing };
}

/**
 * IndexNow: coloca em `public/` um ficheiro `{INDEXNOW_KEY}.txt` cujo conteúdo é exatamente a mesma chave.
 * keyLocation = `${getSiteBaseUrl()}/${INDEXNOW_KEY}.txt`
 */
export async function indexNowSubmitUrls(urls: string[]): Promise<boolean> {
  const key = (process.env.INDEXNOW_KEY || '').trim();
  if (!key || urls.length === 0) return false;

  let host: string;
  try {
    host = new URL(urls[0]).hostname;
  } catch {
    return false;
  }
  const keyLocation = `${getSiteBaseUrl()}/${key}.txt`;

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList: urls.slice(0, 10000),
    }),
    signal: withTimeout(10000),
  }).catch(() => null);

  return !!res?.ok;
}

/** Pings + IndexNow para um slug publicado. */
export async function notifySearchEnginesForMiniSiteSlug(slug: string): Promise<PingResult> {
  const canonical = miniSiteCanonicalUrl(slug);
  const sitemapUrl = `${canonical.replace(/\/+$/, '')}/sitemap.xml`;
  const { google, bing } = await pingSitemapUrls(sitemapUrl);
  const indexNow = await indexNowSubmitUrls([`${canonical.replace(/\/+$/, '')}/`]);
  return { google, bing, indexNow };
}
