-- Orçamento IA em USD por mini-site: tier promocional (default 0) + saldo pago (top-up /creditos).
alter table if exists mini_sites
  add column if not exists ai_free_usd_remaining numeric(14, 4) default 0;

alter table if exists mini_sites
  add column if not exists ai_paid_usd_balance numeric(14, 4) default 0;

update mini_sites
set ai_free_usd_remaining = coalesce(ai_free_usd_remaining, 0)
where ai_free_usd_remaining is null;

update mini_sites
set ai_paid_usd_balance = coalesce(ai_paid_usd_balance, 0)
where ai_paid_usd_balance is null;

comment on column mini_sites.ai_free_usd_remaining is 'USD tier promocional (default 0; opcional via IA_FREE_USD_PER_SITE / backoffice).';
comment on column mini_sites.ai_paid_usd_balance is 'Saldo IA comprado (USD úteis creditados após pagamento).';
