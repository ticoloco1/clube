-- Pro: preços alinhados a `src/lib/platformPricing.ts` (Pro US$39,90/mês + toggle IA +US$10 na UI /planos).
-- Só a linha `pro` fica activa para o cartão na home; o pack IA é o item `pro_ia` no checkout.

update platform_plans
set price_monthly = 39.90, price_yearly = 398.99, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';

select 'platform_plans pro: US$39.90/mo, US$398.99/yr — usar /planos com IA +US$10 (pro_ia)' as status;
