'use client';
import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import { slugPrice } from '@/lib/utils';
import {
  Search, Crown, ShoppingCart, CheckCircle, XCircle,
  Gavel, Clock, Tag, Globe, Loader2, RefreshCw,
  ChevronRight, Flame, Star, ArrowUpRight, Lock, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import Link from 'next/link';

// ─── Price table ──────────────────────────────────────────────────────────────
const PRICE_TIERS = [
  { len: '1 char',  price: 5000,  label: 'Ultra Rare',  color: '#f59e0b' },
  { len: '2 chars', price: 3500,  label: 'Legendary',   color: '#f59e0b' },
  { len: '3 chars', price: 3000,  label: 'Premium',     color: '#818cf8' },
  { len: '4 chars', price: 1500,  label: 'Premium',     color: '#818cf8' },
  { len: '5 chars', price: 500,   label: 'Popular',     color: '#34d399' },
  { len: '6 chars', price: 150,   label: 'Standard',    color: '#60a5fa' },
  { len: '7+ chars',price: 12,    label: 'Free tier',   color: '#94a3b8' },
];

// ─── Slug card ────────────────────────────────────────────────────────────────
function SlugCard({ slug, type, onBuy, isAdmin = false }: { slug: any; type: 'premium' | 'auction'; onBuy: (s: any) => void; isAdmin?: boolean }) {
  const T = useT();
  const [timeLeft, setTimeLeft] = useState('');
  const isAuction = type === 'auction';

  useEffect(() => {
    if (!isAuction || !slug.ends_at) return;
    const update = () => {
      const diff = new Date(slug.ends_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Encerrado'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [slug.ends_at, isAuction]);

  const len = (slug.slug || slug.keyword || '').length;
  const tier = PRICE_TIERS.find(t => t.len === `${len} char${len !== 1 ? 's' : ''}`) || PRICE_TIERS[PRICE_TIERS.length - 1];

  return (
    <div className="card p-5 hover:border-brand/40 transition-all group hover:-translate-y-0.5 duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: tier.color + '20', color: tier.color }}>
            {isAuction ? '🔨 Leilão' : tier.label}
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
        <div className="text-xs text-[var(--text2)] mt-1">{len} {len === 1 ? 'caractere' : 'chars'}</div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-black text-lg text-[var(--text)]">
            ${(isAuction ? (slug.current_bid || slug.min_bid) : slug.price)?.toLocaleString()} USDC
          </div>
          {isAuction && slug.bid_count > 0 && (
            <div className="text-xs text-[var(--text2)]">{slug.bid_count} lance{slug.bid_count !== 1 ? 's' : ''}</div>
          )}
        </div>
        <button onClick={() => onBuy(slug)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
          style={{ background: isAuction ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
          {isAuction ? <><Gavel className="w-3.5 h-3.5" /> Dar lance</> : <><ShoppingCart className="w-3.5 h-3.5" /> {T('slug_buy')}</>}
        </button>
      </div>
    </div>
  );
}

// ─── My Slugs panel ───────────────────────────────────────────────────────────
function MySlugs({ userId, isAdmin = false, onChanged }: { userId: string; isAdmin?: boolean; onChanged?: () => void }) {
  const [slugs, setSlugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { add, open } = useCart();

  const loadMySlugs = useCallback(() => {
    supabase.from('slug_registrations' as any)
      .select('*, mini_sites(site_name, published)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(r => { setSlugs(r.data || []); setLoading(false); });
  }, [userId]);

  useEffect(() => { loadMySlugs(); }, [loadMySlugs]);

  const renewSlug = (slug: any) => {
    add({ id: `slug_renewal_${slug.slug}`, label: `Renovar ${slug.slug}.trustbank.xyz (1 ano)`, price: slug.renewal_fee || 12, type: 'slug' });
    open();
  };

  const listForSale = async (slug: any) => {
    const price = prompt(`Preço de venda para /${slug.slug} em USDC:`, '50');
    if (!price) return;
    const { error } = await supabase.from('slug_registrations' as any).update({ for_sale: true, sale_price: parseFloat(price), status: 'active' }).eq('id', slug.id);
    if (error) { toast.error(error.message); return; }
    setSlugs(prev => prev.map(s => s.id === slug.id ? { ...s, for_sale: true, sale_price: parseFloat(price), status: 'active' } : s));
    toast.success(`${slug.slug} listado por $${price} USDC`);
    onChanged?.();
  };

  const removeListing = async (slug: any) => {
    if (slug.status === 'auction') {
      await supabase.from('slug_auctions' as any)
        .update({ status: 'cancelled' })
        .eq('slug_registration_id', slug.id)
        .eq('status', 'active');
    }
    const { error } = await supabase.from('slug_registrations' as any)
      .update({ for_sale: false, sale_price: null, status: 'active' })
      .eq('id', slug.id);
    if (error) { toast.error(error.message); return; }
    setSlugs(prev => prev.map(s => s.id === slug.id ? { ...s, for_sale: false, sale_price: null, status: 'active' } : s));
    toast.success(`Venda removida: ${slug.slug}`);
    onChanged?.();
  };

  const deleteSlug = async (slug: any) => {
    const ok = window.confirm(`Apagar o slug ${slug.slug}.trustbank.xyz?\n\nEsta ação remove o registro de teste.`);
    if (!ok) return;
    await supabase.from('slug_auctions' as any).delete().eq('slug_registration_id', slug.id);
    const { error } = await supabase.from('slug_registrations' as any).delete().eq('id', slug.id);
    if (error) { toast.error(error.message); return; }
    setSlugs(prev => prev.filter(s => s.id !== slug.id));
    toast.success(`Slug apagado: ${slug.slug}`);
    onChanged?.();
  };

  if (loading) return <div className="card p-6 text-center text-[var(--text2)]"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  if (slugs.length === 0) return null;

  return (
    <div className="card p-5 mb-8">
      <h2 className="font-black text-[var(--text)] mb-4 flex items-center gap-2">
        <Crown className="w-5 h-5 text-amber-400" /> Meus Slugs ({slugs.length})
      </h2>
      <div className="space-y-3">
        {slugs.map(slug => {
          const expires = new Date(slug.expires_at);
          const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000);
          const expiringSoon = daysLeft < 30;
          return (
            <div key={slug.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
              <span className="font-mono font-black text-brand text-sm flex-1">{slug.slug}.trustbank.xyz</span>
              <div className="flex items-center gap-1 text-xs">
                {expiringSoon
                  ? <span className="text-amber-400 font-semibold">{daysLeft}d restantes</span>
                  : <span className="text-[var(--text2)]">expira {expires.toLocaleDateString('pt-BR')}</span>}
              </div>
              {slug.for_sale && (
                <span className="text-xs text-green-400 font-bold border border-green-400/30 px-2 py-0.5 rounded-full">
                  {slug.status === 'auction' ? 'Leilão' : `À venda $${slug.sale_price}`}
                </span>
              )}
              <div className="flex gap-1.5">
                <button onClick={() => listForSale(slug)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:border-brand/50 hover:text-brand transition-all">
                  {slug.for_sale ? 'Alterar preço' : 'Vender'}
                </button>
                {slug.for_sale && (
                  <button onClick={() => removeListing(slug)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-all">
                    Tirar da venda
                  </button>
                )}
                {(isAdmin || !slug.mini_sites?.published) && (
                  <button onClick={() => deleteSlug(slug)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Apagar
                  </button>
                )}
                {expiringSoon && (
                  <button onClick={() => renewSlug(slug)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all">
                    Renovar
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
  const [auctions, setAuctions] = useState<any[]>([]);
  const [forSale, setForSale] = useState<any[]>([]);
  const [mySlugCount, setMySlugCount] = useState(0);
  const [tab, setTab] = useState<'premium' | 'auctions' | 'market'>('market');

  const loadMarketData = useCallback(async () => {
    const [{ data: premium, error: premiumErr }, { data: activeAuctions, error: auctionsErr }, { data: saleRows, error: saleErr }] = await Promise.all([
      supabase.from('premium_slugs' as any)
        .select('*').eq('active', true).is('sold_to', null)
        .order('price', { ascending: false })
        .limit(24),
      supabase.from('slug_auctions' as any)
        .select('*').eq('status', 'active').gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true })
        .limit(24),
      supabase.from('slug_registrations' as any)
        .select('*, mini_sites(site_name, avatar_url)')
        .eq('for_sale', true)
        .neq('status', 'auction')
        .order('sale_price', { ascending: true })
        .limit(96),
    ]);
    if (premiumErr) toast.error(`Premium slugs: ${premiumErr.message}`);
    if (auctionsErr) toast.error(`Leilões: ${auctionsErr.message}`);
    if (saleErr) toast.error(`Vendas: ${saleErr.message}`);
    setPremiumSlugs(premium || []);
    setAuctions(activeAuctions || []);
    setForSale(saleRows || []);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'market' || t === 'auctions' || t === 'premium') setTab(t);
  }, []);

  useEffect(() => { loadMarketData(); }, [loadMarketData]);

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
    if (!user) { toast.error('Faça login para registrar um slug'); return; }
    
    // Admin registers for free directly
    if (isAdmin) {
      const { data: existing } = await (supabase as any).from('slug_registrations').select('id').eq('slug', search).maybeSingle();
      if (existing) { toast.error(`${search} já registrado`); return; }
      await (supabase as any).from('slug_registrations').insert({
        user_id: user.id,
        slug: search,
        status: 'active',
        expires_at: new Date(Date.now() + 365*86400000).toISOString(),
        for_sale: false,
      });
      toast.success(`✅ ${search}.trustbank.xyz registrado grátis!`);
      setAvailable(false);
      return;
    }
    
    const basePrice = slugPrice(search);
    const price = basePrice > 0 ? basePrice : (mySlugCount > 0 ? 12 : 0);
    if (price === 0) {
      await (supabase as any).from('slug_registrations').insert({
        user_id: user.id,
        slug: search,
        status: 'active',
        for_sale: false,
        expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      });
      toast.success(`✅ ${search}.trustbank.xyz registrado grátis (1º slug)!`);
      setMySlugCount(1);
      setAvailable(false);
      loadMarketData();
      return;
    }
    add({ id: `slug_${search}`, label: `${search}.trustbank.xyz`, price, type: 'slug' });
    toast.success(`${search} adicionado ao carrinho!`);
    openCart();
  };

  const handleBuyPremium = (slug: any) => {
    if (!user) { toast.error('Faça login primeiro'); return; }
    add({ id: `slug_prem_${slug.slug || slug.keyword}`, label: `${slug.slug || slug.keyword} (premium)`, price: slug.price, type: 'slug' });
    openCart();
  };

  const handleBidAuction = (slug: any) => {
    if (!user) { toast.error('Faça login primeiro'); return; }
    const minBid = (slug.current_bid || slug.min_bid || 0) + (slug.min_increment || 5);
    const bid = prompt(`Lance mínimo: $${minBid} USDC\nSeu lance:`, String(minBid));
    if (!bid || isNaN(parseFloat(bid)) || parseFloat(bid) < minBid) {
      toast.error(`Lance mínimo é $${minBid}`); return;
    }
    add({ id: `slug_bid_${slug.id}`, label: `Lance ${slug.slug}.trustbank.xyz: $${bid}`, price: parseFloat(bid), type: 'slug' });
    openCart();
  };

  const handleBuyMarket = (slug: any) => {
    if (!user) { toast.error('Faça login primeiro'); return; }
    add({ id: `slug_market_${slug.slug}`, label: `${slug.slug} (mercado)`, price: slug.sale_price, type: 'slug' });
    openCart();
  };

  const claimPrice = search ? slugPrice(search) : 0;
  const tier = search ? (PRICE_TIERS.find(t => {
    const len = search.length;
    if (t.len === '7+ chars') return len >= 7;
    return t.len === `${len} char${len !== 1 ? 's' : ''}`;
  }) || PRICE_TIERS[PRICE_TIERS.length - 1]) : null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-4 border border-amber-500/20">
            <Flame className="w-3.5 h-3.5" /> Slugs são ativos digitais únicos
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text)] mb-3">
            {T('slug_title')}
          </h1>
          <p className="text-[var(--text2)] text-lg max-w-xl mx-auto">
            Register your identity. Sell. Auction. <span className="text-brand font-semibold">trustbank.xyz/seunome</span>
          </p>
        </div>

        {/* Search & claim */}
        <div className="card p-6 mb-8">
          <label className="text-xs font-bold text-[var(--text2)] uppercase tracking-wider mb-2 block">
            Verificar disponibilidade
          </label>
          <p className="text-xs text-[var(--text2)] mb-3">
            Regra: 1 slug comum (7+ chars) grátis por usuário. A partir do 2º slug comum: $12/ano. Slugs premium (1-6 chars) seguem tabela fixa.
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text2)] font-mono text-sm">/</span>
              <input value={search}
                onChange={e => setSearch(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="input pl-7 font-mono text-lg"
                placeholder="myslug" maxLength={30} />
              {checking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[var(--text2)]" />}
              {!checking && available === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
              {!checking && available === false && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
            </div>
            <button onClick={handleClaim} disabled={!search || available === false}
              className="px-6 py-2 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
              {available === false ? T('slug_taken') : T('slug_register')}
            </button>
          </div>

          {search && available !== null && (
            <div className={`mt-3 flex items-center justify-between p-3 rounded-xl ${available ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <div className="flex items-center gap-2">
                {available
                  ? <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm font-semibold text-green-400">/{search} {T('slug_available')}</span></>
                  : <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm font-semibold text-red-400">/{search} {T('slug_taken')}</span></>}
              </div>
              {available && tier && (
                <span className="font-black text-[var(--text)]">${claimPrice > 0 ? claimPrice : (mySlugCount > 0 ? 12 : 0)} USDC</span>
              )}
            </div>
          )}
        </div>

        {/* My slugs */}
        {user && <MySlugs userId={user.id} isAdmin={isAdmin} onChanged={loadMarketData} />}

        {/* Price table */}
        <div className="card p-5 mb-8">
          <h3 className="font-bold text-[var(--text)] mb-4 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand" /> Price Table
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {PRICE_TIERS.map(t => (
              <div key={t.len} className="text-center p-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
                <div className="font-mono font-black text-sm" style={{ color: t.color }}>{t.len}</div>
                <div className="font-black text-[var(--text)] text-sm mt-1">${t.price === 12 ? '12/yr' : t.price.toLocaleString()}</div>
                <div className="text-[10px] text-[var(--text2)] mt-0.5">{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
          {[
            { id: 'premium', label: 'Premium', icon: <Star className="w-3.5 h-3.5" />, count: premiumSlugs.length },
            { id: 'auctions', label: 'Auctions', icon: <Gavel className="w-3.5 h-3.5" />, count: auctions.length },
            { id: 'market', label: 'Market', icon: <Globe className="w-3.5 h-3.5" />, count: forSale.length + auctions.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                tab === t.id ? 'border-brand text-brand' : 'border-transparent text-[var(--text2)] hover:text-[var(--text)]'
              }`}>
              {t.icon} {t.label}
              {t.count > 0 && <span className="text-xs bg-[var(--bg2)] px-1.5 py-0.5 rounded-full">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Premium */}
        {tab === 'premium' && (
          premiumSlugs.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {premiumSlugs.map(slug => (
                <SlugCard key={slug.id} slug={slug} type="premium" onBuy={handleBuyPremium} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-[var(--text2)]">
              <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum slug premium disponível no momento</p>
            </div>
          )
        )}

        {/* Auctions */}
        {tab === 'auctions' && (
          auctions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {auctions.map(slug => (
                <SlugCard key={slug.id} slug={slug} type="auction" onBuy={handleBidAuction} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-[var(--text2)]">
              <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum leilão ativo no momento</p>
              {user && <p className="text-xs mt-2">Coloque seu slug em leilão pelo Dashboard</p>}
            </div>
          )
        )}

        {/* Market — user listed */}
        {tab === 'market' && (
          forSale.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {forSale.map(slug => (
                <div key={slug.id} className="card p-4 hover:border-brand/40 transition-all">
                  <div className="text-center my-3">
                    <span className="font-mono font-black text-xl text-brand">{slug.slug}.trustbank.xyz</span>
                    {slug.mini_sites?.site_name && (
                      <div className="text-xs text-[var(--text2)] mt-1">por {slug.mini_sites.site_name}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[var(--text)]">${slug.sale_price} USDC</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleBuyMarket(slug)}
                        className="text-xs px-3 py-1.5 rounded-xl font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                        Comprar
                      </button>
                      {(isAdmin || (user && slug.user_id === user.id)) && (
                        <>
                          <button
                            onClick={async () => {
                              const { error } = await supabase.from('slug_registrations' as any)
                                .update({ for_sale: false, sale_price: null, status: 'active' })
                                .eq('id', slug.id);
                              if (error) return toast.error(error.message);
                              toast.success(`Slug removido da vitrine: ${slug.slug}`);
                              loadMarketData();
                            }}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-400"
                          >
                            Tirar
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Apagar ${slug.slug}.trustbank.xyz da base?`)) return;
                              await supabase.from('slug_auctions' as any).delete().eq('slug_registration_id', slug.id);
                              const { error } = await supabase.from('slug_registrations' as any).delete().eq('id', slug.id);
                              if (error) return toast.error(error.message);
                              toast.success(`Slug apagado: ${slug.slug}`);
                              loadMarketData();
                            }}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-red-500/40 text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-[var(--text2)]">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum slug à venda por usuários ainda</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
