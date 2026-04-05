-- Pro: preços alinhados ao site (platformPricing.ts). Atualiza a linha `pro` na BD.
update platform_plans
set price_monthly = 26.90, price_yearly = 268.99, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';
