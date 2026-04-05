import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_LEN = 2000;

function trunc(s: unknown, n: number): string | null {
  if (s == null || s === '') return null;
  const t = String(s).slice(0, n);
  return t || null;
}

function safeDecodeCity(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function geoFromRequest(req: Request) {
  const h = req.headers;
  const country =
    h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || h.get('cloudfront-viewer-country') || null;
  const city = safeDecodeCity(h.get('x-vercel-ip-city'));
  return { country: trunc(country, 8), city: trunc(city, 120) };
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  const supabase = admin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'misconfigured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = String(body.type || '');
  const { country, city } = geoFromRequest(req);

  if (type === 'visit') {
    const siteId = String(body.site_id || '');
    if (!siteId) return NextResponse.json({ ok: false }, { status: 400 });
    const { data: row, error: qe } = await supabase
      .from('mini_sites')
      .select('id, published')
      .eq('id', siteId)
      .maybeSingle();
    if (qe || !row?.published) return NextResponse.json({ ok: true });

    const { error } = await supabase.from('site_visits').insert({
      site_id: siteId,
      slug: trunc(body.slug, 120),
      referrer: trunc(body.referrer, 500),
      device: trunc(body.device, 200),
      country,
      city,
      utm_source: trunc(body.utm_source, 120),
      utm_medium: trunc(body.utm_medium, 120),
      utm_campaign: trunc(body.utm_campaign, 120),
    });
    if (error) console.error('[track-analytics visit]', error.message);
    return NextResponse.json({ ok: true });
  }

  if (type === 'link_click') {
    const siteId = String(body.site_id || '');
    const linkId = String(body.link_id || '');
    if (!siteId || !linkId) return NextResponse.json({ ok: false }, { status: 400 });

    const { data: siteRow } = await supabase.from('mini_sites').select('id, published').eq('id', siteId).maybeSingle();
    if (!siteRow?.published) return NextResponse.json({ ok: true });

    const { data: linkRow } = await supabase
      .from('mini_site_links')
      .select('id')
      .eq('id', linkId)
      .eq('site_id', siteId)
      .maybeSingle();
    if (!linkRow) return NextResponse.json({ ok: true });

    const { error } = await supabase.from('site_link_clicks').insert({
      site_id: siteId,
      link_id: linkId,
      slug: trunc(body.slug, 120),
      destination_url: trunc(body.destination_url, MAX_LEN),
      referrer: trunc(body.referrer, 500),
      country,
      city,
      utm_source: trunc(body.utm_source, 120),
      utm_medium: trunc(body.utm_medium, 120),
      utm_campaign: trunc(body.utm_campaign, 120),
    });
    if (error) console.error('[track-analytics link_click]', error.message);
    return NextResponse.json({ ok: true });
  }

  if (type === 'feed_post_view') {
    const siteId = String(body.site_id || '');
    const postId = String(body.post_id || '');
    if (!siteId || !postId) return NextResponse.json({ ok: false }, { status: 400 });

    const { data: postRow } = await supabase
      .from('feed_posts')
      .select('id, site_id')
      .eq('id', postId)
      .eq('site_id', siteId)
      .maybeSingle();
    if (!postRow) return NextResponse.json({ ok: true });

    const { data: siteRow } = await supabase.from('mini_sites').select('published').eq('id', siteId).maybeSingle();
    if (!siteRow?.published) return NextResponse.json({ ok: true });

    const { error } = await supabase.from('feed_post_views').insert({
      post_id: postId,
      site_id: siteId,
      referrer: trunc(body.referrer, 500),
      country,
      city,
      utm_source: trunc(body.utm_source, 120),
      utm_medium: trunc(body.utm_medium, 120),
      utm_campaign: trunc(body.utm_campaign, 120),
    });
    if (error) console.error('[track-analytics feed_post_view]', error.message);
    return NextResponse.json({ ok: true });
  }

  if (type === 'page_view') {
    const siteId = String(body.site_id || '');
    const pageId = trunc(body.page_id, 80);
    if (!siteId || !pageId) return NextResponse.json({ ok: false }, { status: 400 });

    const { data: siteRow } = await supabase.from('mini_sites').select('published').eq('id', siteId).maybeSingle();
    if (!siteRow?.published) return NextResponse.json({ ok: true });

    const { error } = await supabase.from('site_page_views').insert({
      site_id: siteId,
      page_id: pageId,
      slug: trunc(body.slug, 120),
      referrer: trunc(body.referrer, 500),
      device: trunc(body.device, 200),
      country,
      city,
      utm_source: trunc(body.utm_source, 120),
      utm_medium: trunc(body.utm_medium, 120),
      utm_campaign: trunc(body.utm_campaign, 120),
    });
    if (error) console.error('[track-analytics page_view]', error.message);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
