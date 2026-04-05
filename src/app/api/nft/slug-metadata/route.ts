import { NextRequest, NextResponse } from 'next/server';
import { getProductRootDomain, getSiteBaseUrl } from '@/lib/siteBaseUrl';

export const dynamic = 'force-dynamic';

/**
 * Metadados ERC721 para marketplaces (OpenSea, etc.).
 * URI usada no mint: /api/nft/slug-metadata?slug=…
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || '';
  if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 });
  }

  const root = getProductRootDomain();
  const base = getSiteBaseUrl().replace(/\/$/, '');
  const miniSiteUrl = `https://${slug}.${root}`;
  const name = `TrustBank Slug · ${slug}`;
  const description = `Certificado on-chain do slug ${slug}.${root} na TrustBank. Podes revender este NFT em marketplaces compatíveis com Polygon. Mini-site: ${miniSiteUrl}`;

  const body = {
    name,
    description,
    image: `${base}/favicon.ico`,
    external_url: miniSiteUrl,
    attributes: [
      { trait_type: 'Slug', value: slug },
      { trait_type: 'Chain', value: 'Polygon' },
      { trait_type: 'Product', value: 'TrustBank' },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
