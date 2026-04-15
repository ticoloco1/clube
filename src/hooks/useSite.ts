'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface MiniSite {
  id: string;
  user_id: string;
  slug: string;
  site_name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  bg_image_url: string | null;
  theme: string;
  accent_color: string;
  font_size: string;
  photo_shape: string;
  published: boolean;
  show_cv: boolean;
  cv_content: string | null;
  cv_headline: string | null;
  cv_location: string | null;
  cv_skills: string[];
  cv_experience: any[];
  cv_education: any[];
  contact_email: string | null;
  contact_phone: string | null;
  contact_price: number;
  module_order: string[];
  template_id: string;
  text_color: string | null;
  video_cols: number;
  font_style: string;
  photo_size: string;
  cv_locked: boolean;
  /** Email/WhatsApp do CV escondidos até desbloqueio (pode ser true com CV “aberto”). */
  cv_contact_locked?: boolean;
  cv_free: boolean;
  cv_price: number;
  cv_projects: any[];
  cv_languages: any[];
  cv_certificates: any[];
  cv_contact_whatsapp: string | null;
  cv_hire_price: number;
  cv_hire_currency: string;
  cv_hire_type: string;
  wallet_address: string | null;
  is_verified: boolean;
  section_order: string[];
  updated_at: string;
  show_feed?: boolean;
  feed_cols?: number;
  site_pages?: string;
  page_width?: number;
  page_contents?: string;
  page_modules?: string;
  banner_focus_x?: number;
  banner_focus_y?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_og_image?: string | null;
  seo_search_tags?: string[] | null;
  seo_json_ld?: string | null;
  trial_publish_until?: string | null;
  trial_grace_until?: string | null;
  trial_notice_sent_at?: string | null;
  ticker_enabled?: boolean;
  ticker_items?: any;
  banner_zoom?: number;
  banner_fit?: 'cover' | 'contain';
  banner_placeholder_enabled?: boolean;
  banner_placeholder_color?: string | null;
  site_category_slug?: string | null;
  directory_profile_slug?: string | null;
  follower_count?: number;
  ad_asking_price_usdc?: number | null;
  ad_show_price_public?: boolean;
  ad_notes?: string | null;
  stripe_connect_account_id?: string | null;
  stripe_connect_charges_enabled?: boolean | null;
  stripe_connect_payouts_enabled?: boolean | null;
  lively_avatar_enabled?: boolean | null;
  lively_avatar_model?: string | null;
  lively_avatar_welcome?: string | null;
  lively_avatar_nft_verified_at?: string | null;
  lively_central_magic?: boolean | null;
  lively_floating_preset?: string | null;
  lively_floating_expressive?: boolean | null;
  lively_dual_agent?: boolean | null;
  lively_agent_instructions?: string | null;
  lively_elevenlabs_voice_owner?: string | null;
  lively_elevenlabs_voice_agent?: string | null;
  lively_trial_started_at?: string | null;
  lively_profile_as_avatar?: boolean | null;
  lively_profile_speak_on_entry?: boolean | null;
  lively_profile_speech_tap?: string | null;
  lively_profile_speech_before_reply?: string | null;
  /** auto | openai | elevenlabs */
  lively_tts_provider?: string | null;
  ia_credits_balance?: number | string | null;
  ai_free_usd_remaining?: number | string | null;
  ai_paid_usd_balance?: number | string | null;
  lively_premium_nft_verified_at?: string | null;
  identity_style_preset?: string | null;
  identity_portrait_url?: string | null;
  identity_clone_voice_id?: string | null;
  identity_voice_effect?: string | null;
  magic_portrait_enabled?: boolean | null;
  mystic_public_enabled?: boolean | null;
  mystic_tarot_price_usd?: number | string | null;
  mystic_lottery_premium_price_usd?: number | string | null;
  booking_enabled?: boolean | null;
  booking_slot_minutes?: number | null;
  booking_timezone?: string | null;
  booking_weekly_hours?: unknown;
  booking_services?: unknown;
  booking_vertical?: string | null;
}

export type UseMySiteOptions = {
  /** UUID do mini-site (`/editor?site=`). */
  siteId?: string | null;
  /** `/editor?new=1` — novo site; primeiro save faz INSERT sem reutilizar a linha “mais recente”. */
  preferNew?: boolean;
  /** Quando true, não carrega (ex.: dashboard à espera do mini-site escolhido). */
  skip?: boolean;
};

