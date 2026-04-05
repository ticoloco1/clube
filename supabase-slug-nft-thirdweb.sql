-- Certificado NFT de slug (Polygon) após Stripe webhook — idempotência + carteira do comprador
-- Corre no Supabase SQL Editor (service role grava na webhook).

alter table if exists public.checkout_pending
  add column if not exists polygon_wallet text;

comment on column public.checkout_pending.polygon_wallet is
  'Carteira Polygon (0x…) do comprador; usada para mint ERC721 após pagamento de slug.';

create table if not exists public.slug_nft_mints (
  id uuid primary key default gen_random_uuid(),
  payment_ref text not null,
  slug text not null,
  user_id uuid not null,
  recipient text not null,
  chain_id integer not null default 137,
  token_uri text,
  tx_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_slug_nft_mints_payment_slug
  on public.slug_nft_mints (payment_ref, slug);

create index if not exists idx_slug_nft_mints_user on public.slug_nft_mints (user_id);
create index if not exists idx_slug_nft_mints_slug on public.slug_nft_mints (slug);

alter table public.slug_nft_mints enable row level security;

-- Sem políticas SELECT/INSERT para anon/authenticated — só service role (webhook).

select 'slug_nft_mints + checkout_pending.polygon_wallet OK' as status;
