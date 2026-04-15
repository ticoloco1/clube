-- =============================================================================
-- TrustBank — ALL-IN-ONE (gerado automaticamente)
-- Gerado por: scripts/build-supabase-all-in-one.sh
-- Data: 2026-04-06T00:35:33Z
--
-- ⚠️  CRÍTICO: o primeiro bloco (supabase-schema-completo.sql) contém PASSO 0 que
--     APAGA todo o schema public (dados irreversíveis). Usa APENAS em projeto
--     Supabase NOVO ou com backup. NÃO corras em produção com dados reais.
--
-- Para BD já em uso: corre os .sql incrementais à mão (ver cabeçalho de
--     supabase-schema-validation.sql), não este all-in-one.
--
-- Depois: supabase-schema-validation.sql (só SELECTs).
-- Storage: bucket 'platform-assets' no Dashboard + políticas (último bloco).
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-schema-completo.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- TrustBank / ZicoBank — RESET + SCHEMA COMPLETO (uma única execução)
-- =============================================================================
-- ATENÇÃO: o PASSO 0 apaga TUDO em `public` (tabelas, views, funções, políticas).
-- Não apaga auth.users nem buckets de Storage. Irreversível para dados em public.
--
-- Ordem sugerida:
--   1. SQL Editor → colar este ficheiro inteiro → Run
--   2. Storage: bucket "platform-assets" (criar se não existir)
--   3. Settings → API → Reload schema
--   4. Inserir o teu admin:
--        insert into public.user_roles (user_id, role)
--        values ('UUID_DO_AUTH_USERS', 'admin');
--
-- Os ficheiros supabase-additions.sql, supabase-mini-sites-editor-columns.sql e
-- supabase-marketplace-ads.sql ficam obsoletos se usares só este script.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 0 — Zerar schema public (base limpa, sem conflitos com migrações antigas)
-- ─────────────────────────────────────────────────────────────────────────────
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to postgres, anon, authenticated, service_role;

-- Extensão para gen_random_uuid() (já vem ativa na maioria dos projetos Supabase)
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabelas de referência (marketplace / diretório)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists site_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

insert into site_categories (slug, label, sort_order) values
  ('creator', 'Criador / Influencer', 10),
  ('services', 'Serviços', 20),
  ('tech', 'Tech & Dev', 30),
  ('business', 'Negócios', 40),
  ('local', 'Local / Comunidade', 50),
  ('other', 'Outros', 99)
on conflict (slug) do nothing;

create table if not exists directory_profile_types (
  slug       text primary key,
  label_pt   text not null,
  sort_order integer default 0
);

insert into directory_profile_types (slug, label_pt, sort_order) values
  ('creator', 'Criador de conteúdo', 5),
  ('influencer', 'Influencer', 10),
  ('actor', 'Ator', 20),
  ('actress', 'Atriz', 21),
  ('athlete', 'Jogador / Atleta', 30),
  ('entrepreneur', 'Empresário', 40),
  ('automotive', 'Carros / Automotivo', 50),
  ('services', 'Serviços', 60),
  ('other', 'Outro', 99)
on conflict (slug) do nothing;

-- Híbrido: id=1 = painel /governance; linhas com key = /admin (trial, features, etc.)
create table if not exists platform_settings (
  id                    serial primary key,
  key                   text unique,
  value                 text,
  updated_at            timestamptz default now(),
  site_name             text,
  favicon_url           text,
  site_url              text,
  commission_paywall    numeric,
  ticker_text           text,
  stripe_key            text,
  stripe_webhook        text,
  coinbase_key          text,
  coinbase_webhook      text,
  platform_wallet       text
);

insert into platform_settings (id, site_name, site_url)
values (1, 'TrustBank', 'https://trustbank.xyz')
on conflict (id) do nothing;

-- Próximos inserts sem id não colidem com id=1
select setval(
  pg_get_serial_sequence('platform_settings', 'id'),
  (select coalesce(max(id), 1) from platform_settings)
);

insert into platform_settings (key, value, updated_at) values
  ('trial_hours', '24', now()),
  ('grace_days', '30', now()),
  ('warning_hours', '1', now()),
  ('test_ribbon_text', 'LIVE', now())
on conflict (key) do nothing;

