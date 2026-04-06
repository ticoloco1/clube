-- Video paywall sem cadastro: unlock por wallet + intents USDC (Polygon)

create table if not exists paywall_unlock_wallets (
  id             uuid primary key default gen_random_uuid(),
  video_id       uuid not null references mini_site_videos (id) on delete cascade,
  site_id        uuid not null references mini_sites (id) on delete cascade,
  wallet_address text not null,
  amount_paid    numeric default 0,
  source         text default 'usdc_polygon',
  expires_at     timestamptz,
  created_at     timestamptz default now(),
  unique (video_id, wallet_address)
);

create index if not exists idx_pu_wallet_lookup
  on paywall_unlock_wallets (wallet_address, video_id, expires_at);

create table if not exists video_usdc_payment_intents (
  id                uuid primary key default gen_random_uuid(),
  video_id          uuid not null references mini_site_videos (id) on delete cascade,
  site_id           uuid not null references mini_sites (id) on delete cascade,
  site_slug         text not null,
  payer_wallet      text not null,
  amount_usd        numeric not null,
  amount_units      text not null, -- USDC units (6 casas) serializado para string bigint
  treasury_wallet   text not null,
  tx_hash           text,
  creator_payout_tx text,
  status            text not null default 'pending', -- pending | paid
  paid_at           timestamptz,
  created_at        timestamptz default now()
);

create index if not exists idx_video_usdc_intents_wallet
  on video_usdc_payment_intents (payer_wallet, created_at desc);

create index if not exists idx_video_usdc_intents_video
  on video_usdc_payment_intents (video_id, status, created_at desc);

-- RLS (apenas leitura pública para verificação por API server role; escrita via server role)
alter table paywall_unlock_wallets enable row level security;
alter table video_usdc_payment_intents enable row level security;

drop policy if exists "puw_select_all" on paywall_unlock_wallets;
create policy "puw_select_all" on paywall_unlock_wallets
  for select using (true);

drop policy if exists "vupi_select_all" on video_usdc_payment_intents;
create policy "vupi_select_all" on video_usdc_payment_intents
  for select using (true);
