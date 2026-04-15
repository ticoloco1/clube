import type { SupabaseClient } from '@supabase/supabase-js';

export type SlugMarketPurchaseRow = {
  user_id: string;
  slug: string;
  sale_price: number;
};

/**
 * Valida compra a preço fixo no mercado de slugs.
 * - Compara slug sem depender da capitalização (ilike).
 * - Se `status` = `auction` mas não há leilão ativo em `slug_auctions`, trata como venda fixa
 *   (leilão terminou e a linha em `slug_registrations` ficou desatualizada).
 */
export async function validateSlugMarketFixedPrice(
  db: SupabaseClient,
  slugRaw: string,
): Promise<{ ok: true; row: SlugMarketPurchaseRow } | { ok: false; error: string }> {
  const slugNorm = String(slugRaw || '').trim().toLowerCase();
  if (!slugNorm) {
    return { ok: false, error: 'Slug inválido no carrinho.' };
  }

  const { data: reg, error } = await db
    .from('slug_registrations' as any)
    .select('user_id, slug, for_sale, sale_price, status')
    .ilike('slug', slugNorm)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        'Erro ao consultar o slug. Verifica SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL na Vercel (mesmo projeto).',
    };
  }

  const r = reg as {
    user_id?: string;
    slug?: string;
    for_sale?: boolean | null;
    sale_price?: number | string | null;
    status?: string | null;
  } | null;

  if (!r?.user_id) {
    return { ok: false, error: `Slug /${slugNorm} não encontrado.` };
  }
  if (!r.for_sale) {
    return { ok: false, error: `O slug /${slugNorm} não está à venda.` };
  }

  const sp = Number(r.sale_price);
  if (!Number.isFinite(sp) || sp < 0.5) {
    return { ok: false, error: `Preço de venda inválido para /${slugNorm}.` };
  }

  const st = String(r.status ?? '');
  if (st === 'auction') {
    const { data: live } = await db
      .from('slug_auctions' as any)
      .select('id, ends_at')
      .ilike('slug', slugNorm)
      .eq('status', 'active')
      .gte('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (live && (live as { ends_at?: string }).ends_at) {
      return {
        ok: false,
        error: `O slug /${slugNorm} está em leilão ativo — não podes pagar a preço fixo; usa o fluxo do leilão.`,
      };
    }
  }

  return {
    ok: true,
    row: {
      user_id: r.user_id,
      slug: String(r.slug || slugNorm),
      sale_price: sp,
    },
  };
}
