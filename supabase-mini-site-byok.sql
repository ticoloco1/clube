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
