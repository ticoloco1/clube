-- Remove crédito USD gratuito por defeito (antes ~2): novos registos = 0; zera saldo “free” existente.
-- Saldo pago (ai_paid_usd_balance) não é alterado. Comprar IA: /creditos

alter table if exists mini_sites
  alter column ai_free_usd_remaining set default 0;

update mini_sites
set ai_free_usd_remaining = 0
where coalesce(ai_free_usd_remaining, 0) > 0;

comment on column mini_sites.ai_free_usd_remaining is 'USD tier promocional (default 0). Compras: ai_paid_usd_balance via /creditos.';
