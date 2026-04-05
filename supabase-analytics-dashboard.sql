-- Analytics melhorados: geo nas visitas/cliques, views no feed, views por página.
-- Executar no SQL Editor do Supabase após o schema base.

-- Visitas: cidade (país já existia em supabase-additions)
alter table if exists site_visits add column if not exists city text;

-- Cliques em links: origem + geo
alter table if exists site_link_clicks add column if not exists referrer text;
alter table if exists site_link_clicks add column if not exists country text;
alter table if exists site_link_clicks add column if not exists city text;

-- Uma linha por impressão de post no feed (visitante)
create table if not exists feed_post_views (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references feed_posts(id) on delete cascade,
  site_id uuid not null references mini_sites(id) on delete cascade,
  referrer text,
  country text,
  city text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now()
);

create index if not exists idx_feed_post_views_post on feed_post_views(post_id);
create index if not exists idx_feed_post_views_site on feed_post_views(site_id);
create index if not exists idx_feed_post_views_created on feed_post_views(created_at desc);

alter table feed_post_views enable row level security;
drop policy if exists "fpv_select_owner" on feed_post_views;
drop policy if exists "fpv_insert_public" on feed_post_views;
create policy "fpv_select_owner" on feed_post_views for select using (
  exists (select 1 from mini_sites m where m.id = feed_post_views.site_id and m.user_id = auth.uid())
);
create policy "fpv_insert_public" on feed_post_views for insert with check (true);

-- Abertura de página/tab do mini-site
create table if not exists site_page_views (
  id uuid default gen_random_uuid() primary key,
  site_id uuid not null references mini_sites(id) on delete cascade,
  page_id text not null,
  slug text,
  referrer text,
  device text,
  country text,
  city text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now()
);

create index if not exists idx_site_page_views_site on site_page_views(site_id);
create index if not exists idx_site_page_views_site_page on site_page_views(site_id, page_id);
create index if not exists idx_site_page_views_created on site_page_views(created_at desc);

alter table site_page_views enable row level security;
drop policy if exists "spv_select_owner" on site_page_views;
drop policy if exists "spv_insert_public" on site_page_views;
create policy "spv_select_owner" on site_page_views for select using (
  exists (select 1 from mini_sites m where m.id = site_page_views.site_id and m.user_id = auth.uid())
);
create policy "spv_insert_public" on site_page_views for insert with check (true);

select 'supabase-analytics-dashboard.sql aplicado.' as status;
