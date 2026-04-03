import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function resolveRootDomain(): string {
  const raw = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (raw) return raw.replace(/^www\./i, '');
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://trustbank.xyz').hostname.replace(/^www\./i, '');
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

  const reserved = ['www', 'api', 'admin', 'mail', 'smtp', 'cdn', 'static'];
  if (reserved.includes(subdomain)) {
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
