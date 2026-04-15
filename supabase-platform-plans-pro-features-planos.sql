-- Atualiza a lista de funcionalidades do Pro em /planos (remove "Video paywall", alinha com feed pago Stripe).
-- Executar no SQL Editor do Supabase em produção se já existir linha em platform_plans.

update platform_plans
set features = '["Unlimited links","3 site pages","Feed & paid posts (Stripe)","CV unlock","30 themes","Analytics","1 free slug included"]'::jsonb
where lower(slug) = 'pro';
