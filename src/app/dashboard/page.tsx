'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMySite } from '@/hooks/useSite';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { WindowFeed } from '@/components/layout/WindowFeed';
import { FeedSection } from '@/components/site/FeedSection';
import {
  Edit3, ExternalLink, Key, TrendingUp,
  Trash2, Plus, Loader2,
  Home, Car, Video, FileText, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { youtubeWatchUrlToEmbedUrl } from '@/lib/embedHtml';
import { readSiteAiBudget } from '@/lib/aiUsdBudget';
import { estimatedCoachCopilotTurnsRemaining } from '@/lib/aiEconomics';
import { subscriptionPlanLabel } from '@/lib/subscriptionPlan';

type SlugRow = {
  id: string; slug: string; status: string;
  for_sale: boolean; sale_price: number | null;
  renewal_fee: number; expires_at: string;
  grace_ends_at?: string; created_at: string;
};

function daysLeft(d?: string) {
  if (!d) return 999;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

type SlugMarkerKey = 'slug_marker_auction' | 'slug_marker_sale' | 'slug_marker_live' | 'slug_marker_held';

function slugDashMarker(s: SlugRow, siteSlug: string): { bg: string; titleKey: SlugMarkerKey } {
  if (s.status === 'auction') return { bg: '#f59e0b', titleKey: 'slug_marker_auction' };
  if (s.for_sale) return { bg: '#22c55e', titleKey: 'slug_marker_sale' };
  if (s.slug === siteSlug) return { bg: '#818cf8', titleKey: 'slug_marker_live' };
  return { bg: '#64748b', titleKey: 'slug_marker_held' };
}

function refHost(ref: string | null | undefined): string {
  if (!ref) return '—';
  try {
    return new URL(ref).hostname;
  } catch {
    return ref.length > 52 ? `${ref.slice(0, 49)}…` : ref;
  }
}

function geoLine(country: string | null | undefined, city: string | null | undefined): string {
  const c = (country || '').trim();
  const t = (city || '').trim();
  if (c && t) return `${c} · ${t}`;
  if (c) return c;
  if (t) return t;
  return '—';
}

function aggregateKeys(rows: any[], keyFn: (r: any) => string, limit = 10): { key: string; n: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r) || '—';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n).slice(0, limit);
}

