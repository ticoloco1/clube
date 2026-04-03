import { getServiceDb } from '@/lib/livelyAvatarServer';

export type IdentitySiteRow = {
  id: string;
  user_id: string;
  slug: string;
  site_name: string;
  bio: string | null;
  published: boolean;
  identity_clone_voice_id: string | null;
  lively_elevenlabs_voice_owner: string | null;
  lively_trial_started_at: string | null;
  trial_publish_until?: string | null;
  ia_credits_balance: number | string | null;
  ai_free_usd_remaining?: number | string | null;
  ai_paid_usd_balance?: number | string | null;
  identity_voice_effect: string | null;
};

export type IdentitySiteForGreeting = IdentitySiteRow & {
  isOwner: boolean;
  voiceId: string;
};

/**
 * Mini-site com voz (clone ou ID ElevenLabs manual) para saudação / TTS de identidade.
 * Não exige lively_avatar_enabled.
 */
export async function getIdentitySiteForGreeting(
  slug: string,
  viewerUserId: string | null,
): Promise<IdentitySiteForGreeting | null> {
  const slugClean = slug.trim().toLowerCase();
  if (!slugClean) return null;
  const { data, error } = await getServiceDb()
    .from('mini_sites')
    .select(
      [
        'id',
        'user_id',
        'slug',
        'site_name',
        'bio',
        'published',
        'identity_clone_voice_id',
        'lively_elevenlabs_voice_owner',
        'lively_trial_started_at',
        'trial_publish_until',
        'ia_credits_balance',
        'ai_free_usd_remaining',
        'ai_paid_usd_balance',
        'identity_voice_effect',
      ].join(','),
    )
    .eq('slug', slugClean)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as IdentitySiteRow;
  const isOwner = !!viewerUserId && row.user_id === viewerUserId;
  if (!row.published && !isOwner) return null;
  const voiceId = (row.identity_clone_voice_id || row.lively_elevenlabs_voice_owner || '').trim();
  if (!voiceId) return null;
  return { ...row, isOwner, voiceId };
}
