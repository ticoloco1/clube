-- Botão "Seguir" no mini-site público (SiteFollowButton → tabela site_follows).
-- Idempotente: seguro correr em produção se a tabela faltar ou RLS estiver incompleto.
-- Requer: public.mini_sites e auth.users (Supabase padrão).

alter table if exists public.mini_sites
  add column if not exists follower_count integer not null default 0;

update public.mini_sites set follower_count = 0 where follower_count is null;

create table if not exists public.site_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  site_id     uuid not null references public.mini_sites (id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, site_id)
);

create index if not exists idx_site_follows_site on public.site_follows (site_id);

create or replace function public.site_follows_sync_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.mini_sites set follower_count = coalesce(follower_count, 0) + 1 where id = new.site_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.mini_sites set follower_count = greatest(0, coalesce(follower_count, 0) - 1) where id = old.site_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_site_follows_count_ins on public.site_follows;
drop trigger if exists tr_site_follows_count_del on public.site_follows;
create trigger tr_site_follows_count_ins after insert on public.site_follows
  for each row execute function public.site_follows_sync_count();
create trigger tr_site_follows_count_del after delete on public.site_follows
  for each row execute function public.site_follows_sync_count();

alter table public.site_follows enable row level security;

drop policy if exists "sf_select" on public.site_follows;
drop policy if exists "sf_insert" on public.site_follows;
drop policy if exists "sf_delete" on public.site_follows;

create policy "sf_select" on public.site_follows for select using (true);
create policy "sf_insert" on public.site_follows for insert with check (follower_id = auth.uid());
create policy "sf_delete" on public.site_follows for delete using (follower_id = auth.uid());

select 'site_follows: tabela, triggers, RLS — OK' as status;
