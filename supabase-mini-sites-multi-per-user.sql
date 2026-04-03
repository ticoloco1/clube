-- Permite vários mini_sites por utilizador (ex.: conta admin).
-- Executar no SQL Editor do Supabase (produção) uma vez.
-- O slug continua único globalmente na tabela mini_sites.

drop index if exists uq_mini_sites_one_per_user;
