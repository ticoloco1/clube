import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizePublicSiteUrl } from '@/lib/publicSiteUrl';

/**
 * Apex usado para reconhecer `slug.apex` no middleware.
 * - Defina `NEXT_PUBLIC_ROOT_DOMAIN` na Vercel se o site principal for outro host.
 * - `NEXT_PUBLIC_SITE_URL` = URL canónica (ex. https://www.trustbank.xyz); `NEXT_PUBLIC_SITE_URL_ALT` = outra (ex. https://trustbank.xyz), opcional.
 * - Se `NEXT_PUBLIC_SITE_URL` for só `*.vercel.app` (preview), não use isso como apex —
 *   senão `foo.trustbank.xyz` deixa de bater em `.vercel.app` e o rewrite não corre.
 */
function resolveRootDomain(): string {
  const raw = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (raw) return raw.replace(/^www\./i, '');
  try {
    const host = new URL(normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)).hostname.replace(/^www\./i, '');
    if (host.endsWith('.vercel.app')) return 'trustbank.xyz';
    return host;
  } catch {
    return 'trustbank.xyz';
  }
}

/** Resposta com cabeçalho para não indexar (preview / URL legada em /s/). */
function withNoIndex(res: NextResponse): NextResponse {
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  if (url.pathname === '/jackpot' || url.pathname.startsWith('/jackpot/')) {
    const home = url.clone();
    home.pathname = '/';
    home.search = '';
    return NextResponse.redirect(home);
  }

  const hostname = (request.headers.get('host') || '').split(':')[0].toLowerCase();

  const rootDomain = resolveRootDomain();

  const isLocal =
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('.vercel.app');

  if (isLocal) {
    return NextResponse.next();
  }

  const isApex = hostname === rootDomain || hostname === `www.${rootDomain}`;

  // ── Domínio principal: rotas /s/[slug] são só caminho interno / preview — não competir com slug.dominio no Google
  if (isApex) {
    // Não redirecionar www ↔ apex aqui: Cloudflare/Vercel costuma já forçar um lado; um 301 na app
    // noutro sentido cria loop infinito (ex. CF 307 apex→www + app 301 www→apex).
    if (url.pathname.startsWith('/s/')) {
      return withNoIndex(NextResponse.next());
    }
    return NextResponse.next();
  }

  // ── Fora do nosso wildcard (*.rootDomain) — não mexer
  if (!hostname.endsWith(`.${rootDomain}`)) {
    return NextResponse.next();
  }

  const subdomain = hostname.slice(0, -(`.${rootDomain}`).length);

  // `editor`: evita que `editor.dominio/...` seja tratado como mini-site com slug "editor" (quebrava a rota `/editor`).
  const reserved = ['www', 'api', 'admin', 'mail', 'smtp', 'cdn', 'static', 'editor'];
  if (reserved.includes(subdomain)) {
    return NextResponse.next();
  }

  // Rotas da app (não são páginas do mini-site). Sem isto, `slug.dominio/api/video-token` virava
  // rewrite para `/s/slug/api/...` → 404/HTML e o player mostrava "error loading video".
  const path = url.pathname;
  if (
    path.startsWith('/api/') ||
    path.startsWith('/auth') ||
    path.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }

  // ── Mini-site público: slug.rootDomain → rewrite para /s/[slug] (URL real no browser continua o subdomínio)
  const managePreview = url.searchParams.get('manage') === '1';

  const rewriteTo = (path: string) => {
    const res = NextResponse.rewrite(new URL(path, request.url));
    if (managePreview) {
      return withNoIndex(res);
    }
    return res;
  };

  if (url.pathname === '/') {
    return rewriteTo(`/s/${subdomain}`);
  }

  return rewriteTo(`/s/${subdomain}${url.pathname}`);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
