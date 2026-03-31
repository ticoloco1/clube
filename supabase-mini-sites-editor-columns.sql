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

-- Marketplace / diretório (se ainda não correras o script maior)
alter table if exists mini_sites add column if not exists site_category_slug text;
alter table if exists mini_sites add column if not exists directory_profile_slug text;
alter table if exists mini_sites add column if not exists follower_count integer not null default 0;
alter table if exists mini_sites add column if not exists ad_asking_price_usdc numeric;
alter table if exists mini_sites add column if not exists ad_show_price_public boolean default true;
alter table if exists mini_sites add column if not exists ad_notes text;

-- feed_posts (se faltar)
alter table if exists feed_posts add column if not exists media_urls jsonb default '[]'::jsonb;
alter table if exists feed_posts add column if not exists video_embed_url text;

select 'mini_sites + feed_posts: colunas do editor verificadas.' as status;
