-- Voz do Lively: auto | openai (IA TTS) | elevenlabs
alter table if exists public.mini_sites
  add column if not exists lively_tts_provider text;

alter table if exists public.mini_sites
  drop constraint if exists mini_sites_lively_tts_provider_check;

alter table if exists public.mini_sites
  add constraint mini_sites_lively_tts_provider_check
  check (lively_tts_provider is null or lively_tts_provider in ('auto', 'openai', 'elevenlabs'));

comment on column public.mini_sites.lively_tts_provider is 'TTS do avatar: auto (Eleven se houver voice id, senão OpenAI), openai, elevenlabs.';