create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Mini-sites (núcleo)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists mini_sites (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  slug                      text not null unique,
  site_name                 text not null default '',
  bio                       text default '',
  avatar_url                text,
  banner_url                text,
  bg_image_url              text,
  theme                     text default 'midnight',
  accent_color              text default '#818cf8',
  font_size                 text default 'md',
  photo_shape               text default 'round',
  photo_size                text default 'md',
  published                 boolean not null default false,
  blocked                   boolean not null default false,
  show_cv                   boolean not null default false,
  cv_content                text,
  cv_headline               text,
  cv_location               text,
  cv_skills                 text[] default '{}'::text[],
  cv_experience             jsonb default '[]'::jsonb,
  cv_education              jsonb default '[]'::jsonb,
  cv_projects               jsonb default '[]'::jsonb,
  cv_languages              jsonb default '[]'::jsonb,
  cv_certificates           jsonb default '[]'::jsonb,
  cv_locked                 boolean not null default false,
  cv_free                   boolean not null default false,
  cv_price                  numeric default 20,
  cv_contact_whatsapp       text,
  cv_hire_price             numeric default 0,
  cv_hire_currency          text default 'USD',
  cv_hire_type              text default 'hour',
  contact_email             text,
  contact_phone             text,
  contact_price             numeric default 0,
  module_order              text,
  template_id               text default 'default',
  text_color                text,
  video_cols                integer default 1,
  font_style                text default 'sans',
  wallet_address            text,
  is_verified               boolean not null default false,
  youtube_channel_id      text,
  section_order             jsonb default '["summary","experience","education","skills","projects","languages","certificates","contact"]'::jsonb,
  show_feed                 boolean not null default true,
  feed_cols                 integer default 1,
  site_pages                text,
  page_width                integer default 600,
  page_contents             text,
  page_modules              text,
  banner_focus_x            integer default 50,
  banner_focus_y            integer default 50,
  banner_zoom               integer default 100,
  banner_fit                text default 'cover',
  banner_placeholder_enabled boolean not null default true,
  banner_placeholder_color  text default '#1f2937',
  seo_title                 text,
  seo_description           text,
  seo_og_image              text,
  trial_publish_until       timestamptz,
  trial_grace_until         timestamptz,
  trial_notice_sent_at      timestamptz,
  ticker_enabled            boolean not null default true,
  ticker_items              jsonb default '[]'::jsonb,
  site_category_slug        text references site_categories (slug) on update cascade on delete set null,
  directory_profile_slug    text references directory_profile_types (slug) on update cascade on delete set null,
  follower_count            integer not null default 0,
  ad_asking_price_usdc      numeric,
  ad_show_price_public      boolean default true,
  ad_notes                  text,
  stripe_connect_account_id   text,
  stripe_connect_charges_enabled boolean default false,
  stripe_connect_payouts_enabled boolean default false,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- Removido em instalações que precisam de vários mini_sites por utilizador (admin):
-- ver supabase-mini-sites-multi-per-user.sql (drop index uq_mini_sites_one_per_user).
-- create unique index if not exists uq_mini_sites_one_per_user on mini_sites (user_id);
create index if not exists idx_mini_sites_stripe_connect_account on mini_sites (stripe_connect_account_id) where stripe_connect_account_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Links, vídeos, feed
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists mini_site_links (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references mini_sites (id) on delete cascade,
  title       text not null,
  url         text not null,
  icon        text,
  color       text,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

create table if not exists mini_site_videos (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references mini_sites (id) on delete cascade,
  youtube_video_id text not null,
  title            text,
  paywall_enabled  boolean default false,
  paywall_price    numeric default 4.99,
  sort_order       integer default 0,
  created_at       timestamptz default now()
);

create table if not exists feed_posts (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references mini_sites (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  text             text,
  image_url        text,
  media_urls       jsonb default '[]'::jsonb,
  video_embed_url  text,
  pinned           boolean default false,
  expires_at       timestamptz not null,
  created_at       timestamptz default now()
);

create index if not exists idx_feed_posts_site on feed_posts (site_id);

alter table feed_posts add column if not exists paywall_locked boolean not null default false;
alter table feed_posts add column if not exists paywall_price_usd numeric;
alter table feed_posts add column if not exists paywall_teaser text;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- Slugs, subscrições, planos
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists slug_registrations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  slug               text not null unique,
  status             text not null default 'active',
  expires_at         timestamptz,
  for_sale           boolean default false,
  sale_price         numeric,
  registration_fee   numeric default 0,
  created_at         timestamptz default now()
);

create table if not exists subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  plan        text not null default 'pro',
  status      text default 'active',
  price       numeric default 0,
  expires_at  timestamptz,
  updated_at  timestamptz default now()
);

create table if not exists platform_plans (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  price_monthly  numeric default 0,
  price_yearly   numeric default 0,
  currency       text default 'USD',
  active         boolean default true,
  color          text default '#818cf8',
  emoji          text default '✨',
  features       jsonb default '[]'::jsonb,
  sort_order     integer default 0,
  created_at     timestamptz default now()
);

insert into platform_plans (name, slug, price_monthly, price_yearly, color, emoji, features, sort_order)
values
  ('Pro', 'pro', 29.99, 288.00, '#818cf8', '⚡',
   '["Unlimited links","3 site pages","Feed & paid posts (Stripe)","CV unlock","30 themes","Analytics","1 free slug included"]'::jsonb, 1)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics, mensagens, leilões, slugs premium
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists site_visits (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references mini_sites (id) on delete cascade,
  slug        text,
  referrer    text,
  device      text,
  country     text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  created_at  timestamptz default now()
);

create table if not exists site_link_clicks (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid references mini_sites (id) on delete cascade,
  link_id          uuid,
  slug             text,
  destination_url  text,
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  created_at       timestamptz default now()
);

create table if not exists site_messages (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references mini_sites (id) on delete cascade,
  sender_name   text,
  sender_email  text,
  message       text not null,
  read          boolean default false,
  created_at    timestamptz default now()
);

create table if not exists slug_auctions (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null,
  slug_registration_id   uuid,
  seller_id              uuid references auth.users (id) on delete set null,
  min_bid                numeric default 0,
  current_bid            numeric default 0,
  min_increment          numeric default 5,
  bid_count              integer default 0,
  winner_id              uuid references auth.users (id) on delete set null,
  ends_at                timestamptz not null,
  status                 text default 'active',
  created_at             timestamptz default now()
);

create table if not exists premium_slugs (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  keyword      text,
  price        numeric not null default 12,
  active       boolean default true,
  auction      boolean default false,
  auction_end  timestamptz,
  sold_to      uuid references auth.users (id) on delete set null,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Classificados (imóveis, carros, …)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists classified_listings (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references mini_sites (id) on delete set null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null,
  title       text not null,
  price       numeric not null,
  currency    text default 'USD',
  region      text,
  country     text,
  state_city  text,
  images      jsonb default '[]'::jsonb,
  extra       jsonb default '{}'::jsonb,
  status      text default 'pending',
  boost_score numeric default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_classified_user on classified_listings (user_id);
create index if not exists idx_classified_type on classified_listings (type);

-- ─────────────────────────────────────────────────────────────────────────────
-- Pagamentos / desbloqueios / créditos / boost / jackpot
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists paywall_unlocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  video_id     uuid not null references mini_site_videos (id) on delete cascade,
  amount_paid  numeric default 0,
  source       text default 'video',
  expires_at   timestamptz,
  creator_id   uuid references auth.users (id) on delete set null,
  created_at   timestamptz default now(),
  unique (user_id, video_id)
);

create or replace function trg_paywall_set_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select m.user_id into new.creator_id
  from mini_site_videos v
  join mini_sites m on m.id = v.site_id
  where v.id = new.video_id;
  return new;
end;
$$;

drop trigger if exists tr_paywall_creator on paywall_unlocks;
create trigger tr_paywall_creator
  before insert on paywall_unlocks
  for each row execute function trg_paywall_set_creator();

create table if not exists cv_unlocks (
  id           uuid primary key default gen_random_uuid(),
  unlocker_id  uuid not null references auth.users (id) on delete cascade,
  site_id      uuid not null references mini_sites (id) on delete cascade,
  amount_paid  numeric default 0,
  source       text default 'direct',
  created_at   timestamptz default now()
);

create unique index if not exists uq_cv_unlocks_unlocker_site on cv_unlocks (unlocker_id, site_id);

create table if not exists company_cv_directory_access (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

create table if not exists checkout_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lines jsonb not null,
  stripe_checkout_session_id text,
  fulfilled boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_checkout_pending_session on checkout_pending (stripe_checkout_session_id);

create table if not exists stripe_webhook_events (
  id text primary key,
  created_at timestamptz default now()
);

create table if not exists boosts (
  id               uuid primary key default gen_random_uuid(),
  target_type      text default 'site',
  target_id        uuid not null,
  booster_id       uuid not null references auth.users (id) on delete cascade,
  amount           numeric not null,
  positions_gained integer default 1,
  created_at       timestamptz default now()
);

create table if not exists site_boosts (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references mini_sites (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount     numeric not null,
  created_at timestamptz default now()
);

create table if not exists credit_wallets (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  balance         bigint not null default 0,
  total_purchased bigint not null default 0,
  updated_at      timestamptz default now()
);

create table if not exists credit_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null,
  amount       bigint not null,
  usdc_amount  numeric,
  description  text,
  ref_id       text,
  created_at   timestamptz default now()
);

create table if not exists jackpot_pool (
  id             uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  balance_usdc   numeric default 0,
  total_entries  bigint default 0,
  enabled        boolean default true,
  updated_at     timestamptz default now()
);

insert into jackpot_pool (id) values ('00000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

create table if not exists jackpot_draws (
  id            uuid primary key default gen_random_uuid(),
  winner_id     uuid references auth.users (id) on delete set null,
  prize_usdc    numeric,
  total_tickets bigint,
  created_at    timestamptz default now()
);

create table if not exists jackpot_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  boost_id   uuid references boosts (id) on delete set null,
  tickets    integer not null default 1,
  draw_id    uuid references jackpot_draws (id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_jackpot_entries_user_open on jackpot_entries (user_id) where draw_id is null;

-- RPC usada pelo webhook (Helio) e opcionalmente pelo governance
create or replace function add_to_jackpot(usdc_amount numeric, ticket_count integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update jackpot_pool set
    balance_usdc  = coalesce(balance_usdc, 0) + coalesce(usdc_amount, 0),
    total_entries = coalesce(total_entries, 0) + coalesce(ticket_count, 0)::bigint,
    updated_at    = now()
  where id = '00000000-0000-0000-0000-000000000001'::uuid;
end;
$$;

-- Sorteio mínimo: escolhe um participante com tickets pendentes (ajusta depois se quiseres lógica mais rica)
create or replace function run_jackpot_draw(admin_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  pool_row jackpot_pool%rowtype;
  win_user uuid;
  win_tickets int;
  new_draw_id uuid;
begin
  select * into pool_row from jackpot_pool where id = '00000000-0000-0000-0000-000000000001'::uuid;
  if pool_row.enabled is false then
    return json_build_object('ok', false, 'error', 'jackpot_disabled');
  end if;

  select user_id, tickets into win_user, win_tickets
  from jackpot_entries
  where draw_id is null and tickets > 0
  order by random()
  limit 1;

  if win_user is null then
    return json_build_object('ok', false, 'error', 'no_entries');
  end if;

  insert into jackpot_draws (winner_id, prize_usdc, total_tickets)
  values (win_user, pool_row.balance_usdc * 0.85, pool_row.total_entries)
  returning id into new_draw_id;

  -- Fecha o sorteio atual: associa todas as entradas pendentes a este draw
  update jackpot_entries set draw_id = new_draw_id where draw_id is null;

  update jackpot_pool set
    balance_usdc = 0,
    total_entries = 0,
    updated_at = now()
  where id = '00000000-0000-0000-0000-000000000001'::uuid;

  return json_build_object('ok', true, 'winner', win_user, 'draw_id', new_draw_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Notificações, broadcasts
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null,
  title      text,
  message    text,
  read       boolean default false,
  created_at timestamptz default now()
);

create table if not exists broadcasts (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  title      text,
  sent_to    integer default 0,
  sent_by    uuid references auth.users (id) on delete set null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seguidores + contador
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists site_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  site_id     uuid not null references mini_sites (id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, site_id)
);

create index if not exists idx_site_follows_site on site_follows (site_id);

create or replace function site_follows_sync_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update mini_sites set follower_count = follower_count + 1 where id = new.site_id;
    return new;
  elsif tg_op = 'DELETE' then
    update mini_sites set follower_count = greatest(0, follower_count - 1) where id = old.site_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_site_follows_count_ins on site_follows;
drop trigger if exists tr_site_follows_count_del on site_follows;
create trigger tr_site_follows_count_ins after insert on site_follows
  for each row execute function site_follows_sync_count();
create trigger tr_site_follows_count_del after delete on site_follows
  for each row execute function site_follows_sync_count();

-- ─────────────────────────────────────────────────────────────────────────────
-- Marketplace de anúncios (marca → mini-sites)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists ad_proposals (
  id                   uuid primary key default gen_random_uuid(),
  advertiser_user_id   uuid not null references auth.users (id) on delete cascade,
  title                text not null,
  body                 text,
  duration_days        integer not null default 7 check (duration_days > 0 and duration_days <= 365),
  total_budget_usdc    numeric not null check (total_budget_usdc >= 0),
  platform_fee_pct     numeric not null default 20 check (platform_fee_pct >= 0 and platform_fee_pct <= 100),
  status               text not null default 'draft',
  payment_status       text not null default 'unpaid',
  paid_amount_usdc     numeric,
  helio_tx_ref         text,
  paid_at              timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_ad_proposals_advertiser on ad_proposals (advertiser_user_id);
create index if not exists idx_ad_proposals_status on ad_proposals (status);

create table if not exists ad_proposal_targets (
  id                    uuid primary key default gen_random_uuid(),
  proposal_id           uuid not null references ad_proposals (id) on delete cascade,
  site_id               uuid not null references mini_sites (id) on delete cascade,
  bid_amount_usdc       numeric not null check (bid_amount_usdc >= 0),
  owner_status          text not null default 'pending',
  message_to_owner      text,
  creator_share_usdc    numeric,
  creator_payout_status text not null default 'none',
  responded_at          timestamptz,
  unique (proposal_id, site_id)
);

create index if not exists idx_ad_targets_site on ad_proposal_targets (site_id);
create index if not exists idx_ad_targets_proposal on ad_proposal_targets (proposal_id);

create table if not exists ad_campaigns (
  id                   uuid primary key default gen_random_uuid(),
  proposal_id          uuid not null references ad_proposals (id) on delete cascade,
  target_id            uuid references ad_proposal_targets (id) on delete set null,
  site_id              uuid not null references mini_sites (id) on delete cascade,
  starts_at            timestamptz not null default now(),
  ends_at              timestamptz not null,
  delete_locked_until  timestamptz not null,
  ticker_items         jsonb default '[]'::jsonb,
  feed_post_id         uuid,
  status               text not null default 'scheduled',
  created_at           timestamptz default now()
);

create index if not exists idx_ad_campaigns_site on ad_campaigns (site_id);
create index if not exists idx_ad_campaigns_ends on ad_campaigns (ends_at);

create table if not exists ad_pricing_benchmarks (
  id                   uuid primary key default gen_random_uuid(),
  profile_slug         text references directory_profile_types (slug) on update cascade on delete cascade,
  site_category_slug   text references site_categories (slug) on update cascade on delete cascade,
  followers_min        integer not null default 0,
  followers_max        integer not null default 2147483647,
  suggested_usdc_week  numeric not null,
  label                text,
  sort_order           integer default 0,
  created_at           timestamptz default now()
);

create index if not exists idx_ad_benchmarks_profile on ad_pricing_benchmarks (profile_slug);
create index if not exists idx_ad_benchmarks_cat on ad_pricing_benchmarks (site_category_slug);

create index if not exists idx_mini_sites_category on mini_sites (site_category_slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — políticas práticas para o app (anon + autenticado)
-- ─────────────────────────────────────────────────────────────────────────────

-- Função auxiliar: dono do site
create or replace function is_mini_site_owner(p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mini_sites m
    where m.id = p_site_id and m.user_id = auth.uid()
  );
$$;

create or replace function is_published_mini_site(p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select published from mini_sites where id = p_site_id), false);
$$;

-- mini_sites
alter table mini_sites enable row level security;
drop policy if exists "ms_select" on mini_sites;
drop policy if exists "ms_insert" on mini_sites;
drop policy if exists "ms_update" on mini_sites;
drop policy if exists "ms_delete" on mini_sites;
create policy "ms_select" on mini_sites for select using (
  published = true or auth.uid() = user_id
);
create policy "ms_insert" on mini_sites for insert with check (auth.uid() = user_id);
create policy "ms_update" on mini_sites for update using (auth.uid() = user_id);
create policy "ms_delete" on mini_sites for delete using (auth.uid() = user_id);

-- mini_site_links
alter table mini_site_links enable row level security;
drop policy if exists "msl_select" on mini_site_links;
drop policy if exists "msl_mut" on mini_site_links;
create policy "msl_select" on mini_site_links for select using (
  is_published_mini_site(site_id) or is_mini_site_owner(site_id)
);
create policy "msl_mut" on mini_site_links for all using (is_mini_site_owner(site_id))
  with check (is_mini_site_owner(site_id));

-- mini_site_videos
alter table mini_site_videos enable row level security;
drop policy if exists "msv_select" on mini_site_videos;
drop policy if exists "msv_mut" on mini_site_videos;
create policy "msv_select" on mini_site_videos for select using (
  is_published_mini_site(site_id) or is_mini_site_owner(site_id)
);
create policy "msv_mut" on mini_site_videos for all using (is_mini_site_owner(site_id))
  with check (is_mini_site_owner(site_id));

-- feed_posts
alter table feed_posts enable row level security;
drop policy if exists "fp_select" on feed_posts;
drop policy if exists "fp_ins" on feed_posts;
drop policy if exists "fp_upd" on feed_posts;
drop policy if exists "fp_del" on feed_posts;
alter table if exists feed_post_unlocks enable row level security;
drop policy if exists "fpu_select_own" on feed_post_unlocks;
create policy "fpu_select_own" on feed_post_unlocks for select using (auth.uid() = user_id);
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
create policy "fp_ins" on feed_posts for insert with check (
  auth.uid() = user_id and is_mini_site_owner(site_id)
);
create policy "fp_upd" on feed_posts for update using (is_mini_site_owner(site_id));
create policy "fp_del" on feed_posts for delete using (is_mini_site_owner(site_id));

-- slug_registrations
alter table slug_registrations enable row level security;
drop policy if exists "sr_own" on slug_registrations;
drop policy if exists "sr_read_slug" on slug_registrations;
create policy "sr_own" on slug_registrations for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "sr_read_slug" on slug_registrations for select using (true);

-- subscriptions
alter table subscriptions enable row level security;
drop policy if exists "sub_own" on subscriptions;
drop policy if exists "sub_admin" on subscriptions;
create policy "sub_own" on subscriptions for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "sub_admin" on subscriptions for all using (
  exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
) with check (
  exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
);

-- platform_plans
alter table platform_plans enable row level security;
drop policy if exists "plans_read" on platform_plans;
drop policy if exists "plans_all" on platform_plans;
create policy "plans_read" on platform_plans for select using (true);
create policy "plans_all" on platform_plans for all using (true);

-- platform_settings: leitura pública das chaves não sensíveis; escrita só service role / dashboard
alter table platform_settings enable row level security;
drop policy if exists "ps_read" on platform_settings;
drop policy if exists "ps_write" on platform_settings;
create policy "ps_read" on platform_settings for select using (true);
create policy "ps_write" on platform_settings for all using (auth.role() = 'service_role');

-- Escrita em config: só admin (tabela user_roles) ou service_role (webhooks / SQL Editor)
drop policy if exists "ps_write" on platform_settings;
drop policy if exists "ps_write_kv" on platform_settings;
drop policy if exists "ps_update_kv" on platform_settings;
drop policy if exists "ps_update_gov" on platform_settings;

create policy "ps_admin_ins_kv" on platform_settings for insert with check (
  key is not null
  and exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
);
create policy "ps_admin_upd_kv" on platform_settings for update using (
  key is not null
  and exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
);
create policy "ps_admin_upd_gov" on platform_settings for update using (
  id = 1
  and exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
);

-- user_roles
alter table user_roles enable row level security;
drop policy if exists "ur_self" on user_roles;
create policy "ur_self" on user_roles for select using (auth.uid() = user_id);

-- site_visits
alter table site_visits enable row level security;
drop policy if exists "sv_read" on site_visits;
drop policy if exists "sv_insert" on site_visits;
create policy "sv_read" on site_visits for select using (is_mini_site_owner(site_id));
create policy "sv_insert" on site_visits for insert with check (true);

-- site_link_clicks
alter table site_link_clicks enable row level security;
drop policy if exists "slc_read" on site_link_clicks;
drop policy if exists "slc_insert" on site_link_clicks;
create policy "slc_read" on site_link_clicks for select using (is_mini_site_owner(site_id));
create policy "slc_insert" on site_link_clicks for insert with check (true);

-- site_messages
alter table site_messages enable row level security;
drop policy if exists "sm_read" on site_messages;
drop policy if exists "sm_insert" on site_messages;
create policy "sm_read" on site_messages for select using (is_mini_site_owner(site_id));
create policy "sm_insert" on site_messages for insert with check (true);

-- slug_auctions
alter table slug_auctions enable row level security;
drop policy if exists "sauc_read" on slug_auctions;
drop policy if exists "sauc_write" on slug_auctions;
create policy "sauc_read" on slug_auctions for select using (true);
create policy "sauc_write" on slug_auctions for all using (true);

-- premium_slugs
alter table premium_slugs enable row level security;
drop policy if exists "psl_read" on premium_slugs;
drop policy if exists "psl_write" on premium_slugs;
create policy "psl_read" on premium_slugs for select using (true);
create policy "psl_write" on premium_slugs for all using (true);

-- classified_listings
alter table classified_listings enable row level security;
drop policy if exists "cl_read" on classified_listings;
drop policy if exists "cl_own" on classified_listings;
create policy "cl_read" on classified_listings for select using (true);
create policy "cl_own" on classified_listings for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- paywall_unlocks
alter table paywall_unlocks enable row level security;
drop policy if exists "pu_own" on paywall_unlocks;
drop policy if exists "pu_creator" on paywall_unlocks;
create policy "pu_own" on paywall_unlocks for select using (auth.uid() = user_id);
create policy "pu_creator" on paywall_unlocks for select using (auth.uid() = creator_id);
create policy "pu_ins" on paywall_unlocks for insert with check (auth.uid() = user_id);

-- cv_unlocks
alter table cv_unlocks enable row level security;
drop policy if exists "cvu_ins" on cv_unlocks;
drop policy if exists "cvu_own" on cv_unlocks;
create policy "cvu_ins" on cv_unlocks for insert with check (auth.uid() = unlocker_id);
create policy "cvu_own" on cv_unlocks for select using (
  auth.uid() = unlocker_id
  or exists (select 1 from mini_sites m where m.id = site_id and m.user_id = auth.uid())
);

-- company CV directory (empresas $199/mês) — leitura própria; escrita só service role / webhook
alter table company_cv_directory_access enable row level security;
drop policy if exists "ccd_read_own" on company_cv_directory_access;
create policy "ccd_read_own" on company_cv_directory_access for select using (auth.uid() = user_id);

-- checkout_pending / stripe_webhook_events: sem políticas para clientes (só service role)
alter table checkout_pending enable row level security;
alter table stripe_webhook_events enable row level security;

-- boosts / site_boosts (webhook usa service role; leitura simplificada)
alter table boosts enable row level security;
alter table site_boosts enable row level security;
drop policy if exists "b_read" on boosts;
drop policy if exists "b_ins" on boosts;
drop policy if exists "sb_read" on site_boosts;
drop policy if exists "sb_ins" on site_boosts;
create policy "b_read" on boosts for select using (true);
create policy "b_ins" on boosts for insert with check (auth.uid() = booster_id);
create policy "sb_read" on site_boosts for select using (true);
create policy "sb_ins" on site_boosts for insert with check (auth.uid() = user_id);

-- credit_wallets / credit_transactions
alter table credit_wallets enable row level security;
alter table credit_transactions enable row level security;
drop policy if exists "cw_own" on credit_wallets;
drop policy if exists "ct_own" on credit_transactions;
create policy "cw_own" on credit_wallets for select using (auth.uid() = user_id);
create policy "ct_own" on credit_transactions for select using (auth.uid() = user_id);

-- jackpot (leitura pública do pool; escritos via service role ou funções security definer)
alter table jackpot_pool enable row level security;
alter table jackpot_draws enable row level security;
alter table jackpot_entries enable row level security;
drop policy if exists "jp_read" on jackpot_pool;
drop policy if exists "jd_read" on jackpot_draws;
drop policy if exists "je_read" on jackpot_entries;
create policy "jp_read" on jackpot_pool for select using (true);
create policy "jd_read" on jackpot_draws for select using (true);
create policy "je_read" on jackpot_entries for select using (true);

-- notifications
alter table notifications enable row level security;
drop policy if exists "n_own" on notifications;
drop policy if exists "n_admin_insert" on notifications;
create policy "n_own" on notifications for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "n_admin_insert" on notifications for insert with check (
  exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
);

-- broadcasts
alter table broadcasts enable row level security;
drop policy if exists "bc_read" on broadcasts;
drop policy if exists "bc_ins" on broadcasts;
create policy "bc_read" on broadcasts for select using (true);
create policy "bc_ins" on broadcasts for insert with check (auth.uid() = sent_by);

-- site_follows
alter table site_follows enable row level security;
drop policy if exists "sf_select" on site_follows;
drop policy if exists "sf_insert" on site_follows;
drop policy if exists "sf_delete" on site_follows;
create policy "sf_select" on site_follows for select using (true);
create policy "sf_insert" on site_follows for insert with check (follower_id = auth.uid());
create policy "sf_delete" on site_follows for delete using (follower_id = auth.uid());

-- site_categories / directory_profile_types / ad_pricing_benchmarks
alter table site_categories enable row level security;
alter table directory_profile_types enable row level security;
alter table ad_pricing_benchmarks enable row level security;
drop policy if exists "sc_read" on site_categories;
drop policy if exists "dpt_read" on directory_profile_types;
drop policy if exists "bench_read" on ad_pricing_benchmarks;
create policy "sc_read" on site_categories for select using (true);
create policy "dpt_read" on directory_profile_types for select using (true);
create policy "bench_read" on ad_pricing_benchmarks for select using (true);

-- Ads
alter table ad_proposals enable row level security;
alter table ad_proposal_targets enable row level security;
alter table ad_campaigns enable row level security;

drop policy if exists "ap_insert" on ad_proposals;
drop policy if exists "ap_update" on ad_proposals;
drop policy if exists "ap_select_adv" on ad_proposals;
drop policy if exists "ap_owner" on ad_proposals;
create policy "ap_insert" on ad_proposals for insert with check (advertiser_user_id = auth.uid());
create policy "ap_update" on ad_proposals for update using (advertiser_user_id = auth.uid());
create policy "ap_select_adv" on ad_proposals for select using (advertiser_user_id = auth.uid());
create policy "ap_owner" on ad_proposals for select using (
  exists (
    select 1 from ad_proposal_targets t
    where t.proposal_id = ad_proposals.id
      and exists (select 1 from mini_sites m where m.id = t.site_id and m.user_id = auth.uid())
  )
);

drop policy if exists "apt_insert" on ad_proposal_targets;
drop policy if exists "apt_adv_sel" on ad_proposal_targets;
drop policy if exists "apt_site_owner" on ad_proposal_targets;
drop policy if exists "apt_site_owner_upd" on ad_proposal_targets;
create policy "apt_insert" on ad_proposal_targets for insert with check (
  exists (select 1 from ad_proposals p where p.id = proposal_id and p.advertiser_user_id = auth.uid())
);
create policy "apt_adv_sel" on ad_proposal_targets for select using (
  exists (select 1 from ad_proposals p where p.id = proposal_id and p.advertiser_user_id = auth.uid())
);
create policy "apt_site_owner" on ad_proposal_targets for select using (
  exists (select 1 from mini_sites m where m.id = site_id and m.user_id = auth.uid())
);
create policy "apt_site_owner_upd" on ad_proposal_targets for update using (
  exists (select 1 from mini_sites m where m.id = site_id and m.user_id = auth.uid())
);

drop policy if exists "ac_site" on ad_campaigns;
drop policy if exists "ac_adv" on ad_campaigns;
create policy "ac_site" on ad_campaigns for select using (
  exists (select 1 from mini_sites m where m.id = site_id and m.user_id = auth.uid())
);
create policy "ac_adv" on ad_campaigns for select using (
  exists (select 1 from ad_proposals p where p.id = proposal_id and p.advertiser_user_id = auth.uid())
);

-- Permissões RPC
grant execute on function add_to_jackpot(numeric, integer) to service_role;
grant execute on function run_jackpot_draw(uuid) to authenticated;

-- Reaplica grants em tudo o que foi criado (PostgREST / cliente anon + authenticated)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant execute on all functions in schema public to postgres, anon, authenticated, service_role;

-- =============================================================================
-- Fim. Mensagem de estado
-- =============================================================================
select 'Reset + schema aplicados. Recarrega o schema na API do Supabase.' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-stripe-tables.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-mini-sites-multi-per-user.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Permite vários mini_sites por utilizador (ex.: conta admin).
-- Executar no SQL Editor do Supabase (produção) uma vez.
-- O slug continua único globalmente na tabela mini_sites.

drop index if exists uq_mini_sites_one_per_user;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-mini-sites-editor-columns.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- TrustBank — Colunas que o EDITOR envia ao gravar (mini_sites)
-- Executa ISTO no Supabase SQL Editor se aparecer erro tipo:
--   "Could not find the 'banner_fit' column of 'mini_sites' in the schema cache"
-- Depois: Settings → API → "Reload schema" ou espera 1–2 min.

-- Banner / layout
alter table if exists mini_sites add column if not exists banner_focus_x integer default 50;
alter table if exists mini_sites add column if not exists banner_focus_y integer default 50;
alter table if exists mini_sites add column if not exists banner_zoom integer default 100;
alter table if exists mini_sites add column if not exists banner_fit text default 'cover';
alter table if exists mini_sites add column if not exists banner_placeholder_enabled boolean default true;
alter table if exists mini_sites add column if not exists banner_placeholder_color text default '#1f2937';

-- SEO / páginas / módulos
alter table if exists mini_sites add column if not exists seo_title text;
alter table if exists mini_sites add column if not exists seo_description text;
alter table if exists mini_sites add column if not exists seo_og_image text;
alter table if exists mini_sites add column if not exists seo_search_tags text[] default '{}'::text[];
alter table if exists mini_sites add column if not exists seo_json_ld text;

-- Avatar vivo (IA + TTS API + visemes no browser)
alter table if exists mini_sites add column if not exists lively_avatar_enabled boolean default false;
alter table if exists mini_sites add column if not exists lively_avatar_model text default 'neo';
alter table if exists mini_sites add column if not exists lively_avatar_welcome text;
alter table if exists mini_sites add column if not exists lively_avatar_nft_verified_at timestamptz;
alter table if exists mini_sites add column if not exists lively_central_magic boolean default false;
alter table if exists mini_sites add column if not exists lively_floating_preset text default 'classic';
alter table if exists mini_sites add column if not exists lively_floating_expressive boolean default false;
alter table if exists mini_sites add column if not exists lively_dual_agent boolean default false;
alter table if exists mini_sites add column if not exists lively_agent_instructions text;
alter table if exists mini_sites add column if not exists lively_elevenlabs_voice_owner text;
alter table if exists mini_sites add column if not exists lively_elevenlabs_voice_agent text;
alter table if exists mini_sites add column if not exists lively_trial_started_at timestamptz;
alter table if exists mini_sites add column if not exists ia_credits_balance numeric(14,4) default 0;
alter table if exists mini_sites add column if not exists lively_premium_nft_verified_at timestamptz;
alter table if exists mini_sites add column if not exists page_modules jsonb default '{}'::jsonb;
alter table if exists mini_sites add column if not exists site_pages text;
alter table if exists mini_sites add column if not exists page_width integer default 600;
alter table if exists mini_sites add column if not exists page_contents text;

-- Trial
alter table if exists mini_sites add column if not exists trial_publish_until timestamptz;
alter table if exists mini_sites add column if not exists trial_grace_until timestamptz;
alter table if exists mini_sites add column if not exists trial_notice_sent_at timestamptz;

-- Ticker
alter table if exists mini_sites add column if not exists ticker_enabled boolean default true;
alter table if exists mini_sites add column if not exists ticker_items jsonb default '[]'::jsonb;

-- CV (o editor grava estes campos; jsonb = listas estruturadas)
-- cv_skills: se a tua base já tiver cv_skills com outro tipo, esta linha é ignorada.
alter table if exists mini_sites add column if not exists cv_skills text[] default '{}'::text[];
alter table if exists mini_sites add column if not exists cv_location text;
alter table if exists mini_sites add column if not exists cv_experience jsonb default '[]'::jsonb;
alter table if exists mini_sites add column if not exists cv_education jsonb default '[]'::jsonb;
alter table if exists mini_sites add column if not exists cv_projects jsonb default '[]'::jsonb;
alter table if exists mini_sites add column if not exists cv_languages jsonb default '[]'::jsonb;
alter table if exists mini_sites add column if not exists cv_certificates jsonb default '[]'::jsonb;
alter table if exists mini_sites add column if not exists cv_contact_whatsapp text;
alter table if exists mini_sites add column if not exists cv_hire_price numeric default 0;
alter table if exists mini_sites add column if not exists cv_hire_currency text default 'USD';
alter table if exists mini_sites add column if not exists cv_hire_type text default 'hour';
alter table if exists mini_sites add column if not exists cv_free boolean default false;
alter table if exists mini_sites add column if not exists cv_contact_locked boolean not null default false;
alter table if exists mini_sites add column if not exists section_order jsonb default '["summary","experience","education","skills","projects","languages","certificates","contact"]'::jsonb;

-- Feed / módulos (string JSON no editor)
alter table if exists mini_sites add column if not exists show_feed boolean default true;
alter table if exists mini_sites add column if not exists feed_cols integer default 1;
alter table if exists mini_sites add column if not exists module_order text;
alter table if exists mini_sites add column if not exists show_cv boolean default false;
alter table if exists mini_sites add column if not exists youtube_channel_id text;
alter table if exists mini_sites add column if not exists wallet_address text;

-- Marketplace / diretório (se ainda não correras o script maior)
alter table if exists mini_sites add column if not exists site_category_slug text;
alter table if exists mini_sites add column if not exists directory_profile_slug text;
alter table if exists mini_sites add column if not exists follower_count integer not null default 0;
alter table if exists mini_sites add column if not exists ad_asking_price_usdc numeric;
alter table if exists mini_sites add column if not exists ad_show_price_public boolean default true;
alter table if exists mini_sites add column if not exists ad_notes text;

-- Stripe Connect (paywall vídeo + CV)
alter table if exists mini_sites add column if not exists stripe_connect_account_id text;
alter table if exists mini_sites add column if not exists stripe_connect_charges_enabled boolean default false;
alter table if exists mini_sites add column if not exists stripe_connect_payouts_enabled boolean default false;
create index if not exists idx_mini_sites_stripe_connect_account on mini_sites (stripe_connect_account_id) where stripe_connect_account_id is not null;

-- Laboratório de Identidade (InstantID + clone ElevenLabs + efeito de voz no browser)
alter table if exists mini_sites add column if not exists identity_style_preset text;
alter table if exists mini_sites add column if not exists identity_portrait_url text;
alter table if exists mini_sites add column if not exists identity_clone_voice_id text;
alter table if exists mini_sites add column if not exists identity_voice_effect text default 'neutral';
alter table if exists mini_sites add column if not exists magic_portrait_enabled boolean default false;

-- Agenda / reservas (evita erro: Could not find the 'booking_enabled' column…)
-- Tabela site_bookings: ver supabase-site-booking.sql se ainda não existir.
alter table if exists mini_sites add column if not exists booking_enabled boolean default false;
alter table if exists mini_sites add column if not exists booking_slot_minutes integer default 30;
alter table if exists mini_sites add column if not exists booking_timezone text default 'America/Sao_Paulo';
alter table if exists mini_sites add column if not exists booking_weekly_hours jsonb default '{"mon":[{"from":"09:00","to":"18:00"}],"tue":[{"from":"09:00","to":"18:00"}],"wed":[{"from":"09:00","to":"18:00"}],"thu":[{"from":"09:00","to":"18:00"}],"fri":[{"from":"09:00","to":"18:00"}],"sat":[],"sun":[]}'::jsonb;
alter table if exists mini_sites add column if not exists booking_services jsonb default '[{"label":"Consultation","minutes":30}]'::jsonb;
alter table if exists mini_sites add column if not exists booking_vertical text default 'general';

-- feed_posts (se faltar)
alter table if exists feed_posts add column if not exists media_urls jsonb default '[]'::jsonb;
alter table if exists feed_posts add column if not exists video_embed_url text;

select 'mini_sites + feed_posts: colunas do editor verificadas.' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-stripe-connect-columns.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Stripe Connect (criador recebe paywall 70% e CV 50% via Transfer)
-- Nota: supabase-minisite-mystic-tarot-loteria.sql já faz estes ALTER em mini_sites;
-- este ficheiro é idempotente (podes correr os dois sem problema).
alter table if exists mini_sites add column if not exists stripe_connect_account_id text;
alter table if exists mini_sites add column if not exists stripe_connect_charges_enabled boolean not null default false;
alter table if exists mini_sites add column if not exists stripe_connect_payouts_enabled boolean not null default false;

create index if not exists idx_mini_sites_stripe_acct on mini_sites (stripe_connect_account_id) where stripe_connect_account_id is not null;

select 'mini_sites: Stripe Connect columns OK' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-lively-avatar.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Avatar vivo (IA + TTS + visemes no cliente). Gate opcional via NFT (ver API verify-nft).
alter table if exists mini_sites add column if not exists lively_avatar_enabled boolean default false;
alter table if exists mini_sites add column if not exists lively_avatar_model text default 'neo';
alter table if exists mini_sites add column if not exists lively_avatar_welcome text;
alter table if exists mini_sites add column if not exists lively_avatar_nft_verified_at timestamptz;

comment on column mini_sites.lively_avatar_enabled is 'Mostra assistente com avatar animado no mini-site público';
comment on column mini_sites.lively_avatar_model is 'Preset visual: neo | aria | sol | zen';
comment on column mini_sites.lively_avatar_welcome is 'Mensagem inicial do assistente (opcional)';
comment on column mini_sites.lively_avatar_nft_verified_at is 'Última verificação on-chain do NFT TrustBank (gate)';

-- v2: dual-agent, ElevenLabs, créditos, trial 40min, preset flutuante premium
alter table if exists mini_sites add column if not exists lively_central_magic boolean default false;
alter table if exists mini_sites add column if not exists lively_floating_preset text default 'classic';
alter table if exists mini_sites add column if not exists lively_floating_expressive boolean default false;
alter table if exists mini_sites add column if not exists lively_dual_agent boolean default false;
alter table if exists mini_sites add column if not exists lively_agent_instructions text;
alter table if exists mini_sites add column if not exists lively_elevenlabs_voice_owner text;
alter table if exists mini_sites add column if not exists lively_elevenlabs_voice_agent text;
alter table if exists mini_sites add column if not exists lively_trial_started_at timestamptz;
alter table if exists mini_sites add column if not exists ia_credits_balance numeric(14,4) default 0;
alter table if exists mini_sites add column if not exists lively_premium_nft_verified_at timestamptz;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-lively-floating-expressive.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- TrustBank — Gestos expressivos no agente flutuante (polegar + peek forte)
-- Executa no Supabase SQL Editor se o editor falhar ao gravar lively_floating_expressive.

alter table if exists mini_sites add column if not exists lively_floating_expressive boolean default false;

comment on column mini_sites.lively_floating_expressive is 'Lively: após resposta do chat, animação extra + polegar no canto.';


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-lively-profile-speaking.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Avatar animado no perfil + textos de fala (TTS via rotas existentes).
alter table if exists mini_sites add column if not exists lively_profile_as_avatar boolean default false;
alter table if exists mini_sites add column if not exists lively_profile_speak_on_entry boolean default true;
alter table if exists mini_sites add column if not exists lively_profile_speech_tap text;
alter table if exists mini_sites add column if not exists lively_profile_speech_before_reply text;

comment on column mini_sites.lively_profile_as_avatar is 'Mostrar rosto animado do assistente no lugar da foto quando Lively ativo.';
comment on column mini_sites.lively_profile_speak_on_entry is 'TTS da mensagem de boas-vindas ao carregar a página.';
comment on column mini_sites.lively_profile_speech_tap is 'Texto opcional falado ao tocar no avatar do perfil.';
comment on column mini_sites.lively_profile_speech_before_reply is 'Texto opcional falado antes de cada resposta do chat.';


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-editor-seo-extra.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- SEO extra: tags de pesquisa (long-tail) e JSON-LD opcional definido pelo criador
ALTER TABLE mini_sites ADD COLUMN IF NOT EXISTS seo_search_tags text[] DEFAULT '{}';
ALTER TABLE mini_sites ADD COLUMN IF NOT EXISTS seo_json_ld text;

COMMENT ON COLUMN mini_sites.seo_search_tags IS 'Frases-chave / nicho para meta keywords e contexto SEO';
COMMENT ON COLUMN mini_sites.seo_json_ld IS 'JSON-LD extra (Schema.org) — objeto ou array; fundido com Person base no layout público';


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-ai-usd-budget.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Orçamento IA em USD por mini-site: tier promocional (default 0) + saldo pago (top-up /creditos).
alter table if exists mini_sites
  add column if not exists ai_free_usd_remaining numeric(14, 4) default 0;

alter table if exists mini_sites
  add column if not exists ai_paid_usd_balance numeric(14, 4) default 0;

update mini_sites
set ai_free_usd_remaining = coalesce(ai_free_usd_remaining, 0)
where ai_free_usd_remaining is null;

update mini_sites
set ai_paid_usd_balance = coalesce(ai_paid_usd_balance, 0)
where ai_paid_usd_balance is null;

comment on column mini_sites.ai_free_usd_remaining is 'USD tier promocional (default 0; opcional via IA_FREE_USD_PER_SITE / backoffice).';
comment on column mini_sites.ai_paid_usd_balance is 'Saldo IA comprado (USD úteis creditados após pagamento).';


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-ai-free-usd-zero-default.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove crédito USD gratuito por defeito (antes ~2): novos registos = 0; zera saldo “free” existente.
-- Saldo pago (ai_paid_usd_balance) não é alterado. Comprar IA: /creditos

alter table if exists mini_sites
  alter column ai_free_usd_remaining set default 0;

update mini_sites
set ai_free_usd_remaining = 0
where coalesce(ai_free_usd_remaining, 0) > 0;

comment on column mini_sites.ai_free_usd_remaining is 'USD tier promocional (default 0). Compras: ai_paid_usd_balance via /creditos.';


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-analytics-dashboard.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Analytics melhorados: geo nas visitas/cliques, views no feed, views por página.
-- Executar no SQL Editor do Supabase após o schema base.

-- Visitas: cidade (país já existia em supabase-additions)
alter table if exists site_visits add column if not exists city text;

-- Cliques em links: origem + geo
alter table if exists site_link_clicks add column if not exists referrer text;
alter table if exists site_link_clicks add column if not exists country text;
alter table if exists site_link_clicks add column if not exists city text;

-- Uma linha por impressão de post no feed (visitante)
create table if not exists feed_post_views (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references feed_posts(id) on delete cascade,
  site_id uuid not null references mini_sites(id) on delete cascade,
  referrer text,
  country text,
  city text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now()
);

create index if not exists idx_feed_post_views_post on feed_post_views(post_id);
create index if not exists idx_feed_post_views_site on feed_post_views(site_id);
create index if not exists idx_feed_post_views_created on feed_post_views(created_at desc);

alter table feed_post_views enable row level security;
drop policy if exists "fpv_select_owner" on feed_post_views;
drop policy if exists "fpv_insert_public" on feed_post_views;
create policy "fpv_select_owner" on feed_post_views for select using (
  exists (select 1 from mini_sites m where m.id = feed_post_views.site_id and m.user_id = auth.uid())
);
create policy "fpv_insert_public" on feed_post_views for insert with check (true);

-- Abertura de página/tab do mini-site
create table if not exists site_page_views (
  id uuid default gen_random_uuid() primary key,
  site_id uuid not null references mini_sites(id) on delete cascade,
  page_id text not null,
  slug text,
  referrer text,
  device text,
  country text,
  city text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now()
);

create index if not exists idx_site_page_views_site on site_page_views(site_id);
create index if not exists idx_site_page_views_site_page on site_page_views(site_id, page_id);
create index if not exists idx_site_page_views_created on site_page_views(created_at desc);

alter table site_page_views enable row level security;
drop policy if exists "spv_select_owner" on site_page_views;
drop policy if exists "spv_insert_public" on site_page_views;
create policy "spv_select_owner" on site_page_views for select using (
  exists (select 1 from mini_sites m where m.id = site_page_views.site_id and m.user_id = auth.uid())
);
create policy "spv_insert_public" on site_page_views for insert with check (true);

select 'supabase-analytics-dashboard.sql aplicado.' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-site-booking.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Agenda / consultas no mini-site + tabela de reservas
-- Executar no SQL Editor do Supabase após schema base.

alter table mini_sites add column if not exists booking_enabled boolean default false;
alter table mini_sites add column if not exists booking_slot_minutes integer default 30;
alter table mini_sites add column if not exists booking_timezone text default 'America/Sao_Paulo';
alter table mini_sites add column if not exists booking_weekly_hours jsonb default '{"mon":[{"from":"09:00","to":"18:00"}],"tue":[{"from":"09:00","to":"18:00"}],"wed":[{"from":"09:00","to":"18:00"}],"thu":[{"from":"09:00","to":"18:00"}],"fri":[{"from":"09:00","to":"18:00"}],"sat":[],"sun":[]}'::jsonb;
alter table mini_sites add column if not exists booking_services jsonb default '[{"label":"Consultation","minutes":30}]'::jsonb;
alter table mini_sites add column if not exists booking_vertical text default 'general';

create table if not exists site_bookings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references mini_sites (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  visitor_name text,
  visitor_email text not null,
  visitor_phone text,
  service_label text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_site_bookings_site_starts on site_bookings (site_id, starts_at);

alter table site_bookings enable row level security;

drop policy if exists "site_bookings_select_own" on site_bookings;
drop policy if exists "site_bookings_update_own" on site_bookings;
drop policy if exists "site_bookings_delete_own" on site_bookings;

create policy "site_bookings_select_own" on site_bookings
  for select using (
    exists (select 1 from mini_sites m where m.id = site_bookings.site_id and m.user_id = auth.uid())
  );

create policy "site_bookings_update_own" on site_bookings
  for update using (
    exists (select 1 from mini_sites m where m.id = site_bookings.site_id and m.user_id = auth.uid())
  );

create policy "site_bookings_delete_own" on site_bookings
  for delete using (
    exists (select 1 from mini_sites m where m.id = site_bookings.site_id and m.user_id = auth.uid())
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-magic-portrait-boost.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Retrato Mágico + Boost patrocinado (empresa → campanha → áudio com clone do criador)
-- Executar no SQL Editor do Supabase após supabase-marketplace-ads.sql

alter table if exists mini_sites add column if not exists magic_portrait_enabled boolean default false;

alter table if exists ad_proposals add column if not exists magic_brand_color text;
alter table if exists ad_proposals add column if not exists magic_product_label text;
alter table if exists ad_proposals add column if not exists magic_tone text default 'professional';
-- wild_monkey | professional
alter table if exists ad_proposals add column if not exists magic_script text;

alter table if exists ad_campaigns add column if not exists magic_boost jsonb default null;
-- Ex.: { "brandColor": "#ff00aa", "productLabel": "Cola X", "tone": "professional", "scriptRaw": "...", "polishedScript": "...", "ttsPublicUrl": "https://..." }

select 'magic_portrait + ad magic fields OK' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-mini-site-byok.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Chave API DeepSeek por mini-site (BYOK). Apenas o backend (service role) lê/escreve.
-- Executar no SQL Editor do Supabase após mini_sites existir.

create table if not exists public.mini_site_ai_secrets (
  site_id uuid primary key references public.mini_sites (id) on delete cascade,
  deepseek_api_enc text not null,
  updated_at timestamptz not null default now()
);

create index if not exists mini_site_ai_secrets_updated_at_idx on public.mini_site_ai_secrets (updated_at desc);

alter table public.mini_site_ai_secrets enable row level security;

-- Sem políticas para anon/authenticated: cliente nunca acede; service role ignora RLS.


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-minisite-mystic-tarot-loteria.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- MINI-SITE PAGO: TARÔ + LOTERIA PREMIUM (esotérico) — PostgreSQL / Supabase
-- =============================================================================
-- 1) Abre o Supabase → SQL Editor → New query
-- 2) Cola ESTE ficheiro INTEIRO
-- 3) Clica RUN (ou Ctrl+Enter)
--
-- Se der erro: copia a mensagem. "mini_sites" tem de existir antes (é o teu core).
--
-- Este script cobre o PACOTE MÍSTICO + mínimo Stripe usado pelo mesmo fluxo:
--   • checkout_pending (+ stripe_connect_account_id)
--   • stripe_webhook_events (idempotência do webhook — sem isto o /api/webhook/stripe falha)
--   • mini_sites: colunas Stripe Connect (onboarding / cobrança directa)
--   • mini_sites: mystic_* (preços + toggle)
--   • mystic_entitlements + RLS + consume_mystic_entitlement
--
-- FORA deste ficheiro (resto da app): cv_unlocks, subscriptions, slug_registrations,
-- company_cv_directory_access, etc. → supabase-stripe-tables.sql ou schema-completo.
-- =============================================================================

-- ── 0) checkout_pending (carrinho / Stripe) — user_id só UUID, sem FK --------
create table if not exists public.checkout_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lines jsonb not null,
  stripe_checkout_session_id text,
  fulfilled boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_checkout_pending_session on public.checkout_pending (stripe_checkout_session_id);
create index if not exists idx_checkout_pending_user on public.checkout_pending (user_id);

alter table if exists public.checkout_pending add column if not exists stripe_connect_account_id text;

-- ── 0b) Webhook Stripe (evita processar o mesmo evento 2×) ---------------------
create table if not exists public.stripe_webhook_events (
  id text primary key,
  created_at timestamptz default now()
);

-- ── 0c) Stripe Connect em mini_sites (conta do criador / charges) ------------
alter table if exists public.mini_sites add column if not exists stripe_connect_account_id text;
alter table if exists public.mini_sites add column if not exists stripe_connect_charges_enabled boolean not null default false;
alter table if exists public.mini_sites add column if not exists stripe_connect_payouts_enabled boolean not null default false;

create index if not exists idx_mini_sites_stripe_acct on public.mini_sites (stripe_connect_account_id)
  where stripe_connect_account_id is not null;

-- ── 1) Colunas no editor do mini-site (preços + toggle) -----------------------
alter table if exists public.mini_sites add column if not exists mystic_public_enabled boolean not null default false;
alter table if exists public.mini_sites add column if not exists mystic_tarot_price_usd numeric(10, 2) default 4.99;
alter table if exists public.mini_sites add column if not exists mystic_lottery_premium_price_usd numeric(10, 2) default 2.99;

-- ── 2) Tabela de compras / resultados (tarô + loteria_premium) ----------------
create table if not exists public.mystic_entitlements (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  site_id uuid not null references public.mini_sites (id) on delete cascade,
  service text not null check (service in ('tarot', 'lottery_premium')),
  uses_remaining int not null default 1 check (uses_remaining >= 0),
  payment_ref text,
  created_at timestamptz default now()
);

alter table if exists public.mystic_entitlements add column if not exists result_text text;
alter table if exists public.mystic_entitlements add column if not exists result_payload jsonb;

create index if not exists idx_mystic_ent_buyer_site on public.mystic_entitlements (buyer_id, site_id);
create index if not exists idx_mystic_ent_service on public.mystic_entitlements (buyer_id, site_id, service) where uses_remaining > 0;
create index if not exists idx_mystic_ent_payment on public.mystic_entitlements (buyer_id, payment_ref);

alter table public.mystic_entitlements enable row level security;

drop policy if exists "mystic_ent_read_own" on public.mystic_entitlements;
create policy "mystic_ent_read_own" on public.mystic_entitlements
  for select using (auth.uid() = buyer_id);

-- ── 3) Função: gastar 1 crédito (leitura manual após compra antiga) ------------
create or replace function public.consume_mystic_entitlement(p_site_id uuid, p_service text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_service not in ('tarot', 'lottery_premium') then
    raise exception 'invalid service';
  end if;

  select e.id into rid
  from public.mystic_entitlements e
  where e.buyer_id = auth.uid()
    and e.site_id = p_site_id
    and e.service = p_service
    and e.uses_remaining > 0
  order by e.created_at asc
  limit 1
  for update;

  if rid is null then
    return false;
  end if;

  update public.mystic_entitlements set uses_remaining = uses_remaining - 1 where id = rid;
  return true;
end;
$$;

revoke all on function public.consume_mystic_entitlement(uuid, text) from public;
grant execute on function public.consume_mystic_entitlement(uuid, text) to authenticated;

-- =============================================================================
select
  'OK: mystic + checkout_pending + stripe_webhook_events + Connect + mystic_entitlements + RPC'
    as resultado;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-mystic-lottery.sql
-- ═══════════════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-slug-market-rpc.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Mercado de slugs: RPC sem depender do tipo composto da linha (evita conflitos ao reaplicar).
-- Idempotente: pode correr o script inteiro várias vezes no SQL Editor do Supabase.
-- Corrige cenários em que PostgREST acusa relação slug_registrations ↔ mini_sites no .select().

drop function if exists public.slug_market_listings(int, int);
drop function if exists public.slug_market_listings(int, int, uuid);
drop function if exists public.slug_market_listings_count();
drop function if exists public.slug_market_listings_count(uuid);

-- security definer: mercado público precisa de ver linhas de todos os vendedores (ver supabase-slug-market-rpc.sql).
create function public.slug_market_listings(p_offset int default 0, p_limit int default 500, p_owner_user_id uuid default null)
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
security definer
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
    and (p_owner_user_id is null or sr.user_id = p_owner_user_id)
  order by sr.sale_price asc nulls last
  offset greatest(0, p_offset)
  limit least(500, greatest(1, p_limit));
$$;

create function public.slug_market_listings_count(p_owner_user_id uuid default null)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.slug_registrations sr
  where sr.for_sale = true
    and sr.sale_price is not null
    and coalesce(sr.sale_price, 0) > 0
    and coalesce(sr.status, '') <> 'auction'
    and (p_owner_user_id is null or sr.user_id = p_owner_user_id);
$$;

grant execute on function public.slug_market_listings(int, int, uuid) to anon, authenticated;
grant execute on function public.slug_market_listings_count(uuid) to anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-cv-contact-locked.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- CV: bloquear só email/WhatsApp até desbloqueio (mesmo fluxo cv_unlocks / Stripe).
-- Executar no Supabase: SQL Editor → New query → colar → Run.
-- Se o editor ainda disser que a coluna não existe: Settings → API → Reload schema (ou espera ~1 min).

alter table if exists public.mini_sites
  add column if not exists cv_contact_locked boolean not null default false;

comment on column public.mini_sites.cv_contact_locked is
  'Se true, esconde contact_email e cv_contact_whatsapp no CV público até o visitante comprar o desbloqueio (cv_unlocks).';


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-plan-studio.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Linha legado `studio` em platform_plans (metadados / admin). Checkout actual: só `pro` (US$29,90/mês).
-- Mantém active = false. Bónus legado em pagamentos: `pro_ia` ou `studio` no webhook.

insert into platform_plans (name, slug, price_monthly, price_yearly, color, emoji, features, active, sort_order)
values (
  'Studio',
  'studio',
  39.9,
  399.9,
  '#22d3ee',
  '🤖',
  '[
    "Everything in Pro",
    "Legacy Studio tier — inactive in checkout",
    "Not sold separately; subscription is Pro only"
  ]'::jsonb,
  false,
  2
)
on conflict (slug) do update set
  name = excluded.name,
  color = excluded.color,
  emoji = excluded.emoji,
  features = excluded.features,
  active = false,
  sort_order = excluded.sort_order;

select 'platform_plans studio: upsert OK (active=false — checkout só Pro)' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-deactivate-studio-plan.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Cartão "Studio" separado desligado. Subscrição: plano `pro`; `pro_ia` só legado.
update platform_plans set active = false where lower(slug) = 'studio';
select 'studio plan card deactivated — checkout só Pro' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-plan-pro-pricing.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Pro: alinhado a `src/lib/platformPricing.ts` — US$29,90/mês; US$299,90/ano. Subscrição sem pack de IA incluído.

update platform_plans
set price_monthly = 29.90, price_yearly = 299.90, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';

select 'platform_plans pro: US$29.90/mo, US$299.90/yr — Pro sem bundle de IA na subscrição' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-jackpot-disable.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Desliga o jackpot na UI e nos boosts (mesmo campo que o admin / paymentFulfillment).
update public.jackpot_pool
set enabled = false, updated_at = now()
where id = '00000000-0000-0000-0000-000000000001'::uuid;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-storage-platform-assets-public-read.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Storage: leitura pública do bucket `platform-assets`
-- =============================================================================
-- Sem isto, imagens enviadas para páginas/feed (URLs públicas do Supabase) podem
-- falhar para visitantes anónimos se as políticas RLS do Storage não permitirem SELECT.
--
-- Pré-requisitos no Supabase Dashboard:
--   1. Criar o bucket `platform-assets` (se ainda não existir).
--   2. Marcar o bucket como público (Public bucket), para getPublicUrl funcionar.
--   3. Executar este SQL no SQL Editor (ajusta o nome da policy se já existir).
-- =============================================================================

drop policy if exists "Public read platform-assets" on storage.objects;

create policy "Public read platform-assets"
on storage.objects
for select
to public
using (bucket_id = 'platform-assets');

-- Upload (INSERT/UPDATE/DELETE): corre também supabase-storage-platform-assets-auth-upload.sql
-- para o editor / Identity Lab conseguirem gravar em `platform-assets` (caminho `{uid}/...`).


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-storage-platform-assets-auth-upload.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- =============================================================================
-- Storage: upload / update / delete no bucket `platform-assets` (utilizador autenticado)
-- =============================================================================
-- O editor grava em `platform-assets` com caminho `{auth.uid()}/{pasta}/ficheiro`.
-- Sem políticas INSERT/UPDATE/DELETE, o upload falha em silêncio ou com erro RLS.
--
-- Pré-requisitos: bucket `platform-assets` público (leitura) + política de SELECT
-- em supabase-storage-platform-assets-public-read.sql
-- =============================================================================

drop policy if exists "Authenticated insert own platform-assets" on storage.objects;
drop policy if exists "Authenticated update own platform-assets" on storage.objects;
drop policy if exists "Authenticated delete own platform-assets" on storage.objects;

create policy "Authenticated insert own platform-assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Authenticated update own platform-assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Authenticated delete own platform-assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);
