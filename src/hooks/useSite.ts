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
}

export function useMySite() {
  const { user } = useAuth();
  const [site, setSite] = useState<MiniSite | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('mini_sites')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
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
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async (values: Partial<MiniSite>) => {
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
      } else {
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

        /** Já existe mini-site na BD mas o estado React perdeu `site` → atualiza em vez de INSERT (evita 2+ linhas por user). */
        const { data: existingRow } = await supabase
          .from('mini_sites')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const now = new Date().toISOString();
        const payload = { ...cleanValues, slug, updated_at: now };

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
      }
      await load();
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
  const ssr = opts?.ssrSite;
  const [site, setSite] = useState<MiniSite | null>(() =>
    ssr !== undefined && ssr !== null ? ssr : null,
  );
  const [loading, setLoading] = useState(() => !(ssr !== undefined && ssr !== null));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('mini_sites')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading public site:', error);
          setNotFound(true);
        } else if (!data) {
          setNotFound(true);
        } else {
          setSite(data as MiniSite);
        }
        setLoading(false);
      });
  }, [slug]);

  return { site, loading, notFound };
}
