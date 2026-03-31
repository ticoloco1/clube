-- TrustBank — Marketplace de anúncios (Helio), categorias, seguidores
-- Executar no SQL Editor do Supabase depois das migrações base.
--
-- Modelo de negócio (resumo):
-- 1) Empresa monta proposta (valor, duração, texto) e escolhe um ou vários mini_sites.
-- 2) Cada dono de mini-site aceita ou recusa (ad_proposal_targets.owner_status).
-- 3) Quando todos aceitam → status fully_accepted → pagamento Helio meta.type = brand_ad, item_id = ad_proposals.id
-- 4) Webhook marca pagamento e cria ad_campaigns com delete_locked_until = fim da campanha
--    (o criador não deve apagar o slot de anúncio antes dessa data — aplicar na UI/API).
-- 5) Repasse 80% criador / 20% plataforma: Helio pode enviar 100% à wallet da plataforma no MVP;
--    o campo creator_payout_status + job manual ou payout automático libera ao dono do mini-site.
--
-- Escrow real on-chain exige contrato ou produto Helio específico; estes campos suportam o fluxo "lógico" e auditoria.

-- ── Categorias (diretório) ─────────────────────────────────────────────────
create table if not exists site_categories (
  id          uuid default gen_random_uuid() primary key,
  slug        text not null unique,
  label       text not null,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

insert into site_categories (slug, label, sort_order) values
  ('creator', 'Criador / Influencer', 10),
  ('services', 'Serviços', 20),
  ('tech', 'Tech & Dev', 30),
  ('business', 'Negócios', 40),
  ('local', 'Local / Comunidade', 50),
  ('other', 'Outros', 99)
on conflict (slug) do nothing;

alter table if exists mini_sites add column if not exists site_category_slug text
  references site_categories(slug) on update cascade on delete set null;

create index if not exists idx_mini_sites_category on mini_sites(site_category_slug);

-- ── Seguidores (engajamento, número público) ────────────────────────────────
create table if not exists site_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  site_id     uuid not null references mini_sites(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, site_id)
);

create index if not exists idx_site_follows_site on site_follows(site_id);

alter table if exists mini_sites add column if not exists follower_count integer not null default 0;

create or replace function site_follows_sync_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update mini_sites set follower_count = follower_count + 1 where id = new.site_id;
    return new;
  elsif tg_op = 'DELETE' then
    update mini_sites set follower_count = greatest(0, follower_count - 1) where id = old.site_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_site_follows_count_ins on site_follows;
drop trigger if exists tr_site_follows_count_del on site_follows;
create trigger tr_site_follows_count_ins after insert on site_follows
  for each row execute function site_follows_sync_count();
create trigger tr_site_follows_count_del after delete on site_follows
  for each row execute function site_follows_sync_count();

alter table site_follows enable row level security;
drop policy if exists "sf_select" on site_follows;
drop policy if exists "sf_insert" on site_follows;
drop policy if exists "sf_delete" on site_follows;
create policy "sf_select" on site_follows for select using (true);
create policy "sf_insert" on site_follows for insert with check (follower_id = auth.uid());
create policy "sf_delete" on site_follows for delete using (follower_id = auth.uid());

