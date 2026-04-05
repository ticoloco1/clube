-- TrustBank — Validação de schema (somente leitura)
-- (Cópia PT do mesmo ficheiro: supabase-validacao-schema.sql)
-- Roda no SQL Editor do Supabase. Não altera dados.
-- Se alguma linha aparecer abaixo, aplica o script em "sugestao".
--
-- Atalhos (gerar na raiz do repo):
--   bash scripts/build-supabase-all-in-one.sh      → supabase-all-in-one.sql (inclui completo; apaga public)
--   bash scripts/build-supabase-patches-only.sh   → supabase-patches-only.sql (só patches; BD já com completo)
--
-- Ordem sugerida (instalação incremental após auth + mini_sites base):
--   1) supabase-schema-completo.sql  (núcleo)
--   2) supabase-mini-sites-editor-columns.sql  (colunas que o editor grava)
--   3) supabase-stripe-connect-columns.sql
--   4) supabase-lively-avatar.sql, supabase-lively-floating-expressive.sql, supabase-lively-profile-speaking.sql, supabase-lively-tts-provider.sql
--   5) supabase-editor-seo-extra.sql
--   6) supabase-ai-usd-budget.sql, supabase-ai-free-usd-zero-default.sql (opcional)
--   7) supabase-analytics-dashboard.sql  (site_page_views, feed_post_views)
--   8) supabase-site-booking.sql
--   9) supabase-magic-portrait-boost.sql
--  10) supabase-mini-site-byok.sql
--  11) supabase-minisite-mystic-tarot-loteria.sql (+ supabase-mystic-*.sql se usares loteria extra)
--  12) supabase-cv-contact-locked.sql  (se cv_contact_locked não veio do passo 2)
--  13) supabase-storage-platform-assets-public-read.sql  (bucket Storage, não é tabela public)
--  14) supabase-slug-market-rpc.sql  (opcional)
--  15) supabase-plan-pro-pricing.sql, supabase-deactivate-studio-plan.sql (planos / preços)
--  Fora do Postgres: Stripe webhook, env BYOK_ENCRYPTION_SECRET, DEEPSEEK_API_KEY, etc.

-- ── 1) Tabelas que o app costuma usar ─────────────────────────────────────
WITH esperadas(tabela, script_sugestao) AS (
  VALUES
    ('mini_sites', 'supabase-schema-completo.sql'),
    ('mini_site_links', 'supabase-schema-completo.sql'),
    ('mini_site_videos', 'supabase-schema-completo.sql'),
    ('feed_posts', 'supabase-schema-completo.sql'),
    ('slug_registrations', 'supabase-schema-completo.sql'),
    ('slug_auctions', 'supabase-schema-completo.sql ou supabase-additions.sql'),
    ('premium_slugs', 'supabase-schema-completo.sql'),
    ('subscriptions', 'supabase-schema-completo.sql'),
    ('platform_plans', 'supabase-additions.sql ou schema-completo'),
    ('platform_settings', 'supabase-schema-completo.sql'),
    ('checkout_pending', 'supabase-stripe-tables.sql ou minisite-mystic ou schema-completo'),
    ('slug_nft_mints', 'supabase-slug-nft-thirdweb.sql'),
    ('stripe_webhook_events', 'supabase-stripe-tables.sql ou minisite-mystic ou schema-completo'),
    ('credit_wallets', 'supabase-schema-completo.sql'),
    ('credit_transactions', 'supabase-schema-completo.sql'),
    ('paywall_unlocks', 'supabase-schema-completo.sql'),
    ('cv_unlocks', 'supabase-schema-completo.sql'),
    ('company_cv_directory_access', 'supabase-schema-completo.sql ou supabase-stripe-tables.sql'),
    ('boosts', 'supabase-schema-completo.sql'),
    ('site_boosts', 'supabase-schema-completo.sql'),
    ('jackpot_pool', 'supabase-schema-completo.sql'),
    ('jackpot_entries', 'supabase-schema-completo.sql'),
    ('site_visits', 'supabase-additions.sql ou schema-completo'),
    ('site_link_clicks', 'supabase-additions.sql ou schema-completo'),
    ('site_page_views', 'supabase-analytics-dashboard.sql'),
    ('feed_post_views', 'supabase-analytics-dashboard.sql'),
    ('site_follows', 'supabase-site-follows-ensure.sql (ou marketplace-ads / schema-completo)'),
    ('site_categories', 'supabase-marketplace-ads.sql ou schema-completo'),
    ('directory_profile_types', 'supabase-marketplace-ads.sql ou schema-completo'),
    ('ad_proposals', 'supabase-marketplace-ads.sql ou schema-completo'),
    ('ad_proposal_targets', 'supabase-marketplace-ads.sql ou schema-completo'),
    ('ad_campaigns', 'supabase-marketplace-ads.sql ou schema-completo'),
    ('classified_listings', 'supabase-schema-completo.sql'),
    ('user_roles', 'supabase-schema-completo.sql'),
    ('broadcasts', 'supabase-schema-completo.sql'),
    ('notifications', 'supabase-schema-completo.sql'),
    ('site_bookings', 'supabase-site-booking.sql'),
    ('mini_site_ai_secrets', 'supabase-mini-site-byok.sql'),
    ('mystic_entitlements', 'supabase-minisite-mystic-tarot-loteria.sql')
)
SELECT e.tabela AS tabela_faltando, e.script_sugestao AS sugestao
FROM esperadas e
WHERE NOT EXISTS (
  SELECT 1
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_name = e.tabela
)
ORDER BY 1;

