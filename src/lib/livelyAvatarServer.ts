import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { siteOwnerHasIaTestBypass } from '@/lib/iaBillingSubscription';

export function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type LivelySiteRow = {
  id: string;
  user_id?: string;
  slug: string;
  site_name: string;
  bio: string | null;
  cv_headline: string | null;
  cv_skills?: string[] | null;
  cv_location?: string | null;
  cv_content?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_search_tags?: string[] | null;
  published: boolean;
  lively_avatar_enabled: boolean | null;
  lively_avatar_nft_verified_at: string | null;
  lively_avatar_welcome: string | null;
  lively_central_magic?: boolean | null;
  lively_floating_preset?: string | null;
  lively_dual_agent?: boolean | null;
  lively_agent_instructions?: string | null;
  lively_elevenlabs_voice_owner?: string | null;
  lively_elevenlabs_voice_agent?: string | null;
  lively_tts_provider?: string | null;
  lively_trial_started_at?: string | null;
  trial_publish_until?: string | null;
  ia_credits_balance?: number | string | null;
  ai_free_usd_remaining?: number | string | null;
  ai_paid_usd_balance?: number | string | null;
  lively_premium_nft_verified_at?: string | null;
  booking_enabled?: boolean | null;
  booking_slot_minutes?: number | null;
  booking_timezone?: string | null;
  booking_weekly_hours?: unknown;
  booking_vertical?: string | null;
  contact_phone?: string | null;
  lively_use_deepseek_byok?: boolean | null;
};

export async function getViewerUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: () => {},
          remove: () => {},
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Mini-site autorizado para chat/TTS.
 * Visitantes: published + NFT (ou open beta / skip).
 * Dono autenticado: pode testar mesmo em rascunho e sem NFT.
 */
export async function getLivelySiteForApi(slug: string, viewerUserId: string | null): Promise<LivelySiteRow | null> {
  const slugClean = slug.trim().toLowerCase();
  if (!slugClean) return null;
  const db = getServiceDb();
  const { data, error } = await db
    .from('mini_sites')
    .select(
      [
        'id',
        'user_id',
        'slug',
        'site_name',
        'bio',
        'cv_headline',
        'cv_skills',
        'cv_location',
        'cv_content',
        'seo_title',
        'seo_description',
        'seo_search_tags',
        'published',
        'lively_avatar_enabled',
        'lively_avatar_nft_verified_at',
        'lively_avatar_welcome',
        'lively_central_magic',
        'lively_floating_preset',
        'lively_dual_agent',
        'lively_agent_instructions',
        'lively_elevenlabs_voice_owner',
        'lively_elevenlabs_voice_agent',
        'lively_tts_provider',
        'lively_trial_started_at',
        'trial_publish_until',
        'ia_credits_balance',
        'ai_free_usd_remaining',
        'ai_paid_usd_balance',
        'lively_premium_nft_verified_at',
        'booking_enabled',
        'booking_slot_minutes',
        'booking_timezone',
        'booking_weekly_hours',
        'booking_vertical',
        'contact_phone',
        'lively_use_deepseek_byok',
      ].join(','),
    )
    .eq('slug', slugClean)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as LivelySiteRow;
  if (!row.lively_avatar_enabled) return null;

  const isOwner = !!viewerUserId && row.user_id === viewerUserId;
  if (!row.published && !isOwner) return null;

  const openBeta = process.env.LIVELY_AVATAR_OPEN_BETA === 'true';
  const skipNft = process.env.LIVELY_AVATAR_SKIP_NFT === 'true';
  const bypassVisitorNft =
    openBeta || skipNft || !!(await siteOwnerHasIaTestBypass(db, row.user_id));
  if (!bypassVisitorNft && !row.lively_avatar_nft_verified_at && !isOwner) return null;

  return row;
}

const buckets = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_HITS = 24;

export function rateLimitLively(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { n: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (b.n >= MAX_HITS) return false;
  b.n++;
  return true;
}

export async function walletOwnsLivelyNft(wallet: string): Promise<boolean> {
  const w = wallet.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/i.test(w)) return false;
  if (process.env.LIVELY_AVATAR_SKIP_NFT === 'true') return true;

  const contract = (process.env.LIVELY_AVATAR_NFT_CONTRACT || '').trim();
  const key = (process.env.ALCHEMY_API_KEY || '').trim();
  if (!contract || !key) return false;

  const url = new URL(`https://polygon-mainnet.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`);
  url.searchParams.set('owner', w);
  url.searchParams.append('contractAddresses[]', contract);
  url.searchParams.set('withMetadata', 'false');

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return false;
  const json = (await res.json()) as { ownedNfts?: unknown[] };
  return Array.isArray(json.ownedNfts) && json.ownedNfts.length > 0;
}

export async function walletOwnsPremiumAvatarNft(wallet: string): Promise<boolean> {
  const w = wallet.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/i.test(w)) return false;
  if (process.env.LIVELY_AVATAR_SKIP_NFT === 'true') return true;

  const contract = (process.env.LIVELY_PREMIUM_AVATAR_NFT_CONTRACT || '').trim();
  const key = (process.env.ALCHEMY_API_KEY || '').trim();
  if (!contract || !key) return false;

  const url = new URL(`https://polygon-mainnet.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`);
  url.searchParams.set('owner', w);
  url.searchParams.append('contractAddresses[]', contract);
  url.searchParams.set('withMetadata', 'false');

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return false;
  const json = (await res.json()) as { ownedNfts?: unknown[] };
  return Array.isArray(json.ownedNfts) && json.ownedNfts.length > 0;
}
