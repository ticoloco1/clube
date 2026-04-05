'use client';
import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import {
  slugRegistrationDueUsd,
  slugLengthTierUsd,
  isSlugReservedAdminOnly,
} from '@/lib/slugPolicy';
import {
  Search, Crown, ShoppingCart, CheckCircle, XCircle,
  Gavel, Clock, Tag, Globe, Loader2, RefreshCw,
  ChevronRight, ChevronLeft, Flame, Star, ArrowUpRight, Lock, Trash2, Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { attachMiniSitesToSlugRows } from '@/lib/slugRegistrationMiniSite';
import { fetchSlugMarketRows, fetchSlugMarketCount, isRelationshipOrSchemaError } from '@/lib/slugMarketQuery';
import type { MessageKey } from '@/lib/i18n/messages';
import Link from 'next/link';

// ─── Price table ──────────────────────────────────────────────────────────────

const PRICE_TIERS: { len: string; price: number; labelKey: MessageKey; color: string }[] = [
  { len: '1 char',  price: 5000,  labelKey: 'slug_tier_ultra_rare', color: '#f59e0b' },
  { len: '2 chars', price: 4500,  labelKey: 'slug_tier_legendary', color: '#f59e0b' },
  { len: '3 chars', price: 4000,  labelKey: 'slug_tier_premium', color: '#818cf8' },
  { len: '4 chars', price: 3500,  labelKey: 'slug_tier_premium', color: '#818cf8' },
  { len: '5 chars', price: 3000,  labelKey: 'slug_tier_popular', color: '#34d399' },
  { len: '6 chars', price: 2500,  labelKey: 'slug_tier_standard', color: '#60a5fa' },
  { len: '7 chars', price: 2000,  labelKey: 'slug_tier_standard', color: '#60a5fa' },
  { len: '8+ chars', price: 0,     labelKey: 'slug_tier_free', color: '#94a3b8' },
];

function tierForSlugInput(search: string) {
  const l = search.replace(/[^a-z0-9]/g, '').length;
  if (l <= 0) return null;
  if (l >= 8) return PRICE_TIERS[7];
  return PRICE_TIERS[l - 1];
}

const PAGE_SIZE = 500;

function SlugPagination({
  page, total, onPrev, onNext, loading,
}: { page: number; total: number; onPrev: () => void; onNext: () => void; loading?: boolean }) {
  const T = useT();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const label = T('slug_pagination_status')
    .replace('{page}', String(page + 1))
    .replace('{pages}', String(pages))
    .replace('{total}', String(total));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border)]">
      <p className="text-xs text-[var(--text2)]">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" disabled={loading || page <= 0} onClick={onPrev}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--border)] disabled:opacity-40 text-[var(--text)]">
          <ChevronLeft className="w-4 h-4" /> {T('slug_pagination_prev')}
        </button>
        <button type="button" disabled={loading || page >= pages - 1} onClick={onNext}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--border)] disabled:opacity-40 text-[var(--text)]">
          {T('slug_pagination_next')} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SlugRowPremium({ slug, onBuy }: { slug: any; onBuy: (s: any) => void }) {
  const T = useT();
  const name = String(slug.slug || slug.keyword || '');
  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] hover:border-brand/35 transition-colors">
      <span className="font-mono text-sm font-bold text-brand truncate min-w-0">{name}.trustbank.xyz</span>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs font-black text-[var(--text)] tabular-nums">${Number(slug.price || 0).toLocaleString()} USD</span>
        <button type="button" onClick={() => onBuy(slug)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
          {T('slug_buy')}
        </button>
      </div>
    </div>
  );
}

