export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSeoUrlInventory } from '@/lib/seoUrlInventory';

/**
 * GET /api/seo/inventory
 * - ?format=json (default) — inventário completo (metadados + lista)
 * - ?format=txt — uma URL por linha
 * - ?format=csv — url,category,lastModified,priority,changeFrequency
 *
 * Opcional na Vercel: SEO_INVENTORY_SECRET — quando definido, obrigatório ?key=SEGREDO
 * (ou cabeçalho `x-seo-inventory-key`).
 */
function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function checkKey(req: Request): boolean {
  const secret = (process.env.SEO_INVENTORY_SECRET || '').trim();
  if (!secret) return true;
  const u = new URL(req.url);
  const key = u.searchParams.get('key') || req.headers.get('x-seo-inventory-key');
  return key === secret;
}

export async function GET(req: Request) {
  if (!checkKey(req)) return unauthorized();

  try {
    const inv = await getSeoUrlInventory();
    const format = new URL(req.url).searchParams.get('format') || 'json';

    if (format === 'txt') {
      const body = inv.urls.map((r) => r.url).join('\n') + '\n';
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    if (format === 'csv') {
      const lines = ['url,category,lastModified,priority,changeFrequency'];
      for (const r of inv.urls) {
        lines.push(
          `"${r.url.replace(/"/g, '""')}",${r.category},${r.lastModified || ''},${r.priority},${r.changeFrequency}`,
        );
      }
      return new NextResponse(lines.join('\n') + '\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    return NextResponse.json(inv, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (e) {
    console.error('[seo/inventory GET]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
