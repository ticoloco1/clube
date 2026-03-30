-- Zicobank — SQL additions (run in Supabase SQL Editor)
-- These tables are needed for Plans, Broadcast, Analytics and Messages

-- Platform Plans (admin manages, appears on /planos)
create table if not exists platform_plans (
  id            uuid default gen_random_uuid() primary key,
  name          text not null,
  slug          text unique not null,
  price_monthly numeric default 0,
  price_yearly  numeric default 0,
  currency      text default 'USD',
  active        boolean default true,
  color         text default '#818cf8',
  emoji         text default '✨',
  features      jsonb default '[]',
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

alter table platform_plans enable row level security;
drop policy if exists "plans_read" on platform_plans;
drop policy if exists "plans_all"  on platform_plans;
create policy "plans_read" on platform_plans for select using (true);
create policy "plans_all"  on platform_plans for all using (true);

-- Default plans
insert into platform_plans (name, slug, price_monthly, price_yearly, color, emoji, features, sort_order)
values
  ('Pro', 'pro', 29.90, 239.00, '#818cf8', '⚡',
   '["Unlimited links","3 site pages","Video paywall","CV unlock","30 themes","Analytics","1 free slug included"]'::jsonb, 1),
  ('Business', 'business', 99.90, 799.00, '#f59e0b', '👑',
   '["Everything in Pro","10 premium slugs","Custom domain","Multi-site","API access","Priority support","White label"]'::jsonb, 2)
on conflict (slug) do nothing;

-- Site visits analytics
create table if not exists site_visits (
  id        uuid default gen_random_uuid() primary key,
  site_id   uuid references mini_sites(id) on delete cascade,
  slug      text,
  referrer  text,
  device    text,
  country   text,
  created_at timestamptz default now()
);

alter table site_visits enable row level security;
drop policy if exists "sv_read"   on site_visits;
drop policy if exists "sv_insert" on site_visits;
create policy "sv_read"   on site_visits for select using (
  exists (select 1 from mini_sites where id = site_id and user_id = auth.uid())
);
create policy "sv_insert" on site_visits for insert with check (true);

-- Site messages (contact box on mini site)
create table if not exists site_messages (
  id           uuid default gen_random_uuid() primary key,
  site_id      uuid references mini_sites(id) on delete cascade,
  sender_name  text,
  sender_email text,
  message      text not null,
  read         boolean default false,
  created_at   timestamptz default now()
);

alter table site_messages enable row level security;
drop policy if exists "sm_read"   on site_messages;
drop policy if exists "sm_insert" on site_messages;
create policy "sm_read" on site_messages for select using (
  exists (select 1 from mini_sites where id = site_id and user_id = auth.uid())
);
create policy "sm_insert" on site_messages for insert with check (true);

-- User slug auctions (Dashboard / Cofre → Leilão)
create table if not exists slug_auctions (
  id                    uuid default gen_random_uuid() primary key,
  slug                  text not null,
  slug_registration_id  uuid,
  seller_id             uuid,
  min_bid               numeric default 0,
  current_bid           numeric default 0,
  min_increment         numeric default 5,
  bid_count             integer default 0,
  ends_at               timestamptz not null,
  status                text default 'active',
  created_at            timestamptz default now()
);

alter table slug_auctions enable row level security;
drop policy if exists "slug_auctions_read" on slug_auctions;
drop policy if exists "slug_auctions_write" on slug_auctions;
create policy "slug_auctions_read" on slug_auctions for select using (true);
create policy "slug_auctions_write" on slug_auctions for all using (true);

select 'Done! Tables platform_plans, site_visits, site_messages, slug_auctions created.' as status;
