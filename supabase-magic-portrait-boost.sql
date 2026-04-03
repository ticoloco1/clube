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
