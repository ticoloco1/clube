'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { trackFeedPostView } from '@/lib/publicAnalytics';

type Utm = { source: string; medium: string; campaign: string };

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Firefox/strict privacy may block storage for some users.
  }
}

export function FeedPostImpression({
  postId,
  siteId,
  track,
  children,
}: {
  postId: string;
  siteId: string;
  track: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!track || typeof window === 'undefined') return;
    const key = `tb_fpv_${siteId}_${postId}`;
    if (safeSessionGet(key)) return;
    const el = ref.current;
    if (!el) return;

    const utmFromUrl = (): Utm => {
      const params = new URLSearchParams(window.location.search);
      return {
        source: params.get('utm_source') || '',
        medium: params.get('utm_medium') || '',
        campaign: params.get('utm_campaign') || '',
      };
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        safeSessionSet(key, '1');
        const r = document.referrer || '';
        trackFeedPostView({
          post_id: postId,
          site_id: siteId,
          referrer: r ? r.slice(0, 500) : null,
          utm: utmFromUrl(),
        });
        io.disconnect();
      },
      { threshold: 0.28, rootMargin: '0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [postId, siteId, track]);

  return <div ref={ref}>{children}</div>;
}