function getPostMedia(post: any): string[] {
  if (Array.isArray(post?.media_urls)) return post.media_urls;
  if (typeof post?.media_urls === 'string') {
    try {
      const parsed = JSON.parse(post.media_urls);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return post?.image_url ? [post.image_url] : [];
}

type DashSiteRow = { id: string; site_name: string; slug: string };

export default function DashboardPage() {
  const T = useT();
  const { user, loading: authLoading } = useAuth();
  const [pickReady, setPickReady] = useState(false);
  const [dashboardSites, setDashboardSites] = useState<DashSiteRow[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const { site, loading: siteLoading } = useMySite({
    siteId: selectedSiteId ?? undefined,
    skip: !pickReady,
  });
  const router = useRouter();

  const [slugs, setSlugs] = useState<SlugRow[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({ total: 0, videos: 0, cv: 0 });
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState<number | null>(null);
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<{
    status: string;
    expires_at: string | null;
    plan?: string | null;
  } | null>(null);
  const [cancelingSub, setCancelingSub] = useState(false);
  const [tab, setTab] = useState<'overview' | 'slugs' | 'feed' | 'listings'>('overview');
  const [auctionWinsPending, setAuctionWinsPending] = useState<any[]>([]);
  const { add: addToCart, open: openCart } = useCart();

  const [topGeo, setTopGeo] = useState<{ key: string; n: number }[]>([]);
  const [topRefs, setTopRefs] = useState<{ key: string; n: number }[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [linkClickRows, setLinkClickRows] = useState<{ title: string; url: string; n: number; sampleOrigin: string }[]>([]);
  const [pageViewRows, setPageViewRows] = useState<{ pageId: string; label: string; n: number }[]>([]);
  const [postViewMap, setPostViewMap] = useState<Record<string, number>>({});

  const loadSlugs = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from('slug_registrations').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setSlugs(data || []);
  };

  const loadAuctionWins = async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any)
      .from('slug_auctions')
      .select('id, slug, current_bid, ends_at')
      .eq('winner_id', user.id)
      .eq('status', 'ended')
      .order('ends_at', { ascending: false });
    setAuctionWinsPending(data || []);
  };

  const loadPosts = async () => {
    if (!site?.id) return;
    const now = new Date().toISOString();
    const { data } = await (supabase as any).from('feed_posts').select('*').eq('site_id', site.id)
      .or(`pinned.eq.true,expires_at.gt.${now}`)
      .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(20);
    setPosts(data || []);
  };

  useEffect(() => {
    if (!user) return;
    loadSlugs();
    loadAuctionWins();
    // earnings
    (supabase as any).from('paywall_unlocks').select('amount_paid, source').eq('creator_id', user.id)
      .then(({ data }: any) => {
        const rows = data || [];
        setEarnings({
          total: rows.reduce((a: number, r: any) => a + (r.amount_paid || 0), 0),
          videos: rows.filter((r: any) => r.source === 'video').reduce((a: number, r: any) => a + (r.amount_paid || 0), 0),
          cv: rows.filter((r: any) => r.source === 'cv').reduce((a: number, r: any) => a + (r.amount_paid || 0), 0),
        });
      });
    // listings
    (supabase as any).from('classified_listings').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).then(({ data }: any) => setListings(data || []));
    (supabase as any).from('subscriptions').select('status, expires_at, plan').eq('user_id', user.id).maybeSingle()
      .then(({ data }: any) => setSubscription(data || null));
  }, [user]);

  useEffect(() => { if (site?.id) loadPosts(); }, [site?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase as any)
        .from('mini_sites')
        .select('id, site_name, slug, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (cancelled) return;
      const rows = (data || []) as DashSiteRow[];
      setDashboardSites(rows);
      let id: string | null = rows[0]?.id ?? null;
      try {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('tb_dash_site') : null;
        if (stored && rows.some((r) => r.id === stored)) id = stored;
      } catch { /* ignore */ }
      setSelectedSiteId(id);
      setPickReady(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;
    const sid = site.id;
    const sitePagesJson = site.site_pages;

    void (supabase as any).from('site_visits').select('id', { count: 'exact', head: true }).eq('site_id', sid)
      .then(({ count }: any) => {
        if (!cancelled) setVisitCount(typeof count === 'number' ? count : 0);
      });
    void (supabase as any).from('site_link_clicks').select('id', { count: 'exact', head: true }).eq('site_id', sid)
      .then(({ count }: any) => {
        if (!cancelled) setClickCount(typeof count === 'number' ? count : 0);
      });
    void (supabase as any).from('paywall_unlocks').select('id', { count: 'exact', head: true }).eq('creator_id', user?.id)
      .then(({ count }: any) => {
        if (!cancelled) setPurchaseCount(typeof count === 'number' ? count : 0);
      });

    void (async () => {
      const [vRes, cRes, pvRes, fpvRes, linksRes] = await Promise.all([
        (supabase as any).from('site_visits').select('country,city,referrer,created_at').eq('site_id', sid).order('created_at', { ascending: false }).limit(500),
        (supabase as any).from('site_link_clicks').select('link_id,destination_url,referrer,country,city,created_at').eq('site_id', sid).limit(800),
        (supabase as any).from('site_page_views').select('page_id,referrer,country,city,created_at').eq('site_id', sid).limit(500),
        (supabase as any).from('feed_post_views').select('post_id').eq('site_id', sid).limit(5000),
        (supabase as any).from('mini_site_links').select('id,title,url').eq('site_id', sid),
      ]);
      if (cancelled) return;

      const visits = vRes.error ? [] : (vRes.data || []);
      const clicks = cRes.error ? [] : (cRes.data || []);
      const pviews = pvRes.error ? [] : (pvRes.data || []);
      const fpviews = fpvRes.error ? [] : (fpvRes.data || []);
      const linkRows = linksRes.data || [];

      setTopGeo(aggregateKeys(visits, (r) => geoLine(r.country, r.city), 12));
      setTopRefs(aggregateKeys(visits, (r) => refHost(r.referrer), 12));
      setRecentVisits(visits.slice(0, 14));

      const linkMeta = new Map<string, { title: string; url: string }>();
      for (const l of linkRows) linkMeta.set(l.id, { title: l.title || 'Link', url: l.url || '' });

      const byLink = new Map<string, number>();
      const originByLink = new Map<string, Map<string, number>>();
      const firstDest = new Map<string, string>();
      for (const c of clicks) {
        const lid = String(c.link_id || '');
        if (!lid) continue;
        byLink.set(lid, (byLink.get(lid) || 0) + 1);
        if (c.destination_url && !firstDest.has(lid)) firstDest.set(lid, String(c.destination_url));
        const orig = geoLine(c.country, c.city) !== '—' ? geoLine(c.country, c.city) : refHost(c.referrer);
        if (!originByLink.has(lid)) originByLink.set(lid, new Map());
        const om = originByLink.get(lid)!;
        om.set(orig, (om.get(orig) || 0) + 1);
      }
      const linkStats = [...byLink.entries()].map(([linkId, n]) => {
        const meta = linkMeta.get(linkId);
        const title = meta?.title || (firstDest.get(linkId) ? String(firstDest.get(linkId)).slice(0, 56) : 'Link');
        const url = meta?.url || firstDest.get(linkId) || '';
        const om = originByLink.get(linkId);
        let sampleOrigin = '—';
        if (om && om.size) {
          const top = [...om.entries()].sort((a, b) => b[1] - a[1])[0];
          sampleOrigin = top[0];
        }
        return { title, url, n, sampleOrigin };
      }).sort((a, b) => b.n - a.n).slice(0, 20);
      setLinkClickRows(linkStats);

      let pageLabelMap: Record<string, string> = {};
      try {
        const arr = JSON.parse(typeof sitePagesJson === 'string' ? sitePagesJson : '[]');
        if (Array.isArray(arr)) {
          for (const p of arr) if (p?.id) pageLabelMap[p.id] = p.label || p.id;
        }
      } catch { /* ignore */ }

      const byPage = aggregateKeys(pviews, (r) => String(r.page_id || '—'), 15);
      setPageViewRows(byPage.map(({ key, n }) => ({ pageId: key, label: pageLabelMap[key] || key, n })));

      const pm: Record<string, number> = {};
      for (const r of fpviews) {
        const pid = (r as { post_id?: string }).post_id;
        if (!pid) continue;
        pm[pid] = (pm[pid] || 0) + 1;
      }
      setPostViewMap(pm);
    })();

    return () => { cancelled = true; };
  }, [site?.id, site?.site_pages, user?.id]);

  const editorHref = site?.id ? `/editor?site=${site.id}` : '/editor';

  if (authLoading || !pickReady || siteLoading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
  );
  if (!user) { router.push('/auth'); return null; }

  const expiring = slugs.filter(s => daysLeft(s.expires_at) <= 30).length;

  const TABS = [
    { id: 'overview', label: T('dashboard_overview'), icon: TrendingUp },
    { id: 'slugs', label: `${T('dashboard_slug_vault')} (${slugs.length})`, icon: Key },
    { id: 'feed', label: `📝 ${T('dashboard_feed')}`, icon: FileText },
    { id: 'listings', label: `🏠 ${T('dashboard_listings')} (${listings.length})`, icon: Home },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-black text-3xl text-[var(--text)]">{T('dashboard_title')}</h1>
            <p className="text-[var(--text2)] text-base">{user.email}</p>
          </div>
          <Link href={editorHref} className="btn-primary gap-2 text-base"><Edit3 className="w-4 h-4" />{T('dashboard_edit')}</Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-base font-semibold border-b-2 whitespace-nowrap -mb-px transition-all ${tab === t.id ? 'border-brand text-brand' : 'border-transparent text-[var(--text2)] hover:text-[var(--text)]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {dashboardSites.length > 1 && (
          <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
            <label htmlFor="tb-dash-site" className="text-sm font-semibold text-[var(--text2)]">{T('dash_site_pick')}</label>
            <select
              id="tb-dash-site"
              value={selectedSiteId || ''}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedSiteId(v || null);
                try {
                  localStorage.setItem('tb_dash_site', v);
                } catch { /* ignore */ }
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] text-sm font-medium px-3 py-2 min-w-[200px]"
            >
              {dashboardSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_name} · {s.slug}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Site card */}
            <div className="card p-5 flex items-center gap-4">
              {site?.avatar_url
                ? <img src={site.avatar_url} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                : <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center text-2xl font-black text-white flex-shrink-0">{site?.site_name?.[0] || '?'}</div>}
              <div className="flex-1 min-w-0">
                <p className="font-black text-lg text-[var(--text)]">{site?.site_name || T('dash_my_site')}</p>
                <p className="text-sm text-brand font-mono">{site?.slug}.trustbank.xyz</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${site?.published ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {site?.published ? T('dash_published') : T('dash_draft')}
                </span>
              </div>
              <div className="flex gap-2">
                <Link href={editorHref} className="btn-secondary text-sm py-2 px-3">{T('dashboard_edit')}</Link>
                {site?.slug && <a href={`https://${site.slug}.trustbank.xyz`} target="_blank" className="btn-secondary text-sm py-2 px-3"><ExternalLink className="w-4 h-4" /></a>}
              </div>
            </div>

            {site?.id && (() => {
              const aiB = readSiteAiBudget(site);
              const est = estimatedCoachCopilotTurnsRemaining(aiB.freeUsd, aiB.paidUsd);
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 text-xs">
                  <span className="font-semibold text-[var(--text2)]">{T('dash_ia_strip_title')}</span>
                  <span className="text-violet-300/95 tabular-nums font-bold">
                    {T('dash_ia_strip_est').replace('{n}', String(est))}
                  </span>
                  <span className="text-[var(--text2)] tabular-nums">
                    {T('dash_ia_strip_bal')
                      .replace('{free}', aiB.freeUsd.toFixed(2))
                      .replace('{paid}', aiB.paidUsd.toFixed(2))}
                  </span>
                  <Link href="/creditos" className="font-bold text-brand hover:underline">{T('dash_ia_strip_cta')}</Link>
                </div>
              );
            })()}

            {/* Earnings */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: T('dashboard_visits'), value: visitCount, color: 'text-cyan-400', kind: 'int' as const },
                { label: T('dashboard_clicks'), value: clickCount, color: 'text-violet-400', kind: 'int' as const },
                { label: T('dashboard_purchases'), value: purchaseCount, color: 'text-emerald-400', kind: 'int' as const },
                { label: T('dashboard_total'), value: earnings.total, color: 'text-brand', kind: 'money' as const },
                { label: T('dashboard_videos'), value: earnings.videos, color: 'text-red-400', kind: 'money' as const },
                { label: T('dashboard_cvs'), value: earnings.cv, color: 'text-blue-400', kind: 'money' as const },
              ].map(e => (
                <div key={e.label} className="card p-4 text-center">
                  <p className="text-xs text-[var(--text2)] mb-1">{e.label}</p>
                  <p className={`text-2xl font-black ${e.color}`}>
                    {e.kind === 'int' ? (e.value ?? '—') : `$${(e.value as number).toFixed(2)}`}
                  </p>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <p className="text-xs text-[var(--text2)] mb-1">{T('dashboard_funnel')}</p>
              <p className="text-sm text-[var(--text)]">
                {T('dash_funnel_line')
                  .replace('{visits}', String(visitCount ?? 0))
                  .replace('{clicks}', String(clickCount ?? 0))
                  .replace('{purchases}', String(purchaseCount ?? 0))}
              </p>
            </div>

            <div className="card p-4 space-y-4">
              <p className="text-sm font-bold text-[var(--text)]">{T('dash_analytics_detail_title')}</p>
              <p className="text-xs text-[var(--text2)]">{T('dash_analytics_hint')}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-[var(--text2)] mb-2 uppercase tracking-wide">{T('dash_analytics_geo')}</p>
                  <ul className="space-y-1.5 text-sm">
                    {topGeo.length === 0 ? <li className="text-[var(--text2)]">—</li> : topGeo.map((row) => (
                      <li key={row.key} className="flex justify-between gap-2 text-[var(--text)]">
                        <span className="truncate">{row.key}</span>
                        <span className="text-cyan-400 font-mono flex-shrink-0">{row.n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text2)] mb-2 uppercase tracking-wide">{T('dash_analytics_refs')}</p>
                  <ul className="space-y-1.5 text-sm">
                    {topRefs.length === 0 ? <li className="text-[var(--text2)]">—</li> : topRefs.map((row) => (
                      <li key={row.key} className="flex justify-between gap-2 text-[var(--text)]">
                        <span className="truncate font-mono text-xs">{row.key}</span>
                        <span className="text-violet-400 font-mono flex-shrink-0">{row.n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text2)] mb-2 uppercase tracking-wide">{T('dash_analytics_recent')}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[var(--text2)] border-b border-[var(--border)]">
                        <th className="py-2 pr-2">{T('dash_col_when')}</th>
                        <th className="py-2 pr-2">{T('dash_analytics_geo')}</th>
                        <th className="py-2">{T('dash_col_origin')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVisits.length === 0 ? (
                        <tr><td colSpan={3} className="py-2 text-[var(--text2)]">—</td></tr>
                      ) : recentVisits.map((v: any) => (
                        <tr key={v.id || `${v.created_at}-${v.referrer}`} className="border-b border-[var(--border)]/60">
                          <td className="py-2 pr-2 text-[var(--text2)] whitespace-nowrap">{v.created_at ? new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                          <td className="py-2 pr-2 text-[var(--text)]">{geoLine(v.country, v.city)}</td>
                          <td className="py-2 text-[var(--text)] font-mono truncate max-w-[200px]" title={v.referrer || ''}>{refHost(v.referrer)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text2)] mb-2 uppercase tracking-wide">{T('dash_analytics_links')}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-[var(--text2)] border-b border-[var(--border)]">
                        <th className="py-2 pr-2">{T('dash_col_link')}</th>
                        <th className="py-2 pr-2">{T('dash_col_count')}</th>
                        <th className="py-2">{T('dash_col_top_origin')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkClickRows.length === 0 ? (
                        <tr><td colSpan={3} className="py-2 text-[var(--text2)]">—</td></tr>
                      ) : linkClickRows.map((row, i) => (
                        <tr key={`${row.title}-${i}`} className="border-b border-[var(--border)]/60">
                          <td className="py-2 pr-2 text-[var(--text)]">
                            <span className="font-semibold block truncate max-w-[220px]" title={row.url}>{row.title}</span>
                          </td>
                          <td className="py-2 pr-2 text-violet-400 font-mono font-bold">{row.n}</td>
                          <td className="py-2 text-[var(--text2)] truncate max-w-[180px]" title={row.sampleOrigin}>{row.sampleOrigin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text2)] mb-2 uppercase tracking-wide">{T('dash_analytics_pages')}</p>
                <ul className="space-y-1.5 text-sm">
                  {pageViewRows.length === 0 ? <li className="text-[var(--text2)]">—</li> : pageViewRows.map((row) => (
                    <li key={row.pageId} className="flex justify-between gap-2 text-[var(--text)]">
                      <span className="truncate">{row.label}</span>
                      <span className="text-blue-400 font-mono flex-shrink-0">{row.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="card p-4">
              <p className="text-sm font-bold text-[var(--text)] mb-2">{T('dash_plan_title')}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-[var(--text2)]">
                  <span className="text-[var(--text)] font-semibold">
                    {T('dash_plan_kind')}: {subscriptionPlanLabel(subscription?.plan, T)}
                  </span>
                  {' · '}
                  {subscription?.status === 'cancelled' ? T('dash_plan_status_cancelled') : T('dash_plan_status_active')}
                  {subscription?.expires_at ? ` · ${new Date(subscription.expires_at).toLocaleDateString()}` : ''}
                </div>
                <button
                  disabled={cancelingSub || !user || subscription?.status === 'cancelled'}
                  onClick={async () => {
                    if (!user) return;
                    const ok = window.confirm(T('dash_cancel_plan_hint'));
                    if (!ok) return;
                    setCancelingSub(true);
                    const end = new Date(Date.now() + 30 * 86400000).toISOString();
                    const { error } = await (supabase as any)
                      .from('subscriptions')
                      .upsert({ user_id: user.id, status: 'cancelled', expires_at: end, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
                    setCancelingSub(false);
                    if (error) { toast.error(error.message); return; }
                    setSubscription((prev) => ({ ...(prev || {}), status: 'cancelled', expires_at: end }));
                    toast.success(T('dash_cancel_plan_done').replace('{date}', new Date(end).toLocaleDateString()));
                  }}
                  className="btn-secondary text-sm py-2 disabled:opacity-50"
                >
                  {T('dash_cancel_plan_btn')}
                </button>
              </div>
              <p className="text-xs text-[var(--text2)] mt-2">{T('dash_cancel_plan_hint')}</p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: editorHref, icon: Edit3, label: T('dash_quick_editor'), color: 'text-brand' },
                { href: '/slugs', icon: Key, label: T('nav_market'), color: 'text-amber-400' },
                { href: '/imoveis/novo', icon: Home, label: T('dash_quick_property'), color: 'text-blue-400' },
                { href: '/carros/novo', icon: Car, label: T('dash_quick_car'), color: 'text-green-400' },
              ].map(q => (
                <Link key={q.href} href={q.href} className="card p-4 flex flex-col items-center gap-2 hover:border-brand/40 transition-all text-center">
                  <q.icon className={`w-6 h-6 ${q.color}`} />
                  <span className="text-xs font-bold text-[var(--text2)]">{q.label}</span>
                </Link>
              ))}
            </div>

            {expiring > 0 && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-amber-400 text-sm">{T('dash_expiring_title').replace('{n}', String(expiring))}</p>
                  <p className="text-xs text-[var(--text2)]">{T('dash_expiring_sub')}</p>
                </div>
                <Link href="/slugs" className="btn-secondary text-xs py-1.5">{T('dash_view')}</Link>
              </div>
            )}
          </div>
        )}

        {/* Slug market (resumo — gestão completa em /slugs) */}
        {tab === 'slugs' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black text-lg text-[var(--text)]">{T('dash_vault_title')}</p>
                <p className="text-sm text-[var(--text2)] mt-1">{T('dash_vault_sub')}</p>
              </div>
              <Link href="/slugs" className="btn-primary gap-2 text-base py-2.5 px-4"><Plus className="w-4 h-4" />{T('dash_open_slug_market')}</Link>
            </div>

            {auctionWinsPending.length > 0 && (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-3">
                <p className="font-bold text-amber-200">{T('dash_auction_wins_title')}</p>
                <p className="text-sm text-amber-100/90">{T('dash_auction_wins_sub')}</p>
                <ul className="space-y-2">
                  {auctionWinsPending.map((a) => {
                    const bid = Number(a.current_bid || 0);
                    return (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-base">
                        <span className="font-mono text-[var(--text)]">{a.slug}.trustbank.xyz</span>
                        <span className="text-[var(--text2)]">${bid.toFixed(2)} USD</span>
                        <button
                          type="button"
                          onClick={() => {
                            addToCart({
                              id: `slug_auction_pay_${a.id}`,
                              label: `Auction win: ${a.slug}.trustbank.xyz`,
                              price: bid,
                              type: 'slug',
                            });
                            openCart();
                          }}
                          className="btn-primary text-sm py-1.5 px-3"
                        >
                          {T('dash_auction_pay_btn')}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {slugs.length === 0 ? (
              <div className="card p-10 text-center">
                <Key className="w-12 h-12 text-[var(--text2)] mx-auto mb-3 opacity-20" />
                <p className="font-bold text-[var(--text)] mb-2">{T('dash_no_slugs')}</p>
                <Link href="/slugs" className="btn-primary gap-2 inline-flex mt-2"><Plus className="w-4 h-4" />{T('dash_go_marketplace')}</Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                  {[
                    { label: T('dash_stat_total'), value: slugs.length, color: 'text-brand' },
                    { label: T('dash_stat_est_value'), value: `$${slugs.reduce((a, s) => a + (s.slug.length <= 3 ? 3000 : s.slug.length <= 5 ? 500 : 50), 0).toLocaleString()}`, color: 'text-amber-400' },
                    { label: T('dash_stat_for_sale'), value: slugs.filter(s => s.for_sale).length, color: 'text-green-400' },
                    { label: T('dash_stat_expiring'), value: expiring, color: expiring > 0 ? 'text-red-400' : 'text-[var(--text2)]' },
                  ].map(s => (
                    <div key={s.label} className="card p-3 text-center">
                      <p className="text-sm text-[var(--text2)]">{s.label}</p>
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-[var(--text2)]">{T('dash_slug_list_hint')}</p>
                <ul className="space-y-2">
                  {slugs.slice(0, 18).map((s) => {
                    const m = slugDashMarker(s, site?.slug || '');
                    const d = daysLeft(s.expires_at);
                    return (
                      <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
                        <span
                          className="w-3.5 h-3.5 rounded-sm flex-shrink-0 ring-1 ring-white/15 shadow-sm"
                          style={{ backgroundColor: m.bg }}
                          title={T(m.titleKey)}
                        />
                        <div className="flex-1 min-w-0">
                          <Link href="/slugs" className="font-mono font-bold text-base text-brand hover:underline">
                            {s.slug}.trustbank.xyz
                          </Link>
                          <div className="text-sm text-[var(--text2)] mt-0.5">
                            {d <= 30
                              ? <span className="text-amber-400 font-semibold">{T('dash_expires_days').replace('{n}', String(d))}</span>
                              : T('dash_valid_days').replace('{n}', String(d))}
                            {s.for_sale && (
                              <span className="text-green-400 font-semibold ml-2">
                                · {s.status === 'auction' ? T('dash_auction_badge') : `$${Number(s.sale_price || 0).toLocaleString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={`https://${s.slug}.trustbank.xyz`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--text2)] hover:text-brand p-2 rounded-lg border border-[var(--border)]"
                          aria-label={T('dash_view_site')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
                {slugs.length > 18 && (
                  <div className="text-center pt-1">
                    <Link href="/slugs" className="text-brand font-bold text-base hover:underline">
                      {T('dash_slug_see_all').replace('{n}', String(slugs.length - 18))}
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* FEED */}
        {tab === 'feed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-[var(--text)]">{T('dash_feed_title')}</p>
                <p className="text-xs text-[var(--text2)]">{T('dash_feed_hint')}</p>
              </div>
              {site?.slug && (
                <a 
  href={`https://${site.slug}.trustbank.xyz`} 
  target="_blank"
  rel="noopener noreferrer"
  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] transition-colors flex items-center gap-1.5"
>
  {T('dash_view_site')}
</a>
              )}
            </div>

            {site?.id && (
              <FeedSection
                siteId={site.id}
                canPost={true}
                accentColor={site.accent_color || '#818cf8'}
                onPost={loadPosts}
              />
            )}

            {posts.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-[var(--text2)] uppercase tracking-wide">{T('dash_posts_published').replace('{n}', String(posts.length))}</p>
                {posts.map((p: any) => (
                  <div key={p.id} className={`p-4 rounded-xl border ${p.pinned ? 'border-brand/30 bg-brand/5' : 'border-[var(--border)] bg-[var(--bg2)]'}`}>
                    {p.pinned && <p className="text-xs text-brand font-bold mb-2">{T('dash_pinned')}</p>}
                    <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{p.text}</p>
                    {getPostMedia(p).length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {getPostMedia(p).slice(0, 3).map((url: string, i: number) => (
                          <img key={i} src={url} className="w-full rounded-xl aspect-square object-contain bg-black/10" />
                        ))}
                      </div>
                    )}
                    {p.video_embed_url && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-[var(--border)]">
                        <iframe src={youtubeWatchUrlToEmbedUrl(p.video_embed_url)} width="100%" height="230" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" style={{ border: 'none', display: 'block' }} />
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]">
                      <span className="text-xs text-[var(--text2)]">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                        <span className="text-cyan-500/90 font-bold ml-2">{T('dash_feed_views_label')}: {postViewMap[p.id] ?? 0}</span>
                      </span>
                      <button onClick={async () => {
                        await (supabase as any).from('feed_posts').delete().eq('id', p.id);
                        loadPosts();
                      }} className="text-red-400 hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center text-[var(--text2)] text-sm">
                {T('dash_no_posts')}
              </div>
            )}
          </div>
        )}

        {/* LISTINGS */}
        {tab === 'listings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-[var(--text)]">{T('dash_listings_title')}</p>
                <p className="text-xs text-[var(--text2)]">{T('dash_listings_sub')}</p>
              </div>
              <div className="flex gap-2">
                <Link href="/imoveis/novo" className="btn-secondary gap-1 text-xs py-2"><Plus className="w-3.5 h-3.5" />{T('dash_property_btn')}</Link>
                <Link href="/carros/novo" className="btn-secondary gap-1 text-xs py-2"><Plus className="w-3.5 h-3.5" />{T('dash_car_btn')}</Link>
              </div>
            </div>

            {listings.length === 0 ? (
              <div className="card p-10 text-center">
                <Home className="w-12 h-12 text-[var(--text2)] mx-auto mb-3 opacity-20" />
                <p className="font-bold text-[var(--text)] mb-2">{T('dash_no_listings')}</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Link href="/imoveis/novo" className="btn-primary gap-2 inline-flex text-sm"><Home className="w-4 h-4" />{T('dash_list_property')}</Link>
                  <Link href="/carros/novo" className="btn-secondary gap-2 inline-flex text-sm"><Car className="w-4 h-4" />{T('dash_list_car')}</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map((l: any) => (
                  <div key={l.id} className="card p-4 flex items-center gap-3">
                    {l.images?.[0]
                      ? <img src={l.images[0]} className="w-16 h-12 rounded-xl object-cover flex-shrink-0" />
                      : <div className="w-16 h-12 rounded-xl bg-[var(--bg2)] flex items-center justify-center flex-shrink-0">
                          {l.type === 'carro' ? <Car className="w-5 h-5 text-[var(--text2)]" /> : <Home className="w-5 h-5 text-[var(--text2)]" />}
                        </div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text)] truncate">{l.title}</p>
                      <p className="text-xs text-[var(--text2)]">{l.currency} {l.price?.toLocaleString()} · {l.type} · {l.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{l.status}</span>
                      <button onClick={async () => {
                        await (supabase as any).from('classified_listings').delete().eq('id', l.id);
                        setListings(prev => prev.filter(x => x.id !== l.id));
                      }} className="text-red-400 hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
