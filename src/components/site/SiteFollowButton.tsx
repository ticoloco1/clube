'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

interface SiteFollowButtonProps {
  siteId: string;
  siteSlug: string;
  accentColor: string;
  textColor: string;
  borderColor: string;
  compact?: boolean;
}

export function SiteFollowButton({
  siteId,
  siteSlug,
  accentColor,
  textColor,
  borderColor,
  compact,
}: SiteFollowButtonProps) {
  const T = useT();
  const { user } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || !siteId) {
      setFollowing(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('site_follows' as never)
        .select('follower_id')
        .eq('site_id', siteId)
        .eq('follower_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setFollowing(!!data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, siteId]);

  const toggle = async () => {
    if (!user) {
      const path = typeof window !== 'undefined' ? window.location.pathname : `/s/${siteSlug}`;
      window.location.href = `/auth?redirect=${encodeURIComponent(path)}`;
      return;
    }
    setBusy(true);
    try {
      if (following) {
        const { error } = await supabase
          .from('site_follows' as never)
          .delete()
          .eq('site_id', siteId)
          .eq('follower_id', user.id);
        if (error) throw error;
        setFollowing(false);
        toast.success(T('toast_unfollowed'));
      } else {
        const { error } = await supabase.from('site_follows' as never).insert({
          site_id: siteId,
          follower_id: user.id,
        });
        if (error) throw error;
        setFollowing(true);
        toast.success(T('toast_following_site'));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : T('err_generic');
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold opacity-60"
        style={{ border: `1px solid ${borderColor}`, color: textColor }}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> …
      </span>
    );
  }

  const isFollowing = !!following;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 font-bold rounded-full transition-all disabled:opacity-60"
      style={{
        padding: compact ? '6px 12px' : '8px 16px',
        fontSize: compact ? 12 : 13,
        border: `1.5px solid ${isFollowing ? accentColor : borderColor}`,
        background: isFollowing ? `${accentColor}22` : 'transparent',
        color: isFollowing ? accentColor : textColor,
      }}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {isFollowing ? T('follow_action_following') : T('follow_action_follow')}
    </button>
  );
}
