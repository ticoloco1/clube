-- =============================================================================
-- Storage: upload / update / delete no bucket `platform-assets` (utilizador autenticado)
-- =============================================================================
-- O editor grava em `platform-assets` com caminho `{auth.uid()}/{pasta}/ficheiro`.
-- Sem políticas INSERT/UPDATE/DELETE, o upload falha em silêncio ou com erro RLS.
--
-- Pré-requisitos: bucket `platform-assets` público (leitura) + política de SELECT
-- em supabase-storage-platform-assets-public-read.sql
-- =============================================================================

drop policy if exists "Authenticated insert own platform-assets" on storage.objects;
drop policy if exists "Authenticated update own platform-assets" on storage.objects;
drop policy if exists "Authenticated delete own platform-assets" on storage.objects;

create policy "Authenticated insert own platform-assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Authenticated update own platform-assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Authenticated delete own platform-assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'platform-assets'
  and split_part(name, '/', 1) = auth.uid()::text
);
