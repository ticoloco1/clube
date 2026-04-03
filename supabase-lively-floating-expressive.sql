-- TrustBank — Gestos expressivos no agente flutuante (polegar + peek forte)
-- Executa no Supabase SQL Editor se o editor falhar ao gravar lively_floating_expressive.

alter table if exists mini_sites add column if not exists lively_floating_expressive boolean default false;

comment on column mini_sites.lively_floating_expressive is 'Lively: após resposta do chat, animação extra + polegar no canto.';
