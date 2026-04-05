-- Legado: preços antigos. Usa `supabase-plan-pro-pricing.sql` (Pro US$39,90 + IA opcional na UI).
-- Mantido para não partir links; executa o ficheiro novo para preços actuais.
update platform_plans
set price_monthly = 39.90, price_yearly = 398.99, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';
