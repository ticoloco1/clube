-- Mercado de slugs: RPC sem depender do tipo composto da linha (evita conflitos ao reaplicar).
-- Idempotente: pode correr o script inteiro várias vezes no SQL Editor do Supabase.
-- Corrige cenários em que PostgREST acusa relação slug_registrations ↔ mini_sites no .select().

drop function if exists public.slug_market_listings(int, int);
drop function if exists public.slug_market_listings_count();

create function public.slug_market_listings(p_offset int default 0, p_limit int default 500)
returns table (
  id uuid,
  user_id uuid,
  slug text,
  status text,
  expires_at timestamptz,
  for_sale boolean,
  sale_price numeric,
  registration_fee numeric,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    sr.id,
    sr.user_id,
    sr.slug,
    sr.status,
    sr.expires_at,
    sr.for_sale,
    sr.sale_price,
    sr.registration_fee,
    sr.created_at
  from public.slug_registrations sr
  where sr.for_sale = true
    and sr.sale_price is not null
    and coalesce(sr.sale_price, 0) > 0
    and coalesce(sr.status, '') <> 'auction'
  order by sr.sale_price asc nulls last
  offset greatest(0, p_offset)
  limit least(500, greatest(1, p_limit));
$$;

create function public.slug_market_listings_count()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::bigint
  from public.slug_registrations sr
  where sr.for_sale = true
    and sr.sale_price is not null
    and coalesce(sr.sale_price, 0) > 0
    and coalesce(sr.status, '') <> 'auction';
$$;

grant execute on function public.slug_market_listings(int, int) to anon, authenticated;
grant execute on function public.slug_market_listings_count() to anon, authenticated;
