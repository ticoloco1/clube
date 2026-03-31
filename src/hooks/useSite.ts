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
  trial_publish_until?: string | null;
  trial_grace_until?: string | null;
  trial_notice_sent_at?: string | null;
  ticker_enabled?: boolean;
  ticker_items?: any;
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
        const slug = (cleanValues.slug || user.email?.split('@')[0] || 'user') +
          user.id.slice(0, 6);
        const { error } = await supabase
          .from('mini_sites')
          .insert({ ...cleanValues, user_id: user.id, slug });
        if (error) {
          console.error('Insert error:', error);
          throw new Error(`Failed to create: ${error.message}`);
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

export function usePublicSite(slug: string) {
  const [site, setSite] = useState<MiniSite | null>(null);
  const [loading, setLoading] = useState(true);
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
      })
      .catch(err => {
        console.error('Failed to load public site:', err);
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  return { site, loading, notFound };
}