-- ── 2) Colunas em mini_sites (editor + Lively + identidade + retrato mágico) ─
WITH esperadas(tabela, coluna) AS (
  VALUES
    ('mini_sites', 'banner_focus_x'),
    ('mini_sites', 'banner_focus_y'),
    ('mini_sites', 'banner_zoom'),
    ('mini_sites', 'banner_fit'),
    ('mini_sites', 'banner_placeholder_enabled'),
    ('mini_sites', 'banner_placeholder_color'),
    ('mini_sites', 'seo_title'),
    ('mini_sites', 'seo_description'),
    ('mini_sites', 'seo_og_image'),
    ('mini_sites', 'seo_search_tags'),
    ('mini_sites', 'seo_json_ld'),
    ('mini_sites', 'lively_avatar_enabled'),
    ('mini_sites', 'lively_avatar_model'),
    ('mini_sites', 'lively_avatar_welcome'),
    ('mini_sites', 'lively_profile_as_avatar'),
    ('mini_sites', 'lively_profile_speak_on_entry'),
    ('mini_sites', 'lively_profile_speech_tap'),
    ('mini_sites', 'lively_profile_speech_before_reply'),
    ('mini_sites', 'lively_tts_provider'),
    ('mini_sites', 'lively_avatar_nft_verified_at'),
    ('mini_sites', 'lively_central_magic'),
    ('mini_sites', 'lively_floating_preset'),
    ('mini_sites', 'lively_floating_expressive'),
    ('mini_sites', 'lively_dual_agent'),
    ('mini_sites', 'lively_agent_instructions'),
    ('mini_sites', 'lively_elevenlabs_voice_owner'),
    ('mini_sites', 'lively_elevenlabs_voice_agent'),
    ('mini_sites', 'lively_trial_started_at'),
    ('mini_sites', 'ia_credits_balance'),
    ('mini_sites', 'ai_free_usd_remaining'),
    ('mini_sites', 'ai_paid_usd_balance'),
    ('mini_sites', 'lively_premium_nft_verified_at'),
    ('mini_sites', 'page_modules'),
    ('mini_sites', 'site_pages'),
    ('mini_sites', 'page_width'),
    ('mini_sites', 'page_contents'),
    ('mini_sites', 'trial_publish_until'),
    ('mini_sites', 'trial_grace_until'),
    ('mini_sites', 'trial_notice_sent_at'),
    ('mini_sites', 'ticker_enabled'),
    ('mini_sites', 'ticker_items'),
    ('mini_sites', 'cv_skills'),
    ('mini_sites', 'cv_location'),
    ('mini_sites', 'cv_experience'),
    ('mini_sites', 'cv_education'),
    ('mini_sites', 'cv_projects'),
    ('mini_sites', 'cv_languages'),
    ('mini_sites', 'cv_certificates'),
    ('mini_sites', 'cv_contact_whatsapp'),
    ('mini_sites', 'cv_hire_price'),
    ('mini_sites', 'cv_hire_currency'),
    ('mini_sites', 'cv_hire_type'),
    ('mini_sites', 'cv_free'),
    ('mini_sites', 'section_order'),
    ('mini_sites', 'show_feed'),
    ('mini_sites', 'feed_cols'),
    ('mini_sites', 'module_order'),
    ('mini_sites', 'show_cv'),
    ('mini_sites', 'youtube_channel_id'),
    ('mini_sites', 'wallet_address'),
    ('mini_sites', 'site_category_slug'),
    ('mini_sites', 'directory_profile_slug'),
    ('mini_sites', 'follower_count'),
    ('mini_sites', 'ad_asking_price_usdc'),
    ('mini_sites', 'ad_show_price_public'),
    ('mini_sites', 'ad_notes'),
    ('mini_sites', 'stripe_connect_account_id'),
    ('mini_sites', 'stripe_connect_charges_enabled'),
    ('mini_sites', 'stripe_connect_payouts_enabled'),
    ('mini_sites', 'identity_style_preset'),
    ('mini_sites', 'identity_portrait_url'),
    ('mini_sites', 'identity_clone_voice_id'),
    ('mini_sites', 'identity_voice_effect'),
    ('mini_sites', 'magic_portrait_enabled')
)
SELECT e.tabela, e.coluna AS coluna_faltando, 'supabase-mini-sites-editor-columns.sql (ai_* também: supabase-ai-usd-budget.sql)' AS sugestao
FROM esperadas e
WHERE EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = e.tabela)
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = e.tabela
      AND c.column_name = e.coluna
  )
