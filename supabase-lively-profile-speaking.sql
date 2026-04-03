-- Avatar animado no perfil + textos de fala (TTS via rotas existentes).
alter table if exists mini_sites add column if not exists lively_profile_as_avatar boolean default false;
alter table if exists mini_sites add column if not exists lively_profile_speak_on_entry boolean default true;
alter table if exists mini_sites add column if not exists lively_profile_speech_tap text;
alter table if exists mini_sites add column if not exists lively_profile_speech_before_reply text;

comment on column mini_sites.lively_profile_as_avatar is 'Mostrar rosto animado do assistente no lugar da foto quando Lively ativo.';
comment on column mini_sites.lively_profile_speak_on_entry is 'TTS da mensagem de boas-vindas ao carregar a página.';
comment on column mini_sites.lively_profile_speech_tap is 'Texto opcional falado ao tocar no avatar do perfil.';
comment on column mini_sites.lively_profile_speech_before_reply is 'Texto opcional falado antes de cada resposta do chat.';
