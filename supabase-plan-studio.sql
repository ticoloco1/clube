-- Linha legado `studio` em platform_plans (metadados / admin). Checkout actual: só `pro` (US$29,90/mês).
-- Mantém active = false. Bónus legado em pagamentos: `pro_ia` ou `studio` no webhook.

insert into platform_plans (name, slug, price_monthly, price_yearly, color, emoji, features, active, sort_order)
values (
  'Studio',
  'studio',
  39.9,
  399.9,
  '#22d3ee',
  '🤖',
  '[
    "Everything in Pro",
    "Legacy Studio tier — inactive in checkout",
    "Not sold separately; subscription is Pro only"
  ]'::jsonb,
  false,
  2
)
on conflict (slug) do update set
  name = excluded.name,
  color = excluded.color,
  emoji = excluded.emoji,
  features = excluded.features,
  active = false,
  sort_order = excluded.sort_order;

select 'platform_plans studio: upsert OK (active=false — checkout só Pro)' as status;
