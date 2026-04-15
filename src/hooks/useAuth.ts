'use client';
import { useEffect, useState } from 'react';
import { normalizePublicSiteUrl } from '@/lib/publicSiteUrl';
import { sanitizeAppRedirect } from '@/lib/sanitizeAppRedirect';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadingFailSafe = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (data.session?.user) {
        setUser(data.session.user);
        setLoading(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(userData.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setUser(null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      clearTimeout(loadingFailSafe);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  const signInWithGoogle = (afterLoginPath?: string) => {
    const originFromBrowser =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : null;
    const base = normalizePublicSiteUrl(originFromBrowser || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL);
    const next = sanitizeAppRedirect(afterLoginPath ?? null, '/editor');
    const cb = new URL('/auth/callback', base);
    cb.searchParams.set('next', next);
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: cb.toString() },
    });
  };

  const signInWithEmail = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUpWithEmail = (email: string, password: string) =>
    supabase.auth.signUp({ email, password });

  return { user, loading, signOut, signInWithGoogle, signInWithEmail, signUpWithEmail };
}
