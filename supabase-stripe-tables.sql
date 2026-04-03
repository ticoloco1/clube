-- Stripe checkout pending rows + company CV directory access + webhook idempotency
-- Run in Supabase SQL Editor if you already have a live DB (then reload API schema).

-- user_id sem FK a auth.users (evita erro "relation users does not exist" no SQL Editor)
create table if not exists public.checkout_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lines jsonb not null,
  stripe_checkout_session_id text,
  fulfilled boolean not null default false,
  created_at timestamptz default now()
);

alter table if exists public.checkout_pending add column if not exists stripe_connect_account_id text;

create index if not exists idx_checkout_pending_session on public.checkout_pending (stripe_checkout_session_id);
create index if not exists idx_checkout_pending_user on public.checkout_pending (user_id);

create table if not exists public.company_cv_directory_access (
  user_id uuid primary key,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

alter table public.company_cv_directory_access enable row level security;
drop policy if exists "ccd_read_own" on public.company_cv_directory_access;
create policy "ccd_read_own" on public.company_cv_directory_access
  for select using (auth.uid() = user_id);

-- No insert/update for authenticated clients — service role / webhooks only

create table if not exists public.stripe_webhook_events (
  id text primary key,
  created_at timestamptz default now()
);

-- Optional: avoid duplicate CV unlock rows on webhook retries
create unique index if not exists uq_cv_unlocks_unlocker_site on cv_unlocks (unlocker_id, site_id);

select 'stripe + directory tables ready' as status;
