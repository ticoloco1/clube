-- =============================================================================
-- TrustBank — PATCHES ONLY (sem schema-completo, gerado automaticamente)
-- Gerado por: scripts/build-supabase-patches-only.sh
-- Data: 2026-04-06T00:35:33Z
--
-- Usa quando JÁ tens supabase-schema-completo.sql aplicado e queres o resto
-- num único paste (não apaga o schema public).
--
-- Se ainda não tens o núcleo: corre primeiro supabase-schema-completo.sql,
-- ou usa supabase-all-in-one.sql num projeto NOVO (apaga public).
--
-- Depois: supabase-validacao-schema.sql
-- Storage: bucket 'platform-assets' no Dashboard se necessário.
-- =============================================================================


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
-- FILE: supabase-slug-nft-thirdweb.sql
-- ═══════════════════════════════════════════════════════════════════════════

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
-- FILE: supabase-site-follows-ensure.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Botão "Seguir" no mini-site público (SiteFollowButton → tabela site_follows).
-- Idempotente: seguro correr em produção se a tabela faltar ou RLS estiver incompleto.
-- Requer: public.mini_sites e auth.users (Supabase padrão).

alter table if exists public.mini_sites
  add column if not exists follower_count integer not null default 0;

update public.mini_sites set follower_count = 0 where follower_count is null;

create table if not exists public.site_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  site_id     uuid not null references public.mini_sites (id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, site_id)
);

create index if not exists idx_site_follows_site on public.site_follows (site_id);

create or replace function public.site_follows_sync_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.mini_sites set follower_count = coalesce(follower_count, 0) + 1 where id = new.site_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.mini_sites set follower_count = greatest(0, coalesce(follower_count, 0) - 1) where id = old.site_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_site_follows_count_ins on public.site_follows;
drop trigger if exists tr_site_follows_count_del on public.site_follows;
create trigger tr_site_follows_count_ins after insert on public.site_follows
  for each row execute function public.site_follows_sync_count();
create trigger tr_site_follows_count_del after delete on public.site_follows
  for each row execute function public.site_follows_sync_count();

alter table public.site_follows enable row level security;

drop policy if exists "sf_select" on public.site_follows;
drop policy if exists "sf_insert" on public.site_follows;
drop policy if exists "sf_delete" on public.site_follows;

create policy "sf_select" on public.site_follows for select using (true);
create policy "sf_insert" on public.site_follows for insert with check (follower_id = auth.uid());
create policy "sf_delete" on public.site_follows for delete using (follower_id = auth.uid());

select 'site_follows: tabela, triggers, RLS — OK' as status;


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
-- FILE: supabase-lively-tts-provider.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Voz do Lively: auto | openai (IA TTS) | elevenlabs
alter table if exists public.mini_sites
  add column if not exists lively_tts_provider text;

alter table if exists public.mini_sites
  drop constraint if exists mini_sites_lively_tts_provider_check;

alter table if exists public.mini_sites
  add constraint mini_sites_lively_tts_provider_check
  check (lively_tts_provider is null or lively_tts_provider in ('auto', 'openai', 'elevenlabs'));

comment on column public.mini_sites.lively_tts_provider is 'TTS do avatar: auto (Eleven se houver voice id, senão OpenAI), openai, elevenlabs.';


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

-- Linha legado `studio` em platform_plans (metadados / admin). Checkout actual: só `pro` (US$29,90/mês); IA via BYOK.
-- Mantém active = false para não voltar a mostrar cartão Studio na UI antiga. Bónus IA em pagamentos: `pro_ia` ou `studio` no webhook.

insert into platform_plans (name, slug, price_monthly, price_yearly, color, emoji, features, active, sort_order)
values (
  'Studio',
  'studio',
  39.9,
  399.9,
  '#22d3ee',
  '🤖',
  '[
    "Tudo do Pro",
    "Crédito IA mensal no mini-site (ver IA_STUDIO_BONUS_USD_PER_CYCLE)",
    "Trust Genesis Hub + Copilot DeepSeek",
    "Assistente Lively no site (avatar) + horários de agendamento",
    "Recarga extra IA: 2× o custo (margem 100%)"
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

select 'platform_plans studio: upsert OK (active=false — usar Pro + IA em /planos)' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-deactivate-studio-plan.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Cartão "Studio" separado desligado. Subscrição: plano `pro`; `pro_ia` só legado.
update platform_plans set active = false where lower(slug) = 'studio';
select 'studio plan card deactivated — use Pro + IA toggle on /planos' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- FILE: supabase-plan-pro-pricing.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- Pro: alinhado a `src/lib/platformPricing.ts` — US$29,90/mês; US$299,90/ano. Sem add-on IA na subscrição (BYOK).

update platform_plans
set price_monthly = 29.90, price_yearly = 299.90, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';

select 'platform_plans pro: US$29.90/mo, US$299.90/yr — IA via chave própria (BYOK), sem pack pago no plano' as status;


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
