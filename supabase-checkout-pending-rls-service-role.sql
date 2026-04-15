-- Se o checkout falhar com 42501 em checkout_pending, a causa habitual é
-- SUPABASE_SERVICE_ROLE_KEY na Vercel = chave anon (corrige no painel Vercel).
-- Isto é opcional: política explícita para o papel service_role (Postgres/Supabase).

alter table if exists public.checkout_pending enable row level security;

drop policy if exists "checkout_pending_service_all" on public.checkout_pending;
create policy "checkout_pending_service_all"
  on public.checkout_pending
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

select 'checkout_pending policy for service_role OK' as status;
