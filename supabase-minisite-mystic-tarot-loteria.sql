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
