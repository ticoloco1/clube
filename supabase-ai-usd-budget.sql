-- Orçamento IA em USD por mini-site: US$2 grátis iniciais + saldo pago (top-up Stripe).
alter table if exists mini_sites
  add column if not exists ai_free_usd_remaining numeric(14, 4) default 2;

alter table if exists mini_sites
  add column if not exists ai_paid_usd_balance numeric(14, 4) default 0;

update mini_sites
set ai_free_usd_remaining = coalesce(ai_free_usd_remaining, 2)
where ai_free_usd_remaining is null;

update mini_sites
set ai_paid_usd_balance = coalesce(ai_paid_usd_balance, 0)
where ai_paid_usd_balance is null;

comment on column mini_sites.ai_free_usd_remaining is 'USD restantes do tier gratuito (ex. 2.00 inicial).';
comment on column mini_sites.ai_paid_usd_balance is 'Saldo IA comprado (USD úteis creditados após pagamento).';