ORDER BY 1, 2;

-- ── 2b) mini_sites — agenda (booking) + tarô/loteria ───────────────────────
WITH esperadas(tabela, coluna, sugestao) AS (
  VALUES
    ('mini_sites', 'booking_enabled', 'supabase-site-booking.sql'),
    ('mini_sites', 'booking_slot_minutes', 'supabase-site-booking.sql'),
    ('mini_sites', 'booking_timezone', 'supabase-site-booking.sql'),
    ('mini_sites', 'booking_weekly_hours', 'supabase-site-booking.sql'),
    ('mini_sites', 'booking_services', 'supabase-site-booking.sql'),
    ('mini_sites', 'booking_vertical', 'supabase-site-booking.sql'),
    ('mini_sites', 'mystic_public_enabled', 'supabase-minisite-mystic-tarot-loteria.sql'),
    ('mini_sites', 'mystic_tarot_price_usd', 'supabase-minisite-mystic-tarot-loteria.sql'),
    ('mini_sites', 'mystic_lottery_premium_price_usd', 'supabase-minisite-mystic-tarot-loteria.sql'),
    ('mini_sites', 'cv_contact_locked', 'supabase-cv-contact-locked.sql ou supabase-mini-sites-editor-columns.sql')
)
SELECT e.tabela, e.coluna AS coluna_faltando, e.sugestao
FROM esperadas e
WHERE EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = e.tabela)
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = e.tabela
      AND c.column_name = e.coluna
  )
ORDER BY 1, 2;

-- ── 3) Colunas de anúncios (boost mágico) ─────────────────────────────────
WITH esperadas(tabela, coluna, sugestao) AS (
  VALUES
    ('ad_proposals', 'magic_brand_color', 'supabase-magic-portrait-boost.sql'),
    ('ad_proposals', 'magic_product_label', 'supabase-magic-portrait-boost.sql'),
    ('ad_proposals', 'magic_tone', 'supabase-magic-portrait-boost.sql'),
    ('ad_proposals', 'magic_script', 'supabase-magic-portrait-boost.sql'),
    ('ad_campaigns', 'magic_boost', 'supabase-magic-portrait-boost.sql')
)
SELECT e.tabela, e.coluna AS coluna_faltando, e.sugestao
FROM esperadas e
WHERE EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = e.tabela)
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = e.tabela
      AND c.column_name = e.coluna
  )
ORDER BY 1, 2;

-- ── 4) feed_posts (mídia rica) ────────────────────────────────────────────
WITH esperadas(tabela, coluna) AS (
  VALUES
    ('feed_posts', 'media_urls'),
    ('feed_posts', 'video_embed_url')
)
SELECT e.tabela, e.coluna AS coluna_faltando, 'supabase-mini-sites-editor-columns.sql' AS sugestao
FROM esperadas e
WHERE EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = e.tabela)
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = e.tabela
      AND c.column_name = e.coluna
  )
ORDER BY 1, 2;

-- ── 5) Funções RPC do mercado de slugs (opcional) ─────────────────────────
SELECT v.name AS funcao_faltando, 'supabase-slug-market-rpc.sql' AS sugestao
FROM (VALUES ('slug_market_listings'), ('slug_market_listings_count')) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = v.name
);

-- ── 6) Storage (manual no Dashboard) ─────────────────────────────────────
-- Bucket `platform-assets` + políticas: supabase-storage-platform-assets-public-read.sql
-- (não aparece em information_schema das tabelas public.)

-- Se todos os SELECTs 1–5 acima retornarem 0 linhas e o Storage estiver configurado,
-- o schema está alinhado com os scripts do repositório (módulos opcionais: loto/, jackpot admin).