export function useMySite(options?: UseMySiteOptions) {
  const siteIdFilter = options?.siteId?.trim() || null;
  const preferNew = options?.preferNew === true;
  const skip = options?.skip === true;

  const { user } = useAuth();
  const [site, setSite] = useState<MiniSite | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (skip) {
      setSite(null);
      setLoading(true);
      return;
    }
    if (!user) {
      setSite(null);
      setLoading(false);
      return;
    }
    if (preferNew && !siteIdFilter) {
      setSite(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let q = supabase.from('mini_sites').select('*').eq('user_id', user.id);
      if (siteIdFilter) {
        q = q.eq('id', siteIdFilter);
      } else {
        q = q.order('updated_at', { ascending: false }).limit(1);
      }
      const { data, error } = await q.maybeSingle();

      if (error) {
        console.error('Error loading site:', error);
        setSite(null);
      } else {
        setSite(data as MiniSite | null);
      }
    } catch (err) {
      console.error('Failed to load site:', err);
      setSite(null);
    } finally {
      setLoading(false);
    }
  }, [user, siteIdFilter, preferNew, skip]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Após criar site novo, devolve a linha para o editor redirecionar `?site=id`. */
  const save = async (values: Partial<MiniSite>): Promise<MiniSite | null> => {
    if (!user) throw new Error('Not authenticated');

    const { user_id: _, ...cleanValues } = values as any;

    try {
      if (site?.id) {
        const { error } = await supabase
          .from('mini_sites')
          .update({ ...cleanValues, updated_at: new Date().toISOString() })
          .eq('id', site.id)
          .eq('user_id', user.id);
        if (error) {
          console.error('Save error:', error);
          throw new Error(`Failed to save: ${error.message}`);
        }
        await load();
        return null;
      }

      let slug = String(cleanValues.slug || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');
      if (!slug || slug.length < 2) {
        slug = (user.email?.split('@')[0] || 'site')
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase()
          .slice(0, 30) || 'site';
      }

      const now = new Date().toISOString();
      const payload = { ...cleanValues, slug, updated_at: now };

      if (preferNew) {
        const uniqueSlug = `${slug}-${Date.now().toString(36)}`.slice(0, 80);
        const trySlug = async (s: string) => {
          const { data: inserted, error } = await supabase
            .from('mini_sites')
            .insert({ ...cleanValues, user_id: user.id, slug: s, updated_at: now })
            .select('*')
            .single();
          return { inserted: inserted as MiniSite | null, error };
        };
        let { inserted, error } = await trySlug(slug);
        if (error?.code === '23505' || /unique|duplicate/i.test(String(error?.message || ''))) {
          ({ inserted, error } = await trySlug(uniqueSlug));
        }
        if (error) {
          console.error('Insert error (new site):', error);
          throw new Error(`Failed to create: ${error.message}`);
        }
        setSite(inserted);
        return inserted;
      }

      const { data: existingRow } = await supabase
        .from('mini_sites')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRow?.id) {
        const { error } = await supabase
          .from('mini_sites')
          .update(payload)
          .eq('id', existingRow.id)
          .eq('user_id', user.id);
        if (error) {
          console.error('Save error (existing mini_site):', error);
          throw new Error(`Failed to save: ${error.message}`);
        }
      } else {
        const { error } = await supabase
          .from('mini_sites')
          .insert({ ...cleanValues, user_id: user.id, slug, updated_at: now })
          .select('*')
          .single();
        if (error) {
          console.error('Insert error:', error);
          throw new Error(`Failed to create: ${error.message}`);
        }
      }
      await load();
      return null;
    } catch (err) {
      console.error('Save operation failed:', err);
      throw err;
    }
  };

  return { site, loading, save, reload: load };
}

export function usePublicSite(
  slug: string,
  opts?: { ssrSite?: MiniSite | null },
) {
  const normalizedSlug = String(slug || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
  const ssr = opts?.ssrSite;
  const { loading: authLoading } = useAuth();
  const [site, setSite] = useState<MiniSite | null>(() =>
    ssr !== undefined && ssr !== null ? ssr : null,
  );
  const [loading, setLoading] = useState(() => !(ssr !== undefined && ssr !== null));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!normalizedSlug) return;
    let cancelled = false;
    const loadPublic = async () => {
      const primary = await supabase
        .from('mini_sites')
        .select('*')
        .eq('slug', normalizedSlug)
        .eq('published', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (!cancelled && !primary.error && Array.isArray(primary.data) && primary.data[0]) {
        setSite(primary.data[0] as MiniSite);
        setNotFound(false);
        setLoading(false);
        return;
      }

      const fallback = await supabase
        .from('mini_sites')
        .select('*')
        .eq('slug', normalizedSlug)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (!fallback.error && Array.isArray(fallback.data) && fallback.data[0]) {
        setSite(fallback.data[0] as MiniSite);
        setNotFound(false);
        setLoading(false);
        return;
      }

      const caseInsensitive = await supabase
        .from('mini_sites')
        .select('*')
        .ilike('slug', normalizedSlug)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (cancelled) return;

      if (caseInsensitive.error) {
        console.error('Error loading public site:', caseInsensitive.error);
      }

      const row =
        !caseInsensitive.error && Array.isArray(caseInsensitive.data) && caseInsensitive.data[0]
          ? (caseInsensitive.data[0] as MiniSite)
          : null;

      if (row) {
        setSite(row);
        setNotFound(false);
        setLoading(false);
        return;
      }

      /**
       * RLS: só `published` ou dono (`auth.uid() = user_id`). Antes da sessão hidratar,
       * o cliente parece anónimo — mini-site em rascunho parece “inexistente”.
       * Não marcar notFound até `authLoading` ser false; depois o efeito re-corre com JWT.
       */
      if (authLoading) {
        setLoading(true);
        setNotFound(false);
        return;
      }

      setNotFound(true);
      setLoading(false);
    };
    void loadPublic();
    return () => {
      cancelled = true;
    };
  }, [normalizedSlug, authLoading]);

  return { site, loading, notFound };
}
