-- Legado: preços antigos. Usa `supabase-plan-pro-pricing.sql` (Pro US$26,90 base + IA opcional na UI).
-- Mantido para não partir links; executa o ficheiro novo para preços actuais.
update platform_plans
set price_monthly = 26.90, price_yearly = 269.90, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';
