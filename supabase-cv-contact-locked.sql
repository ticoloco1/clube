-- CV: bloquear só email/WhatsApp até desbloqueio (mesmo fluxo cv_unlocks / Stripe).
-- Executar no Supabase: SQL Editor → New query → colar → Run.
-- Se o editor ainda disser que a coluna não existe: Settings → API → Reload schema (ou espera ~1 min).

alter table if exists public.mini_sites
  add column if not exists cv_contact_locked boolean not null default false;

comment on column public.mini_sites.cv_contact_locked is
  'Se true, esconde contact_email e cv_contact_whatsapp no CV público até o visitante comprar o desbloqueio (cv_unlocks).';
