-- Linha legado `studio` em platform_plans (metadados / admin). Checkout actual: só `pro` (US$29,90/mês); IA via BYOK.
-- Mantém active = false para não voltar a mostrar cartão Studio na UI antiga. Bónus IA em pagamentos: `pro_ia` ou `studio` no webhook.

insert into platform_plans (name, slug, price_monthly, price_yearly, color, emoji, features, active, sort_order)
values (
  'Studio',
  'studio',
  39.9,
  399.9,
  '#22d3ee',
  '🤖',
  '[
    "Tudo do Pro",
    "Crédito IA mensal no mini-site (ver IA_STUDIO_BONUS_USD_PER_CYCLE)",
    "Trust Genesis Hub + Copilot DeepSeek",
    "Assistente Lively no site (avatar) + horários de agendamento",
    "Recarga extra IA: 2× o custo (margem 100%)"
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

select 'platform_plans studio: upsert OK (active=false — usar Pro + IA em /planos)' as status;
