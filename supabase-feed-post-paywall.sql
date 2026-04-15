-- Paywall de posts do feed (Stripe): preço + desbloqueio por comprador.
-- Executar no SQL Editor do Supabase após deploy do código que usa estas colunas/tabela.

alter table if exists feed_posts
  add column if not exists paywall_locked boolean not null default false;
alter table if exists feed_posts
  add column if not exists paywall_price_usd numeric;
alter table if exists feed_posts
  add column if not exists paywall_teaser text;

create table if not exists feed_post_unlocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  post_id      uuid not null references feed_posts (id) on delete cascade,
  amount_paid  numeric default 0,
  created_at   timestamptz default now(),
  unique (user_id, post_id)
);

create index if not exists idx_feed_post_unlocks_post on feed_post_unlocks (post_id);
create index if not exists idx_feed_post_unlocks_user on feed_post_unlocks (user_id);

alter table feed_post_unlocks enable row level security;
drop policy if exists "fpu_select_own" on feed_post_unlocks;
create policy "fpu_select_own" on feed_post_unlocks for select using (auth.uid() = user_id);

-- Conteúdo bloqueado: visitantes anónimos não veem linhas completas via PostgREST (evita vazamento).
-- O mini-site público usa GET /api/public/mini-site-feed (service role) para listar com teaser.
drop policy if exists "fp_select" on feed_posts;
create policy "fp_select" on feed_posts for select using (
  is_mini_site_owner(site_id)
  or (
    is_published_mini_site(site_id)
    and (
      not coalesce(paywall_locked, false)
      or exists (
        select 1 from feed_post_unlocks fpu
        where fpu.post_id = feed_posts.id and fpu.user_id = auth.uid()
      )
    )
  )
);
