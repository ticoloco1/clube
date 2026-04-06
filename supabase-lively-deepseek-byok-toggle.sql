-- Toggle: use owner's DeepSeek BYOK key for live assistant chat on mini-site.

alter table if exists public.mini_sites
  add column if not exists lively_use_deepseek_byok boolean not null default false;

