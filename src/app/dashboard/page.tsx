'use client';
import { useEffect, useState, useRef } from 'react';
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
  Globe, Edit3, ExternalLink, Key, TrendingUp, DollarSign,
  Tag, Gavel, ArrowRightLeft, Trash2, Plus, Loader2,
  Home, Car, Video, FileText, X, AlertTriangle,
  CheckCircle, RefreshCw, Sparkles, Clock, Shield, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { youtubeWatchUrlToEmbedUrl } from '@/lib/embedHtml';

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

function rarity(slug: string, T: (k: string) => string) {
  const l = slug.length;
  if (l <= 2) return { label: T('dash_rarity_legendary'), color: '#f59e0b', icon: '👑' };
  if (l <= 3) return { label: T('dash_rarity_ultra'), color: '#a855f7', icon: '💎' };
  if (l <= 4) return { label: T('dash_rarity_premium'), color: '#818cf8', icon: '🔷' };
  if (l <= 5) return { label: T('dash_rarity_popular'), color: '#38bdf8', icon: '🔹' };
  if (l <= 6) return { label: T('dash_rarity_standard'), color: '#4ade80', icon: '🔑' };
  return { label: T('dash_rarity_free'), color: '#94a3b8', icon: '🔓' };
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

function SlugCard({ s, onUpdate, siteSlug }: { s: SlugRow; onUpdate: () => void; siteSlug: string }) {
  const T = useT();
  const { add, open } = useCart();
  const { user } = useAuth();
  const [mode, setMode] = useState<'idle' | 'sell' | 'auction' | 'transfer'>('idle');
  const [price, setPrice] = useState(String(s.sale_price || ''));
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const days = daysLeft(s.expires_at);
  const r = rarity(s.slug, T);
  const isActive = s.slug === siteSlug;
  const warn = days <= 30;

  const upd = async (patch: any) => {
    setBusy(true);
    const { error } = await (supabase as any).from('slug_registrations').update(patch).eq('id', s.id);
    if (error) toast.error(error.message);
    else { toast.success(T('toast_done')); onUpdate(); setMode('idle'); }
    setBusy(false);
  };

  const applyToSite = async () => {
    const { data: site } = await (supabase as any).from('mini_sites').select('id').eq('user_id', user?.id).maybeSingle();
    if (!site) { toast.error(T('err_mini_site_required')); return; }
    const { error } = await (supabase as any).from('mini_sites').update({ slug: s.slug }).eq('id', site.id);
    if (error) toast.error(error.message);
    else { toast.success(T('toast_slug_active').replace('{slug}', s.slug)); onUpdate(); }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${warn ? 'border-amber-500/40' : s.for_sale ? 'border-green-500/30' : 'border-[var(--border)]'} bg-[var(--bg2)]`}>
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: r.color + '20', border: `1px solid ${r.color}40` }}>{r.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-[var(--text)] font-mono">{s.slug}.trustbank.xyz</span>
            {isActive && <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">{T('dash_active_badge')}</span>}
            {s.for_sale && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold">🏷️ ${s.sale_price?.toLocaleString()}</span>}
            {s.status === 'auction' && <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">{T('dash_auction_badge')}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold" style={{ color: r.color }}>{r.label}</span>
            <span className="text-xs text-[var(--text2)]">·</span>
            {warn
              ? <span className="text-xs text-amber-400 flex items-center gap-1"><Clock className="w-3 h-3" />{T('dash_expires_days').replace('{n}', String(days))}</span>
              : <span className="text-xs text-[var(--text2)]">{T('dash_valid_days').replace('{n}', String(days))}</span>}
            <span className="text-xs text-[var(--text2)] ml-auto">{T('dash_per_year')}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] p-3 bg-[var(--bg)]">
        {mode === 'idle' && (
          <div className="flex flex-wrap gap-1.5">
            {!isActive && <button onClick={applyToSite} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/30 text-xs font-bold text-brand"><Globe className="w-3 h-3" />{T('dash_use_site')}</button>}
            {warn && <button onClick={() => { add({ id: `slug_renewal_${s.slug}`, label: T('slug_cart_renew_label').replace('{slug}', s.slug), price: 7, type: 'slug' }); open(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs font-bold text-green-400"><RefreshCw className="w-3 h-3" />{T('dash_renew_7')}</button>}
            <button onClick={() => setMode('sell')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text)]"><Tag className="w-3 h-3" />{T('dash_sell')}</button>
            <button onClick={() => setMode('auction')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text)]"><Gavel className="w-3 h-3" />{T('dash_auction')}</button>
            <button onClick={() => setMode('transfer')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text)]"><ArrowRightLeft className="w-3 h-3" />{T('dash_transfer')}</button>
            {s.for_sale && <button onClick={() => upd({ for_sale: false, sale_price: null, status: 'active' })} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400"><X className="w-3 h-3" />{T('dash_remove_listing')}</button>}
            <a href={`https://${s.slug}.trustbank.xyz`} target="_blank" rel="noopener" className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-[var(--border)] text-xs text-[var(--text2)] hover:text-brand ml-auto"><ExternalLink className="w-3 h-3" /></a>
          </div>
        )}
        {mode === 'sell' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text2)]">$</span>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="input flex-1 py-1.5 text-sm" placeholder={T('dash_price_placeholder')} />
            <button onClick={() => {
              const p = parseFloat(price);
              if (!Number.isFinite(p) || p <= 0) { toast.error(T('slug_err_sale_price')); return; }
              void upd({ for_sale: true, sale_price: p, status: 'active' });
            }} disabled={busy || !price} className="btn-primary px-4 py-1.5 text-xs">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : T('dash_ok')}</button>
            <button onClick={() => setMode('idle')} className="text-[var(--text2)]"><X className="w-4 h-4" /></button>
          </div>
        )}
        {mode === 'auction' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="input flex-1 py-1.5 text-sm" placeholder={T('dash_opening_bid_placeholder')} />
              <button onClick={async () => {
                if (!user || !price) return;
                setBusy(true);
                const ends = new Date(Date.now() + 7 * 86400000).toISOString();
                const minBid = parseFloat(price);
                const { error: e1 } = await (supabase as any).from('slug_auctions').insert({
                  slug: s.slug,
                  slug_registration_id: s.id,
                  seller_id: user.id,
                  min_bid: minBid,
                  current_bid: 0,
                  min_increment: 5,
                  bid_count: 0,
                  ends_at: ends,
                  status: 'active',
                });
                if (e1) { toast.error(e1.message); setBusy(false); return; }
                const { error } = await (supabase as any).from('slug_registrations').update({
                  for_sale: true, sale_price: minBid, status: 'auction',
                }).eq('id', s.id);
                if (error) toast.error(error.message);
                else { toast.success(T('toast_auction_created')); onUpdate(); setMode('idle'); }
                setBusy(false);
              }} disabled={busy || !price} className="btn-primary px-4 py-1.5 text-xs">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : T('dash_start_auction')}</button>
              <button onClick={() => setMode('idle')} className="text-[var(--text2)]"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-amber-400">{T('dash_auction_hint')}</p>
          </div>
        )}
        {mode === 'transfer' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input value={email} onChange={e => setEmail(e.target.value)} className="input flex-1 py-1.5 text-sm" placeholder={T('dash_recipient_email')} type="email" />
              <button onClick={async () => {
                if (!email) return; setBusy(true);
                // Find user by email via mini_sites contact_email
                const { data: target } = await (supabase as any).from('mini_sites').select('user_id').eq('contact_email', email).maybeSingle();
                if (!target) { toast.error(T('err_user_not_found')); setBusy(false); return; }
                await upd({ user_id: target.user_id, status: 'active', for_sale: false, sale_price: null });
                setBusy(false);
              }} disabled={busy || !email} className="btn-primary px-4 py-1.5 text-xs">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : T('dash_send')}</button>
              <button onClick={() => setMode('idle')} className="text-[var(--text2)]"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{T('dash_irreversible')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const T = useT();
  const { user, loading: authLoading } = useAuth();
  const { site, loading: siteLoading } = useMySite();
  const router = useRouter();

  const [slugs, setSlugs] = useState<SlugRow[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({ total: 0, videos: 0, cv: 0 });
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState<number | null>(null);
  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<{ status: string; expires_at: string | null } | null>(null);
  const [cancelingSub, setCancelingSub] = useState(false);
  const [tab, setTab] = useState<'overview' | 'slugs' | 'feed' | 'listings'>('overview');
  const [auctionWinsPending, setAuctionWinsPending] = useState<any[]>([]);
  const { add: addToCart, open: openCart } = useCart();

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
    (supabase as any).from('subscriptions').select('status, expires_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }: any) => setSubscription(data || null));
  }, [user]);

  useEffect(() => { if (site?.id) loadPosts(); }, [site?.id]);

  useEffect(() => {
    if (!site?.id) return;
    (supabase as any).from('site_visits').select('id', { count: 'exact', head: true }).eq('site_id', site.id)
      .then(({ count }: any) => setVisitCount(typeof count === 'number' ? count : 0));
    (supabase as any).from('site_link_clicks').select('id', { count: 'exact', head: true }).eq('site_id', site.id)
      .then(({ count }: any) => setClickCount(typeof count === 'number' ? count : 0));
    (supabase as any).from('paywall_unlocks').select('id', { count: 'exact', head: true }).eq('creator_id', user?.id)
      .then(({ count }: any) => setPurchaseCount(typeof count === 'number' ? count : 0));
  }, [site?.id, user?.id]);

  if (authLoading || siteLoading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
  );
  if (!user) { router.push('/auth'); return null; }

  const expiring = slugs.filter(s => daysLeft(s.expires_at) <= 30).length;

  const TABS = [
    { id: 'overview', label: T('dashboard_overview'), icon: TrendingUp },
    { id: 'slugs', label: `🔐 ${T('dashboard_slug_vault')} (${slugs.length})`, icon: Key },
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
          <Link href="/editor" className="btn-primary gap-2 text-base"><Edit3 className="w-4 h-4" />{T('dashboard_edit')}</Link>
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
                <Link href="/editor" className="btn-secondary text-sm py-2 px-3">{T('dashboard_edit')}</Link>
                {site?.slug && <a href={`https://${site.slug}.trustbank.xyz`} target="_blank" className="btn-secondary text-sm py-2 px-3"><ExternalLink className="w-4 h-4" /></a>}
              </div>
            </div>

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

            <div className="card p-4">
              <p className="text-sm font-bold text-[var(--text)] mb-2">{T('dash_plan_title')}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-[var(--text2)]">
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
                    setSubscription({ status: 'cancelled', expires_at: end });
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
                { href: '/editor', icon: Edit3, label: T('dash_quick_editor'), color: 'text-brand' },
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
                <button onClick={() => setTab('slugs')} className="btn-secondary text-xs py-1.5">{T('dash_view')}</button>
              </div>
            )}
          </div>
        )}

        {/* SLUG VAULT */}
        {tab === 'slugs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-[var(--text)]">{T('dash_vault_title')}</p>
                <p className="text-xs text-[var(--text2)]">{T('dash_vault_sub')}</p>
              </div>
              <Link href="/slugs" className="btn-primary gap-2 text-sm py-2"><Plus className="w-4 h-4" />{T('dash_register_slug')}</Link>
            </div>

            {auctionWinsPending.length > 0 && (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-3">
                <p className="font-bold text-amber-200">{T('dash_auction_wins_title')}</p>
                <p className="text-xs text-amber-100/90">{T('dash_auction_wins_sub')}</p>
                <ul className="space-y-2">
                  {auctionWinsPending.map((a) => {
                    const bid = Number(a.current_bid || 0);
                    return (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
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
                          className="btn-primary text-xs py-1.5 px-3"
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
                      <p className="text-xs text-[var(--text2)]">{s.label}</p>
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {slugs.map(s => <SlugCard key={s.id} s={s} onUpdate={loadSlugs} siteSlug={site?.slug || ''} />)}
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
                isOwner={true}
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
                      <span className="text-xs text-[var(--text2)]">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
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