function SlugRowMarket({
  slug, onBuy, showOwnerActions, isAdmin, userId, onRefresh,
}: {
  slug: any;
  onBuy: (s: any) => void;
  showOwnerActions: boolean;
  isAdmin: boolean;
  userId?: string;
  onRefresh: () => void;
}) {
  const T = useT();
  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)] hover:border-brand/35 transition-colors">
      <div className="min-w-0 flex-1">
        <span className="font-mono text-sm font-bold text-brand">{slug.slug}.trustbank.xyz</span>
        {slug.mini_sites?.site_name && (
          <span className="text-[10px] text-[var(--text2)] ml-2">{T('slug_listing_by').replace('{name}', slug.mini_sites.site_name)}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-black text-[var(--text)] tabular-nums">${Number(slug.sale_price).toLocaleString()} USD</span>
        <button type="button" onClick={() => onBuy(slug)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
          {T('slug_buy')}
        </button>
        {showOwnerActions && (isAdmin || (userId && slug.user_id === userId)) && (
          <>
            <button type="button"
              onClick={async () => {
                const { error } = await supabase.from('slug_registrations' as any)
                  .update({ for_sale: false, sale_price: null, status: 'active' })
                  .eq('id', slug.id);
                if (error) {
                  console.error(error);
                  return toast.error(T('id_err_generic'));
                }
                toast.success(T('toast_slug_removed_showcase').replace('{slug}', slug.slug));
                onRefresh();
              }}
              className="text-xs px-2 py-1.5 rounded-lg border border-amber-500/40 text-amber-400">
              {T('slug_remove_listing_short')}
            </button>
            <button type="button"
              onClick={async () => {
                if (!window.confirm(T('slug_confirm_delete_db').replace('{slug}', slug.slug))) return;
                await supabase.from('slug_auctions' as any).delete().eq('slug_registration_id', slug.id);
                const { error } = await supabase.from('slug_registrations' as any).delete().eq('id', slug.id);
                if (error) {
                  console.error(error);
                  return toast.error(T('id_err_generic'));
                }
                toast.success(T('toast_slug_deleted').replace('{slug}', slug.slug));
                onRefresh();
              }}
              className="text-xs p-1.5 rounded-lg border border-red-500/40 text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Slug card ────────────────────────────────────────────────────────────────
function SlugCard({ slug, type, onBuy, isAdmin = false }: { slug: any; type: 'premium' | 'auction'; onBuy: (s: any) => void; isAdmin?: boolean }) {
  const T = useT();
  const [timeLeft, setTimeLeft] = useState('');
  const isAuction = type === 'auction';

  useEffect(() => {
    if (!isAuction || !slug.ends_at) return;
    const update = () => {
      const diff = new Date(slug.ends_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(T('slug_auction_ended')); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [slug.ends_at, isAuction, T]);

  const raw = String(slug.slug || slug.keyword || '');
  const coreLen = raw.replace(/[^a-z0-9]/gi, '').length;
  const tier =
    coreLen <= 0 ? PRICE_TIERS[7] : coreLen >= 8 ? PRICE_TIERS[7] : PRICE_TIERS[coreLen - 1];
  const len = coreLen || raw.length;

  return (
    <div className="card p-5 hover:border-brand/40 transition-all group hover:-translate-y-0.5 duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: tier.color + '20', color: tier.color }}>
            {isAuction ? T('slug_sale_auction') : T(tier.labelKey)}
          </span>
        </div>
        {isAuction && timeLeft && (
          <div className="flex items-center gap-1 text-xs text-amber-400 font-mono">
            <Clock className="w-3 h-3" /> {timeLeft}
          </div>
        )}
      </div>

      <div className="my-4 text-center">
        <span className="font-mono font-black text-2xl text-brand">
          {(slug.slug || slug.keyword)}.trustbank.xyz
        </span>
        <div className="text-xs text-[var(--text2)] mt-1">{len} {len === 1 ? T('slug_char_one') : T('slug_chars_many')}</div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-black text-lg text-[var(--text)]">
            ${(isAuction ? (slug.current_bid || slug.min_bid) : slug.price)?.toLocaleString()} USD
          </div>
          {isAuction && slug.bid_count > 0 && (
            <div className="text-xs text-[var(--text2)]">{slug.bid_count === 1 ? T('slug_bids_one') : T('slug_bids_other').replace('{n}', String(slug.bid_count))}</div>
          )}
        </div>
        <button onClick={() => onBuy(slug)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
          style={{ background: isAuction ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
          {isAuction ? <><Gavel className="w-3.5 h-3.5" /> {T('slug_place_bid')}</> : <><ShoppingCart className="w-3.5 h-3.5" /> {T('slug_buy')}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SlugsPage() {
  const T = useT();
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const ADMIN_BYPASS_EMAIL = 'arytcf@gmail.com';
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    const byEmail = (user.email || '').toLowerCase() === ADMIN_BYPASS_EMAIL;
    if (byEmail) { setIsAdmin(true); return; }
    (supabase as any).from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle().then(({ data }: any) => setIsAdmin(!!data));
  }, [user]);
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [premiumSlugs, setPremiumSlugs] = useState<any[]>([]);
  const [premiumPage, setPremiumPage] = useState(0);
  const [premiumTotal, setPremiumTotal] = useState(0);
  const [premiumLoading, setPremiumLoading] = useState(false);

  const [auctions, setAuctions] = useState<any[]>([]);
  const [auctionsTotal, setAuctionsTotal] = useState(0);

  const [forSale, setForSale] = useState<any[]>([]);
  const [marketPage, setMarketPage] = useState(0);
  const [marketTotal, setMarketTotal] = useState(0);
  const [marketLoading, setMarketLoading] = useState(false);

  const [mySlugCount, setMySlugCount] = useState(0);
  const [tab, setTab] = useState<'premium' | 'auctions' | 'market'>('market');

  /** Contagens para os separadores + após listar/remover */
  const refreshCounts = useCallback(async () => {
    const [p, marketCount, a] = await Promise.all([
      supabase.from('premium_slugs' as any).select('id', { count: 'exact', head: true }).eq('active', true).is('sold_to', null),
      fetchSlugMarketCount(supabase as any),
      supabase.from('slug_auctions' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString()),
    ]);
    setPremiumTotal(typeof p.count === 'number' ? p.count : 0);
    setMarketTotal(typeof marketCount === 'number' ? marketCount : 0);
    setAuctionsTotal(typeof a.count === 'number' ? a.count : 0);
  }, []);

  const loadAuctions = useCallback(async () => {
    const { data, error } = await supabase.from('slug_auctions' as any)
      .select('*')
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true })
      .limit(48);
    if (error) {
      console.error('loadAuctions', error);
      toast.error(T('slug_err_auctions_generic'));
    }
    setAuctions(data || []);
  }, [T]);

  const loadPremiumPage = useCallback(async (page: number) => {
    setPremiumLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase.from('premium_slugs' as any)
        .select('*')
        .eq('active', true)
        .is('sold_to', null)
        .order('price', { ascending: false })
        .range(from, to);
      if (error) {
        console.error('loadPremiumPage', error);
        toast.error(T('slug_err_premium_generic'));
        setPremiumSlugs([]);
        return;
      }
      setPremiumSlugs(data || []);
    } finally {
      setPremiumLoading(false);
    }
  }, [T]);

  const loadMarketPage = useCallback(async (page: number) => {
    setMarketLoading(true);
    try {
      const offset = page * PAGE_SIZE;
      const { rows, error } = await fetchSlugMarketRows(supabase as any, offset, PAGE_SIZE);
      if (error) {
        const msg = String(error.message || '');
        console.error('loadMarketPage', msg);
        toast.error(
          isRelationshipOrSchemaError(msg) ? T('slug_err_sales_cache') : T('slug_err_sales_generic'),
        );
        setForSale([]);
        return;
      }
      const merged = await attachMiniSitesToSlugRows(supabase, rows);
      setForSale(merged);
    } finally {
      setMarketLoading(false);
    }
  }, [T]);

  const refreshMarketplace = useCallback(async () => {
    await refreshCounts();
    await loadAuctions();
    await Promise.all([loadMarketPage(marketPage), loadPremiumPage(premiumPage)]);
  }, [refreshCounts, loadAuctions, loadMarketPage, loadPremiumPage, marketPage, premiumPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'market' || t === 'auctions' || t === 'premium') setTab(t);
  }, []);

  useEffect(() => {
    void refreshCounts();
    void loadAuctions();
  }, [refreshCounts, loadAuctions]);

  useEffect(() => {
    if (tab !== 'premium') return;
    void loadPremiumPage(premiumPage);
  }, [tab, premiumPage, loadPremiumPage]);

  useEffect(() => {
    if (tab !== 'market') return;
    void loadMarketPage(marketPage);
  }, [tab, marketPage, loadMarketPage]);

  useEffect(() => {
    if (!user?.id) { setMySlugCount(0); return; }
    (supabase as any).from('slug_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }: any) => setMySlugCount(typeof count === 'number' ? count : 0));
  }, [user?.id]);

  // Check availability
  useEffect(() => {
    if (!search || search.length < 1) { setAvailable(null); return; }
    const timer = setTimeout(async () => {
      setChecking(true);
      const [{ data: site }, { data: reg }] = await Promise.all([
        supabase.from('mini_sites').select('id').eq('slug', search).maybeSingle(),
        supabase.from('slug_registrations' as any).select('id').eq('slug', search).eq('status', 'active').maybeSingle(),
      ]);
      setAvailable(!site && !reg);
      setChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleClaim = async () => {
    if (!search) return;
    if (!user) { toast.error(T('toast_login_register_slug')); return; }
    if (!isAdmin && isSlugReservedAdminOnly(search)) {
      toast.error(T('err_slug_reserved'));
      return;
    }

    // Admin registers for free directly
    if (isAdmin) {
      const { data: existing } = await (supabase as any).from('slug_registrations').select('id').eq('slug', search).maybeSingle();
      if (existing) { toast.error(T('err_slug_taken_toast').replace('{slug}', search)); return; }
      await (supabase as any).from('slug_registrations').insert({
        user_id: user.id,
        slug: search,
        status: 'active',
        expires_at: new Date(Date.now() + 365*86400000).toISOString(),
        for_sale: false,
      });
      toast.success(T('toast_slug_free_registered').replace('{slug}', search));
      setAvailable(false);
      return;
    }
    
    const price = slugRegistrationDueUsd(search, mySlugCount);
    if (price === 0) {
      await (supabase as any).from('slug_registrations').insert({
        user_id: user.id,
        slug: search,
        status: 'active',
        for_sale: false,
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      });
      toast.success(T('toast_slug_free_first').replace('{slug}', search));
      setMySlugCount((c) => c + 1);
      setAvailable(false);
      void refreshMarketplace();
      return;
    }
    add({ id: `slug_${search}`, label: `${search}.trustbank.xyz`, price, type: 'slug' });
    toast.success(T('toast_slug_search_cart').replace('{slug}', search));
    openCart();
  };

  const handleBuyPremium = (slug: any) => {
    if (!user) { toast.error(T('toast_login_first')); return; }
    add({ id: `slug_prem_${slug.slug || slug.keyword}`, label: `${slug.slug || slug.keyword} (premium)`, price: slug.price, type: 'slug' });
    openCart();
  };

  const handleBidAuction = async (slug: any) => {
    if (!user) { toast.error(T('toast_login_first')); return; }
    const minBid = (slug.current_bid || slug.min_bid || 0) + (slug.min_increment || 5);
    const bid = prompt(`${T('slug_prompt_min_bid').replace('${min}', String(minBid))}\n${T('slug_prompt_your_bid')}`, String(minBid));
    if (!bid || isNaN(parseFloat(bid)) || parseFloat(bid) < minBid) {
      toast.error(T('err_min_bid').replace('${min}', String(minBid))); return;
    }
    try {
      const res = await fetch('/api/slug-auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: slug.id, bid: parseFloat(bid) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bid failed');
      toast.success(T('slug_bid_placed_toast').replace('{amount}', String(parseFloat(bid))));
      void refreshMarketplace();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T('slug_bid_error'));
    }
  };

  const handleBuyMarket = (slug: any) => {
    if (!user) { toast.error(T('toast_login_first')); return; }
    add({ id: `slug_market_${slug.slug}`, label: T('slug_cart_market_label').replace('{slug}', slug.slug), price: slug.sale_price, type: 'slug' });
    openCart();
  };

  const reservedBlock = Boolean(search && !isAdmin && isSlugReservedAdminOnly(search));
  const claimDue = search ? slugRegistrationDueUsd(search, mySlugCount) : 0;
  const tier = search ? tierForSlugInput(search) : null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Hero — mercado público */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm font-bold mb-4 border border-amber-500/20">
            <Flame className="w-4 h-4" /> {T('slug_hero_badge')}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text)] mb-3">
            {T('slug_title')}
          </h1>
          <p className="text-[var(--text2)] text-xl max-w-xl mx-auto">
            {T('slug_subtitle_lead')}{' '}
            <span className="text-brand font-semibold">trustbank.xyz/yourname</span>
          </p>
        </div>
        <p className="text-center text-sm md:text-base text-[var(--text2)] max-w-2xl mx-auto mb-8 leading-relaxed">
          {T('slug_market_page_intro')}
        </p>

        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-10 mb-10">
          {/* Coluna 1: registo sempre visível (em cima no mobile, à esquerda no desktop) */}
          <div className="w-full lg:max-w-[440px] lg:flex-shrink-0">
            <h2 className="font-black text-xl text-[var(--text)] mb-3 text-center lg:text-left">
              {T('slug_section_claim_title')}
            </h2>
            <div className="card p-6 lg:sticky lg:top-24">
          <label className="text-sm font-bold text-[var(--text2)] uppercase tracking-wider mb-2 block">
            {T('slug_verify_avail')}
          </label>
          <p className="text-sm text-[var(--text2)] mb-3">
            {T('slug_rules_blurb')}
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text2)] font-mono text-sm">/</span>
              <input value={search}
                onChange={e => setSearch(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="input pl-7 font-mono text-lg"
                placeholder="myslug" maxLength={30} />
              {checking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--text2)]" />}
              {!checking && available === true && !reservedBlock && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
              {!checking && available === true && reservedBlock && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />}
              {!checking && available === false && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
            </div>
            <button onClick={handleClaim} disabled={!search || available === false || reservedBlock}
              className="px-6 py-2.5 rounded-xl font-bold text-base text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
              {available === false ? T('slug_taken') : reservedBlock ? T('slug_reserved_label') : T('slug_register')}
            </button>
          </div>
          {search && (
            <div className="mt-2 text-xs text-[var(--text2)]">
              Estimated price now: <span className="font-bold text-[var(--text)]">${claimDue} USD</span>
            </div>
          )}

          {search && available !== null && (
            <div className={`mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border ${
              reservedBlock ? 'bg-amber-500/10 border-amber-500/25'
              : available ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {reservedBlock ? (
                  <><span className="text-lg flex-shrink-0">🔒</span><span className="text-sm font-semibold text-amber-400">{T('slug_reserved_label')}: <span className="font-mono">{search}.trustbank.xyz</span></span></>
                ) : available ? (
                  <><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /><span className="text-sm font-semibold text-green-400"><span className="font-mono">{search}.trustbank.xyz</span> · {T('slug_available')}</span></>
                ) : (
                  <><XCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><span className="text-sm font-semibold text-red-400"><span className="font-mono">{search}.trustbank.xyz</span> · {T('slug_taken')}</span></>
                )}
              </div>
              {!reservedBlock && available && tier && (
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-[var(--text)]">${claimDue} USD</div>
                  {slugLengthTierUsd(search) === 0 && claimDue === 0 && (
                    <div className="text-[10px] text-[var(--text2)]">{T('slug_tier_included_first')}</div>
                  )}
                </div>
              )}
            </div>
          )}
            </div>
          </div>

          {/* Coluna 2: mercado com scroll interno — listas longas não empurram o registo para baixo */}
          <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/80 p-4 sm:p-6 min-h-0">
            <h2 className="font-black text-lg text-[var(--text)] mb-1 flex items-center justify-center gap-2 shrink-0">
              <Globe className="w-5 h-5 text-brand" /> {T('slug_market_section_title')}
            </h2>
            <p className="text-center text-xs text-[var(--text2)] mb-5 shrink-0">{T('slug_market_section_sub')}</p>

            <div className="flex gap-2 mb-4 border-b border-[var(--border)] shrink-0 flex-wrap">
          {[
            { id: 'premium', label: T('slug_tab_premium'), icon: <Star className="w-3.5 h-3.5" />, count: premiumTotal },
            { id: 'auctions', label: T('slug_tab_auctions'), icon: <Gavel className="w-3.5 h-3.5" />, count: auctionsTotal },
            { id: 'market', label: T('slug_tab_market'), icon: <Globe className="w-3.5 h-3.5" />, count: marketTotal },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-base font-semibold border-b-2 transition-all -mb-px ${
                tab === t.id ? 'border-brand text-brand' : 'border-transparent text-[var(--text2)] hover:text-[var(--text)]'
              }`}>
              {t.icon} {t.label}
              {t.count > 0 && <span className="text-sm bg-[var(--bg)] px-1.5 py-0.5 rounded-full">{t.count}</span>}
            </button>
          ))}
            </div>

            <div className="flex-1 min-h-0 max-h-[min(52vh,520px)] lg:max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden overscroll-contain pb-1">
        {/* Premium */}
        {tab === 'premium' && (
          <div>
            {premiumLoading && premiumSlugs.length === 0 ? (
              <div className="flex justify-center py-12 text-[var(--text2)]"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : premiumTotal === 0 ? (
              <div className="text-center py-16 text-[var(--text2)]">
                <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{T('slug_premium_empty')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 max-w-3xl mx-auto">
                  {premiumSlugs.map((slug) => (
                    <SlugRowPremium key={slug.id} slug={slug} onBuy={handleBuyPremium} />
                  ))}
                </div>
                <SlugPagination
                  page={premiumPage}
                  total={premiumTotal}
                  loading={premiumLoading}
                  onPrev={() => setPremiumPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPremiumPage((p) => p + 1)}
                />
              </>
            )}
          </div>
        )}

        {/* Auctions */}
        {tab === 'auctions' && (
          auctions.length > 0 ? (
            <>
              <p className="text-xs text-[var(--text2)] mb-4 max-w-2xl">{T('slug_auction_pay_hint')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {auctions.map(slug => (
                  <SlugCard key={slug.id} slug={slug} type="auction" onBuy={handleBidAuction} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-[var(--text2)]">
              <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{T('slug_auctions_empty')}</p>
              {user && <p className="text-xs mt-2">{T('slug_auctions_empty_hint')}</p>}
            </div>
          )
        )}

        {/* Market */}
        {tab === 'market' && (
          <div>
            {marketLoading && forSale.length === 0 ? (
              <div className="flex justify-center py-12 text-[var(--text2)]"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : marketTotal === 0 ? (
              <div className="text-center py-16 text-[var(--text2)]">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{T('slug_market_empty')}</p>
                <p className="text-xs mt-3 max-w-md mx-auto text-[var(--text2)]/90">{T('slug_market_empty_hint')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 max-w-3xl mx-auto">
                  {forSale.map((slug) => (
                    <SlugRowMarket
                      key={slug.id}
                      slug={slug}
                      onBuy={handleBuyMarket}
                      showOwnerActions
                      isAdmin={isAdmin}
                      userId={user?.id}
                      onRefresh={refreshMarketplace}
                    />
                  ))}
                </div>
                <SlugPagination
                  page={marketPage}
                  total={marketTotal}
                  loading={marketLoading}
                  onPrev={() => setMarketPage((p) => Math.max(0, p - 1))}
                  onNext={() => setMarketPage((p) => p + 1)}
                />
              </>
            )}
          </div>
        )}
            </div>
          </div>
        </div>

        {user && (
          <div className="card p-5 mb-8 border border-brand/30 bg-brand/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <Key className="w-8 h-8 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-[var(--text)]">{T('slug_vault_banner_title')}</p>
                  <p className="text-sm text-[var(--text2)] mt-1">{T('slug_vault_banner_sub')}</p>
                </div>
              </div>
              <Link
                href="/vault"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}
              >
                {T('slug_vault_banner_btn')}
                <span className="opacity-90 font-mono">({mySlugCount})</span>
              </Link>
            </div>
          </div>
        )}

        {/* Price table */}
        <div className="card p-5 mb-8">
          <h3 className="font-bold text-[var(--text)] mb-4 text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand" /> {T('slug_price_table_title')}
          </h3>
          <p className="text-sm text-[var(--text2)] mb-3">{T('slug_names_table_note')}</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {PRICE_TIERS.map((t) => (
              <div key={t.len} className="text-center p-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
                <div className="font-mono font-black text-sm" style={{ color: t.color }}>{t.len}</div>
                <div className="font-black text-[var(--text)] text-sm mt-1">
                  {t.len === '8+ chars' ? T('slug_table_cell_8') : `$${t.price.toLocaleString()}`}
                </div>
                {t.len === '8+ chars' && (
                  <div className="text-[9px] text-[var(--text2)] mt-0.5 leading-tight">{T('slug_tier_included_first')}</div>
                )}
                <div className="text-[10px] text-[var(--text2)] mt-0.5">{T(t.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
