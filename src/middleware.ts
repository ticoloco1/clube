import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  const rootDomain = 'trustbank.xyz';

  // Sempre passa reto em localhost e Vercel preview
  const isLocal = hostname.includes('localhost') || 
                  hostname.includes('127.0.0.1') ||
                  hostname.includes('.vercel.app');

  if (isLocal) {
    return NextResponse.next();
  }

  // Domínio principal — sem alteração
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`
  ) {
    return NextResponse.next();
  }

  // Verifica se é subdomínio real (ex: jessica.trustbank.xyz)
  if (!hostname.endsWith(`.${rootDomain}`)) {
    return NextResponse.next();
  }

  const subdomain = hostname.replace(`.${rootDomain}`, '');

  // Ignora subdomínios reservados
  const reserved = ['www', 'api', 'admin', 'mail', 'smtp', 'cdn', 'static'];
  if (reserved.includes(subdomain)) {
    return NextResponse.next();
  }

  // Só reescreve na raiz — mantém caminhos de API intactos
  if (url.pathname === '/') {
    return NextResponse.rewrite(new URL(`/s/${subdomain}`, request.url));
  }

  // Qualquer outra rota no subdomínio vai para o mini site com o pathname
  return NextResponse.rewrite(new URL(`/s/${subdomain}${url.pathname}`, request.url));
}

export const config = {
  matcher: [
    // Ignora _next, static, favicon e arquivos com extensão
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
