-- Avatar vivo (IA + TTS + visemes no cliente). Gate opcional via NFT (ver API verify-nft).
alter table if exists mini_sites add column if not exists lively_avatar_enabled boolean default false;
alter table if exists mini_sites add column if not exists lively_avatar_model text default 'neo';
alter table if exists mini_sites add column if not exists lively_avatar_welcome text;
alter table if exists mini_sites add column if not exists lively_avatar_nft_verified_at timestamptz;

comment on column mini_sites.lively_avatar_enabled is 'Mostra assistente com avatar animado no mini-site público';
comment on column mini_sites.lively_avatar_model is 'Preset visual: neo | aria | sol | zen';
comment on column mini_sites.lively_avatar_welcome is 'Mensagem inicial do assistente (opcional)';
comment on column mini_sites.lively_avatar_nft_verified_at is 'Última verificação on-chain do NFT TrustBank (gate)';

-- v2: dual-agent, ElevenLabs, créditos, trial 40min, preset flutuante premium
alter table if exists mini_sites add column if not exists lively_central_magic boolean default false;
alter table if exists mini_sites add column if not exists lively_floating_preset text default 'classic';
alter table if exists mini_sites add column if not exists lively_floating_expressive boolean default false;
alter table if exists mini_sites add column if not exists lively_dual_agent boolean default false;
alter table if exists mini_sites add column if not exists lively_agent_instructions text;
alter table if exists mini_sites add column if not exists lively_elevenlabs_voice_owner text;
alter table if exists mini_sites add column if not exists lively_elevenlabs_voice_agent text;
alter table if exists mini_sites add column if not exists lively_trial_started_at timestamptz;
alter table if exists mini_sites add column if not exists ia_credits_balance numeric(14,4) default 0;
alter table if exists mini_sites add column if not exists lively_premium_nft_verified_at timestamptz;
