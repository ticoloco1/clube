'use client';

import { supabase } from '@/lib/supabase';

type Utm = { source: string; medium: string; campaign: string };

function postJson(body: unknown, fallback?: () => void) {
  if (typeof window === 'undefined') return;
  void fetch('/api/public/track-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then((r) => {
      if (!r.ok) fallback?.();
    })
    .catch(() => fallback?.());
}

export function trackSiteVisit(payload: {
  site_id: string;
  slug?: string;
  referrer: string | null;
  device: string | null;
  utm: Utm;
}) {
  postJson(
    {
      type: 'visit',
      site_id: payload.site_id,
      slug: payload.slug,
      referrer: payload.referrer,
      device: payload.device,
      utm_source: payload.utm.source || null,
      utm_medium: payload.utm.medium || null,
      utm_campaign: payload.utm.campaign || null,
    },
    () => {
      void (supabase as any).from('site_visits').insert({
        site_id: payload.site_id,
        slug: payload.slug,
        referrer: payload.referrer,
        device: payload.device,
        utm_source: payload.utm.source || null,
        utm_medium: payload.utm.medium || null,
        utm_campaign: payload.utm.campaign || null,
      });
    },
  );
}

export function trackLinkClick(payload: {
  site_id: string;
  link_id: string;
  slug?: string;
  destination_url: string;
  referrer: string | null;
  utm: Utm;
}) {
  postJson(
    {
      type: 'link_click',
      site_id: payload.site_id,
      link_id: payload.link_id,
      slug: payload.slug,
      destination_url: payload.destination_url,
      referrer: payload.referrer,
      utm_source: payload.utm.source || null,
      utm_medium: payload.utm.medium || null,
      utm_campaign: payload.utm.campaign || null,
    },
    () => {
      void (supabase as any).from('site_link_clicks').insert({
        site_id: payload.site_id,
        link_id: payload.link_id,
        slug: payload.slug,
        destination_url: payload.destination_url,
        utm_source: payload.utm.source || null,
        utm_medium: payload.utm.medium || null,
        utm_campaign: payload.utm.campaign || null,
      });
    },
  );
}

export function trackFeedPostView(payload: {
  post_id: string;
  site_id: string;
  referrer: string | null;
  utm: Utm;
}) {
  postJson(
    {
      type: 'feed_post_view',
      post_id: payload.post_id,
      site_id: payload.site_id,
      referrer: payload.referrer,
      utm_source: payload.utm.source || null,
      utm_medium: payload.utm.medium || null,
      utm_campaign: payload.utm.campaign || null,
    },
    () => {
      void (supabase as any).from('feed_post_views').insert({
        post_id: payload.post_id,
        site_id: payload.site_id,
        referrer: payload.referrer,
        utm_source: payload.utm.source || null,
        utm_medium: payload.utm.medium || null,
        utm_campaign: payload.utm.campaign || null,
      });
    },
  );
}

export function trackPageView(payload: {
  site_id: string;
  page_id: string;
  slug?: string;
  referrer: string | null;
  device: string | null;
  utm: Utm;
}) {
  postJson(
    {
      type: 'page_view',
      site_id: payload.site_id,
      page_id: payload.page_id,
      slug: payload.slug,
      referrer: payload.referrer,
      device: payload.device,
      utm_source: payload.utm.source || null,
      utm_medium: payload.utm.medium || null,
      utm_campaign: payload.utm.campaign || null,
    },
    () => {
      void (supabase as any).from('site_page_views').insert({
        site_id: payload.site_id,
        page_id: payload.page_id,
        slug: payload.slug,
        referrer: payload.referrer,
        device: payload.device,
        utm_source: payload.utm.source || null,
        utm_medium: payload.utm.medium || null,
        utm_campaign: payload.utm.campaign || null,
      });
    },
  );
}
