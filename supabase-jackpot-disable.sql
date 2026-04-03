-- Desliga o jackpot na UI e nos boosts (mesmo campo que o admin / paymentFulfillment).
update public.jackpot_pool
set enabled = false, updated_at = now()
where id = '00000000-0000-0000-0000-000000000001'::uuid;
