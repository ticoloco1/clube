/**
 * Listagem do mercado de slugs via REST PostgREST cru (sem supabase-js .from),
 * para contornar erros de schema cache do tipo
 * "Could not find a relationship between 'slug_registrations' and 'mini_sites'".
 * Usar só no servidor com service role.
 */

const SELECT_COLS = 'id,user_id,slug,status,expires_at,for_sale,sale_price,created_at';

function restHeaders(serviceKey: string, preferCount?: boolean): Record<string, string> {
  const h: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  if (preferCount) h.Prefer = 'count=exact';
  return h;
}

function filterNonAuctionRows(rows: Record<string, unknown>[]) {
  return rows.filter((r) => String(r.status ?? '') !== 'auction');
}

export async function fetchSlugMarketRowsRest(
  baseUrl: string,
  serviceKey: string,
  offset: number,
  limit: number,
  ownerUserId?: string | null,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  const root = baseUrl.replace(/\/$/, '');
  const buildUrl = (withOr: boolean, fetchLimit: number, fetchOffset: number) => {
    const u = new URL(`${root}/rest/v1/slug_registrations`);
    u.searchParams.set('select', SELECT_COLS);
    u.searchParams.set('for_sale', 'eq.true');
    u.searchParams.set('sale_price', 'gt.0');
    if (ownerUserId) u.searchParams.set('user_id', `eq.${ownerUserId}`);
    if (withOr) u.searchParams.set('or', '(status.is.null,status.not.eq.auction)');
    u.searchParams.set('order', 'sale_price.asc');
    u.searchParams.set('offset', String(Math.max(0, fetchOffset)));
    u.searchParams.set('limit', String(Math.min(500, Math.max(1, fetchLimit))));
    return u.toString();
  };

  const parseErr = (text: string, status: string) => {
    let msg = text || status;
    try {
      const j = JSON.parse(text) as { message?: string; error?: string; hint?: string };
      msg = j.message || j.error || j.hint || msg;
    } catch {
      /* ignore */
    }
    return msg;
  };

  try {
    const res1 = await fetch(buildUrl(true, limit, offset), {
      headers: restHeaders(serviceKey),
      cache: 'no-store',
    });
    const text1 = await res1.text();
    if (res1.ok) {
      const data = JSON.parse(text1) as Record<string, unknown>[];
      return { rows: Array.isArray(data) ? data : [], error: null };
    }

    const res2 = await fetch(buildUrl(false, 500, 0), {
      headers: restHeaders(serviceKey),
      cache: 'no-store',
    });
    const text2 = await res2.text();
    if (!res2.ok) {
      return { rows: [], error: parseErr(text2, res2.statusText) };
    }
    const data = JSON.parse(text2) as Record<string, unknown>[];
    const filtered = filterNonAuctionRows(Array.isArray(data) ? data : []);
    return {
      rows: filtered.slice(Math.max(0, offset), Math.max(0, offset) + limit),
      error: null,
    };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : 'rest fetch failed' };
  }
}

function parseContentRangeTotal(res: Response): number {
  const cr = res.headers.get('content-range');
  const m = cr?.match(/\*\/(\d+)/) || cr?.match(/\/(\d+)\s*$/);
  const n = m ? parseInt(m[1], 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function fetchSlugMarketCountRest(
  baseUrl: string,
  serviceKey: string,
): Promise<{ count: number; error: string | null }> {
  const root = baseUrl.replace(/\/$/, '');
  const buildCountUrl = (extra: Record<string, string>) => {
    const u = new URL(`${root}/rest/v1/slug_registrations`);
    u.searchParams.set('select', 'id');
    u.searchParams.set('for_sale', 'eq.true');
    u.searchParams.set('sale_price', 'gt.0');
    u.searchParams.set('limit', '0');
    for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
    return u.toString();
  };

  try {
    let res = await fetch(buildCountUrl({ or: '(status.is.null,status.not.eq.auction)' }), {
      headers: restHeaders(serviceKey, true),
      cache: 'no-store',
    });
    if (res.ok) {
      return { count: parseContentRangeTotal(res), error: null };
    }

    const resAll = await fetch(buildCountUrl({}), {
      headers: restHeaders(serviceKey, true),
      cache: 'no-store',
    });
    if (!resAll.ok) {
      const t = await resAll.text().catch(() => '');
      return { count: 0, error: t || resAll.statusText };
    }
    const total = parseContentRangeTotal(resAll);

    const resAuc = await fetch(
      buildCountUrl({ status: 'eq.auction' }),
      { headers: restHeaders(serviceKey, true), cache: 'no-store' },
    );
    const auc = resAuc.ok ? parseContentRangeTotal(resAuc) : 0;
    return { count: Math.max(0, total - auc), error: null };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : 'rest count failed' };
  }
}
