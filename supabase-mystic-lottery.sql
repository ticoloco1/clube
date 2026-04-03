-- =============================================================================
-- OPCIONAL: histórico /mistico (admin) — NÃO é necessário para loteria paga no
-- mini-site (isso usa mystic_entitlements em supabase-minisite-mystic-tarot-loteria.sql).
--
-- user_id = mesmo UUID que auth.users.id, sem FK (evita erro "relation users
-- does not exist" em alguns ambientes).
-- =============================================================================

create table if not exists public.user_mystic_lottery_config (
  user_id uuid primary key,
  selected_mystic_modules jsonb not null default '["tarot", "numerology", "astrology"]'::jsonb,
  selected_lotteries jsonb not null default '["mega-sena", "quina", "lotofacil", "powerball", "euromillions"]'::jsonb,
  plan_type text default 'basic',
  additional_cost numeric(10, 2) default 0,
  mystic_enabled boolean not null default true,
  lottery_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lottery_generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id uuid,
  client_email text,
  client_name text,
  lottery_id text not null,
  lottery_name text,
  ai_mode text default 'normal',
  quantity int default 1,
  games jsonb,
  cost numeric(10, 2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.tarot_reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id uuid,
  client_email text,
  client_name text,
  spread_type text not null,
  spread_name text,
  question text,
  category text default 'general',
  cards jsonb,
  interpretation text,
  created_at timestamptz default now()
);

create index if not exists idx_lottery_gen_user on public.lottery_generation_history (user_id);
create index if not exists idx_lottery_gen_created on public.lottery_generation_history (created_at desc);
create index if not exists idx_tarot_read_user on public.tarot_reading_history (user_id);
create index if not exists idx_tarot_read_created on public.tarot_reading_history (created_at desc);

alter table public.user_mystic_lottery_config enable row level security;
alter table public.lottery_generation_history enable row level security;
alter table public.tarot_reading_history enable row level security;

drop policy if exists "mystic_config_own" on public.user_mystic_lottery_config;
create policy "mystic_config_own" on public.user_mystic_lottery_config
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lottery_hist_own" on public.lottery_generation_history;
create policy "lottery_hist_own" on public.lottery_generation_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tarot_hist_own" on public.tarot_reading_history;
create policy "tarot_hist_own" on public.tarot_reading_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

select 'mystic_lottery opcional (histórico admin) OK' as status;
