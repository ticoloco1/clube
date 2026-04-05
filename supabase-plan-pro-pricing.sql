-- Pro: alinhado a `src/lib/platformPricing.ts` — base US$26,90/mês; com IA US$39,90 (+US$13 no toggle /planos).
-- Só a linha `pro` fica activa para o cartão na home; o pack IA é o item `pro_ia` no checkout.

update platform_plans
set price_monthly = 26.90, price_yearly = 269.90, active = true
where lower(slug) = 'pro';

update platform_plans set active = false where lower(slug) <> 'pro';

select 'platform_plans pro: US$26.90/mo base, US$269.90/yr — Pro+IA US$39.90 (pro_ia)' as status;
