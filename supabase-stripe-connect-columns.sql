-- Stripe Connect (criador recebe paywall 70% e CV 50% via Transfer)
-- Nota: supabase-minisite-mystic-tarot-loteria.sql já faz estes ALTER em mini_sites;
-- este ficheiro é idempotente (podes correr os dois sem problema).
alter table if exists mini_sites add column if not exists stripe_connect_account_id text;
alter table if exists mini_sites add column if not exists stripe_connect_charges_enabled boolean not null default false;
alter table if exists mini_sites add column if not exists stripe_connect_payouts_enabled boolean not null default false;

create index if not exists idx_mini_sites_stripe_acct on mini_sites (stripe_connect_account_id) where stripe_connect_account_id is not null;

select 'mini_sites: Stripe Connect columns OK' as status;
