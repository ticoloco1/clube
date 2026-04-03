/**
 * Mercado P2P de slugs.
 * - Ordem: RPC (anon) → REST com colunas explícitas → REST mínimo → GET /api/public/slug-market-list (service role + RPC).
 * - O PostgREST por vezes devolve "relationship between slug_registrations and mini_sites" mesmo sem embed;
 *   a RPC e a rota API contornam isso. Aplicar supabase-slug-market-rpc.sql no Supabase.
 * - Exclui leilões no cliente: status === 'auction'.
 */
const SLUG_MARKET_COLUMNS =
  'id, user_id, slug, status, expires_at, for_sale, sale_price, created_at';

function normalizeRpcRows(data: unknown): any[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null && ('slug' in (data as object) || 'id' in (data as object))) {
    return [data as any];
  }
  return [];
}

function filterNonAuction(rows: any[]) {
  return rows.filter((r: { status?: string | null }) => (r.status ?? '') !== 'auction');
}

/** True for PostgREST/embed errors and similar — never show raw `msg` to end users. */
export function isRelationshipOrSchemaError(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes('relationship') ||
    m.includes('mini_sites') ||
    m.includes('schema cache') ||
    (m.includes('column') && m.includes('does not exist'))
  );
}

async function fetchSlugMarketRowsViaServerApi(
  offset: number,
  limit: number,
): Promise<{ rows: any[]; error: { message: string } | null }> {
  if (typeof window === 'undefined') {
    return { rows: [], error: { message: 'slug-market API só no browser' } };
  }
  try {
    const res = await fetch(
      `/api/public/slug-market-list?offset=${offset}&limit=${limit}`,
      { cache: 'no-store' },
    );
    const j = (await res.json().catch(() => ({}))) as { rows?: unknown; error?: string };
    if (!res.ok) {
      return { rows: [], error: { message: j.error || res.statusText || 'slug-market API failed' } };
    }
    const raw = normalizeRpcRows(j.rows);
    return { rows: filterNonAuction(raw), error: null };
  } catch (e) {
    return { rows: [], error: { message: e instanceof Error ? e.message : 'slug-market API failed' } };
  }
}

export async function fetchSlugMarketRows(
  supabase: { rpc: (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>; from: (t: string) => any },
  offset: number,
  limit: number,
): Promise<{ rows: any[]; error: { message: string } | null }> {
  /**
   * No browser: só API (service role) ou RPC — nunca `.from('slug_registrations')`,
   * senão o PostgREST devolve "Could not find a relationship … mini_sites" no schema cache.
   */
  if (typeof window !== 'undefined') {
    const viaApi = await fetchSlugMarketRowsViaServerApi(offset, limit);
    if (!viaApi.error) return viaApi;

    const rpcFirst = await (supabase as any).rpc('slug_market_listings', {
      p_offset: offset,
      p_limit: limit,
    });
    if (!rpcFirst.error) {
      const raw = normalizeRpcRows(rpcFirst.data);
      return { rows: filterNonAuction(raw), error: null };
    }

    const hint =
      'Run supabase-slug-market-rpc.sql in Supabase and set SUPABASE_SERVICE_ROLE_KEY on the server.';
    const apiMsg = viaApi.error?.message || '';
    const rpcMsg = String(rpcFirst.error?.message || '');
    return {
      rows: [],
      error: {
        message: [apiMsg, rpcMsg].filter(Boolean).join(' · ') || hint,
      },
    };
  }

  const rpcFirst = await (supabase as any).rpc('slug_market_listings', {
    p_offset: offset,
    p_limit: limit,
  });
  if (!rpcFirst.error) {
    const raw = normalizeRpcRows(rpcFirst.data);
    return { rows: filterNonAuction(raw), error: null };
  }

  const { data, error } = await (supabase as any)
    .from('slug_registrations')
    .select(SLUG_MARKET_COLUMNS)
    .eq('for_sale', true)
    .gt('sale_price', 0)
    .order('sale_price', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!error) {
    return { rows: filterNonAuction(data || []), error: null };
  }

  const msg = String(error.message || '');
  if (isRelationshipOrSchemaError(msg) || msg.includes('42703')) {
    const rpcRes = await (supabase as any).rpc('slug_market_listings', {
      p_offset: offset,
      p_limit: limit,
    });
    if (!rpcRes.error) {
      const raw = normalizeRpcRows(rpcRes.data);
      return { rows: filterNonAuction(raw), error: null };
    }
  }

  const minimal = await (supabase as any)
    .from('slug_registrations')
    .select('id, user_id, slug, status, for_sale, sale_price, created_at')
    .eq('for_sale', true)
    .gt('sale_price', 0)
    .order('sale_price', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!minimal.error) {
    return { rows: filterNonAuction(minimal.data || []), error: null };
  }

  const apiTry = await fetchSlugMarketRowsViaServerApi(offset, limit);
  if (!apiTry.error) {
    return apiTry;
  }

  const finalMsg =
    error.message ||
    minimal.error?.message ||
    apiTry.error?.message ||
    'query failed';
  return { rows: [], error: { message: finalMsg } };
}

async function fetchSlugMarketCountViaServerApi(): Promise<number | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/public/slug-market-count', { cache: 'no-store' });
    const j = (await res.json().catch(() => ({}))) as { count?: number; error?: string };
    if (!res.ok) return null;
    const n = Number(j.count);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function fetchSlugMarketCount(
  supabase: { rpc: (n: string) => Promise<{ data: unknown; error: unknown }>; from: (t: string) => any },
): Promise<number> {
  if (typeof window !== 'undefined') {
    const viaApi = await fetchSlugMarketCountViaServerApi();
    if (viaApi != null) return viaApi;
    const rpcOnly = await (supabase as any).rpc('slug_market_listings_count');
    if (!rpcOnly.error && rpcOnly.data != null) {
      const n = Number(rpcOnly.data);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  const rpcRes = await (supabase as any).rpc('slug_market_listings_count');
  if (!rpcRes.error && rpcRes.data != null) {
    const n = Number(rpcRes.data);
    if (Number.isFinite(n)) return n;
  }

  const { count: allN, error: e1 } = await (supabase as any)
    .from('slug_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('for_sale', true)
    .gt('sale_price', 0);

  const { count: aucN, error: e2 } = await (supabase as any)
    .from('slug_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('for_sale', true)
    .gt('sale_price', 0)
    .eq('status', 'auction');

  if (e1 || e2) {
    const e1m = String((e1 as { message?: string })?.message || '');
    const e2m = String((e2 as { message?: string })?.message || '');
    if (isRelationshipOrSchemaError(e1m) || isRelationshipOrSchemaError(e2m)) {
      const viaApi = await fetchSlugMarketCountViaServerApi();
      if (viaApi != null) return viaApi;
    }
    const { data, error } = await (supabase as any)
      .from('slug_registrations')
      .select('status')
      .eq('for_sale', true)
      .gt('sale_price', 0);
    if (error || !data) return 0;
    return (data as { status?: string | null }[]).filter((r) => (r.status ?? '') !== 'auction').length;
  }

  const a = typeof allN === 'number' ? allN : 0;
  const b = typeof aucN === 'number' ? aucN : 0;
  return Math.max(0, a - b);
}
