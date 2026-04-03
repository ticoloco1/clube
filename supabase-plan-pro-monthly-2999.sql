-- Pro only: $29.99/mo + yearly option; deactivate legacy extra tiers (e.g. Business $99).
update platform_plans
set price_monthly = 29.99, price_yearly = 288.00, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';
