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
