-- Pro: alinhado a `src/lib/platformPricing.ts` — US$29,90/mês; US$299,90/ano. Subscrição sem pack de IA incluído.

update platform_plans
set price_monthly = 29.90, price_yearly = 299.90, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';

select 'platform_plans pro: US$29.90/mo, US$299.90/yr — Pro sem bundle de IA na subscrição' as status;
