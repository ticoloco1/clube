-- =============================================================================
-- Storage: leitura pública do bucket `platform-assets`
-- =============================================================================
-- Sem isto, imagens enviadas para páginas/feed (URLs públicas do Supabase) podem
-- falhar para visitantes anónimos se as políticas RLS do Storage não permitirem SELECT.
--
-- Pré-requisitos no Supabase Dashboard:
--   1. Criar o bucket `platform-assets` (se ainda não existir).
--   2. Marcar o bucket como público (Public bucket), para getPublicUrl funcionar.
--   3. Executar este SQL no SQL Editor (ajusta o nome da policy se já existir).
-- =============================================================================

drop policy if exists "Public read platform-assets" on storage.objects;

create policy "Public read platform-assets"
on storage.objects
for select
to public
using (bucket_id = 'platform-assets');

-- Upload: normalmente já tens políticas para authenticated escreverem na sua pasta.
-- Se o upload falhar no editor, adiciona política INSERT para authenticated em `storage.objects`.
