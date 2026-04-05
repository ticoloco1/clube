-- Cartão "Studio" separado desligado: o pack IA passa a ser +US$10/mês no mesmo plano Pro (`pro_ia`).
update platform_plans set active = false where lower(slug) = 'studio';
select 'studio plan card deactivated — use Pro + IA toggle on /planos' as status;
