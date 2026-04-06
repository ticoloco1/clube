-- BYOK API Hub (user-level): encrypted API keys for multiple providers.
-- Requires BYOK_ENCRYPTION_SECRET on server.

create table if not exists public.user_api_connections (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  provider        text not null,
  api_key_enc     text not null,
  is_active       boolean not null default true,
  last_checked_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_user_api_connections_user on public.user_api_connections (user_id, updated_at desc);
create index if not exists idx_user_api_connections_provider on public.user_api_connections (provider);

alter table public.user_api_connections enable row level security;

-- Users can list only their own rows (without exposing plaintext keys anyway).
drop policy if exists "uac_own_select" on public.user_api_connections;
create policy "uac_own_select"
  on public.user_api_connections
  for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies for anon/authenticated.
-- Writes are done with service role in API routes.

