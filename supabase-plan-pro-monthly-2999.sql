-- Legado: preferir `supabase-plan-pro-pricing.sql` (fonte única com `platformPricing.ts`).
update platform_plans
set price_monthly = 29.90, price_yearly = 299.90, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';