-- ── Propostas de anúncio (empresa → um ou vários mini_sites) ─────────────────
create table if not exists ad_proposals (
  id                   uuid default gen_random_uuid() primary key,
  advertiser_user_id   uuid not null references auth.users(id) on delete cascade,
  title                text not null,
  body                 text,
  duration_days        integer not null default 7 check (duration_days > 0 and duration_days <= 365),
  total_budget_usdc    numeric not null check (total_budget_usdc >= 0),
  platform_fee_pct     numeric not null default 20 check (platform_fee_pct >= 0 and platform_fee_pct <= 100),
  status               text not null default 'draft',
  -- draft | sent | fully_accepted | rejected | paid | live | completed | cancelled
  payment_status       text not null default 'unpaid',
  -- unpaid | paid_escrow | released | refunded
  paid_amount_usdc     numeric,
  helio_tx_ref         text,
  paid_at              timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_ad_proposals_advertiser on ad_proposals(advertiser_user_id);
create index if not exists idx_ad_proposals_status on ad_proposals(status);

create table if not exists ad_proposal_targets (
  id                 uuid default gen_random_uuid() primary key,
  proposal_id        uuid not null references ad_proposals(id) on delete cascade,
  site_id            uuid not null references mini_sites(id) on delete cascade,
  bid_amount_usdc    numeric not null check (bid_amount_usdc >= 0),
  owner_status       text not null default 'pending',
  -- pending | accepted | rejected
  message_to_owner   text,
  creator_share_usdc numeric,
  creator_payout_status text not null default 'none',
  -- none | pending_release | paid_out
  responded_at       timestamptz,
  unique (proposal_id, site_id)
);

create index if not exists idx_ad_targets_site on ad_proposal_targets(site_id);
create index if not exists idx_ad_targets_proposal on ad_proposal_targets(proposal_id);

-- ── Campanha ativa no mini-site após pagamento ──────────────────────────────
create table if not exists ad_campaigns (
  id                   uuid default gen_random_uuid() primary key,
  proposal_id          uuid not null references ad_proposals(id) on delete cascade,
  target_id            uuid references ad_proposal_targets(id) on delete set null,
  site_id              uuid not null references mini_sites(id) on delete cascade,
  starts_at            timestamptz not null default now(),
  ends_at              timestamptz not null,
  delete_locked_until  timestamptz not null,
  ticker_items         jsonb default '[]'::jsonb,
  feed_post_id         uuid,
  status               text not null default 'scheduled',
  -- scheduled | active | ended | cancelled
  created_at           timestamptz default now()
);

create index if not exists idx_ad_campaigns_site on ad_campaigns(site_id);
create index if not exists idx_ad_campaigns_ends on ad_campaigns(ends_at);

-- RLS (leitura restrita; escritos preferível via service role / API)
alter table ad_proposals enable row level security;
alter table ad_proposal_targets enable row level security;
alter table ad_campaigns enable row level security;

drop policy if exists "ap_adv" on ad_proposals;
drop policy if exists "ap_owner" on ad_proposals;
drop policy if exists "ap_insert" on ad_proposals;
drop policy if exists "ap_update" on ad_proposals;
drop policy if exists "ap_select_adv" on ad_proposals;
create policy "ap_insert" on ad_proposals for insert with check (advertiser_user_id = auth.uid());
create policy "ap_update" on ad_proposals for update using (advertiser_user_id = auth.uid());
create policy "ap_select_adv" on ad_proposals for select using (advertiser_user_id = auth.uid());
create policy "ap_owner" on ad_proposals for select using (
  exists (
    select 1 from ad_proposal_targets t
    where t.proposal_id = ad_proposals.id
      and exists (select 1 from mini_sites m where m.id = t.site_id and m.user_id = auth.uid())
  )
);

drop policy if exists "apt_site_owner" on ad_proposal_targets;
drop policy if exists "apt_adv" on ad_proposal_targets;
drop policy if exists "apt_insert" on ad_proposal_targets;
drop policy if exists "apt_site_owner_upd" on ad_proposal_targets;
create policy "apt_insert" on ad_proposal_targets for insert with check (
  exists (select 1 from ad_proposals p where p.id = proposal_id and p.advertiser_user_id = auth.uid())
);
create policy "apt_adv_sel" on ad_proposal_targets for select using (
  exists (select 1 from ad_proposals p where p.id = proposal_id and p.advertiser_user_id = auth.uid())
);
-- Dono do mini-site atualiza aceite/recusa; anunciante não altera owner_status (use API com service role se necessário)
create policy "apt_site_owner" on ad_proposal_targets for select using (
  exists (select 1 from mini_sites m where m.id = site_id and m.user_id = auth.uid())
);
create policy "apt_site_owner_upd" on ad_proposal_targets for update using (
  exists (select 1 from mini_sites m where m.id = site_id and m.user_id = auth.uid())
);

drop policy if exists "ac_site" on ad_campaigns;
drop policy if exists "ac_adv" on ad_campaigns;
drop policy if exists "ac_insert" on ad_campaigns;
-- Campanhas criadas pelo servidor (service role); leitura para dono do site e anunciante
create policy "ac_site" on ad_campaigns for select using (
  exists (select 1 from mini_sites m where m.id = site_id and m.user_id = auth.uid())
);
create policy "ac_adv" on ad_campaigns for select using (
  exists (select 1 from ad_proposals p where p.id = proposal_id and p.advertiser_user_id = auth.uid())
);

-- ── Tipo de perfil no diretório (influencer, ator, automotivo, …) ──────────
create table if not exists directory_profile_types (
  slug       text primary key,
  label_pt   text not null,
  sort_order integer default 0
);

insert into directory_profile_types (slug, label_pt, sort_order) values
  ('creator', 'Criador de conteúdo', 5),
  ('influencer', 'Influencer', 10),
  ('actor', 'Ator', 20),
  ('actress', 'Atriz', 21),
  ('athlete', 'Jogador / Atleta', 30),
  ('entrepreneur', 'Empresário', 40),
  ('automotive', 'Carros / Automotivo', 50),
  ('services', 'Serviços', 60),
  ('other', 'Outro', 99)
on conflict (slug) do nothing;

alter table if exists mini_sites add column if not exists directory_profile_slug text
  references directory_profile_types(slug) on update cascade on delete set null;

-- Valor mínimo que o criador aceita (US$) + mostrar ou não no site
alter table if exists mini_sites add column if not exists ad_asking_price_usdc numeric;
alter table if exists mini_sites add column if not exists ad_show_price_public boolean default true;
alter table if exists mini_sites add column if not exists ad_notes text;

-- Tabela de referência: média sugerida por faixa de seguidores / nicho (admin edita no SQL ou painel futuro)
create table if not exists ad_pricing_benchmarks (
  id                   uuid default gen_random_uuid() primary key,
  profile_slug         text references directory_profile_types(slug) on update cascade on delete cascade,
  site_category_slug   text references site_categories(slug) on update cascade on delete cascade,
  followers_min        integer not null default 0,
  followers_max        integer not null default 2147483647,
  suggested_usdc_week  numeric not null,
  label                text,
  sort_order           integer default 0,
  created_at           timestamptz default now()
);

create index if not exists idx_ad_benchmarks_profile on ad_pricing_benchmarks(profile_slug);
create index if not exists idx_ad_benchmarks_cat on ad_pricing_benchmarks(site_category_slug);

-- Exemplos (executar uma vez; ajustar valores). Evita duplicar se já existir linha com mesmo perfil+faixa:
-- insert into ad_pricing_benchmarks (profile_slug, followers_min, followers_max, suggested_usdc_week, label, sort_order)
-- values ('automotive', 0, 9999, 350, 'Auto · até 10k seguidores', 1);

alter table ad_pricing_benchmarks enable row level security;
drop policy if exists "bench_read" on ad_pricing_benchmarks;
create policy "bench_read" on ad_pricing_benchmarks for select using (true);

alter table directory_profile_types enable row level security;
drop policy if exists "dpt_read" on directory_profile_types;
create policy "dpt_read" on directory_profile_types for select using (true);

select 'Marketplace+: directory_profile_types, ad_asking_price, ad_pricing_benchmarks OK.' as status;
