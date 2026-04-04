-- Agenda / consultas no mini-site + tabela de reservas
-- Executar no SQL Editor do Supabase após schema base.

alter table mini_sites add column if not exists booking_enabled boolean default false;
alter table mini_sites add column if not exists booking_slot_minutes integer default 30;
alter table mini_sites add column if not exists booking_timezone text default 'America/Sao_Paulo';
alter table mini_sites add column if not exists booking_weekly_hours jsonb default '{"mon":[{"from":"09:00","to":"18:00"}],"tue":[{"from":"09:00","to":"18:00"}],"wed":[{"from":"09:00","to":"18:00"}],"thu":[{"from":"09:00","to":"18:00"}],"fri":[{"from":"09:00","to":"18:00"}],"sat":[],"sun":[]}'::jsonb;
alter table mini_sites add column if not exists booking_services jsonb default '[{"label":"Consultation","minutes":30}]'::jsonb;
alter table mini_sites add column if not exists booking_vertical text default 'general';

create table if not exists site_bookings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references mini_sites (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  visitor_name text,
  visitor_email text not null,
  visitor_phone text,
  service_label text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_site_bookings_site_starts on site_bookings (site_id, starts_at);

alter table site_bookings enable row level security;

drop policy if exists "site_bookings_select_own" on site_bookings;
drop policy if exists "site_bookings_update_own" on site_bookings;
drop policy if exists "site_bookings_delete_own" on site_bookings;

create policy "site_bookings_select_own" on site_bookings
  for select using (
    exists (select 1 from mini_sites m where m.id = site_bookings.site_id and m.user_id = auth.uid())
  );

create policy "site_bookings_update_own" on site_bookings
  for update using (
    exists (select 1 from mini_sites m where m.id = site_bookings.site_id and m.user_id = auth.uid())
  );

create policy "site_bookings_delete_own" on site_bookings
  for delete using (
    exists (select 1 from mini_sites m where m.id = site_bookings.site_id and m.user_id = auth.uid())
  );
