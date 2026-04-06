-- Cartão "Studio" separado desligado. Subscrição: plano `pro`; `pro_ia` só legado.
update platform_plans set active = false where lower(slug) = 'studio';
select 'studio plan card deactivated — use Pro + IA toggle on /planos' as status;
