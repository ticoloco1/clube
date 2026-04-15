-- Welcome video do avatar (Cloudflare R2 URL)
alter table if exists mini_sites
  add column if not exists lively_profile_welcome_video_url text;

alter table if exists mini_sites
  add column if not exists lively_profile_welcome_video_with_sound boolean default false;

comment on column mini_sites.lively_profile_welcome_video_url is
  'URL pública (R2) do vídeo curto de boas-vindas do avatar.';
comment on column mini_sites.lively_profile_welcome_video_with_sound is
  'true = tenta autoplay com som; false = autoplay mudo.';
