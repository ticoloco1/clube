'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import {
  Shield, Users, Globe, Crown, BarChart3, Settings, Megaphone,
  Ban, CheckCircle, Trash2, Plus, Search, RefreshCw, Tag,
  Gavel, Bell, Eye, Flag, TrendingUp, DollarSign, Activity,
  Upload, Mail, X, ChevronDown, ChevronUp, Lock, Unlock,
  Radio, MessageSquare, FileText, Zap, Database
} from 'lucide-react';

const OWNER_EMAIL = 'arytcfme@gmail.com';

type Tab = 'overview'|'sites'|'slugs'|'users'|'reports'|'broadcast'|'analytics'|'settings'|'auction';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const T = useT();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [stats, setStats] = useState({ sites: 0, slugs: 0, users: 0, classifieds: 0, revenue: 0, videos: 0 });
  const [sites, setSites] = useState<any[]>([]);
  const [slugRegs, setSlugRegs] = useState<any[]>([]);
  const [premiumSlugs, setPremiumSlugs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Forms
  const [siteSearch, setSiteSearch] = useState('');
  const [slugSearch, setSlugSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [bulkSlugs, setBulkSlugs] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newSlugPrice, setNewSlugPrice] = useState('');
  const [auctionSlug, setAuctionSlug] = useState('');
  const [auctionStart, setAuctionStart] = useState('');
  const [auctionEnd, setAuctionEnd] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [tickerText, setTickerText] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [siteName, setSiteName] = useState('TrustBank');
  const [commissionRate, setCommissionRate] = useState('40');
  const [savingSettings, setSavingSettings] = useState(false);
  const [stripeKey, setStripeKey] = useState('');
  const [stripeWebhook, setStripeWebhook] = useState('');
  const [coinbaseKey, setCoinbaseKey] = useState('');
  const [coinbaseWebhook, setCoinbaseWebhook] = useState('');
  const [platformWallet, setPlatformWallet] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);
  const [sending, setSending] = useState(false);
  const [addingSlug, setAddingSlug] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSlug, setNewSiteSlug] = useState('');
  const [newSiteEmail, setNewSiteEmail] = useState('');
  const [creatingSite, setCreatingSite] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth'); return; }
    // Owner email always has access
    if (user.email === OWNER_EMAIL) {
      setIsAdmin(true); setChecking(false); loadAll(); return;
    }
    // Also check user_roles table
    supabase.from('user_roles' as any).select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => {
        if (data) { setIsAdmin(true); setChecking(false); loadAll(); }
        else { router.push('/'); }
      });
  }, [user, loading]);

  const loadAll = useCallback(async () => {
    const [sitesRes, slugsRes, premRes, clRes, vidRes] = await Promise.all([
      supabase.from('mini_sites').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('slug_registrations' as any).select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('premium_slugs' as any).select('*').order('created_at', { ascending: false }),
      (supabase as any).from('classified_listings').select('id', { count: 'exact' }),
      supabase.from('mini_site_videos').select('id', { count: 'exact' }),
    ]);
    const s = sitesRes.data || [];
    setSites(s);
    setSlugRegs(slugsRes.data || []);
    setPremiumSlugs(premRes.data || []);
    setStats({
      sites: s.length,
      slugs: (slugsRes.data || []).length,
      users: s.length,
      classifieds: clRes.count || 0,
      revenue: (slugsRes.data || []).reduce((sum: number, r: any) => sum + (r.registration_fee || 0), 0),
      videos: vidRes.count || 0,
    });
    // Load platform settings
    const { data: ps } = await supabase.from('platform_settings' as any).select('*').eq('id', 1).maybeSingle();
    if (ps) {
      setSiteName((ps as any).site_name || 'TrustBank');
      setStripeKey((ps as any).stripe_key || '');
      setStripeWebhook((ps as any).stripe_webhook || '');
      setCoinbaseKey((ps as any).coinbase_key || '');
      setCoinbaseWebhook((ps as any).coinbase_webhook || '');
      setPlatformWallet((ps as any).platform_wallet || '');
      setFaviconUrl((ps as any).favicon_url || '');
      setSiteUrl((ps as any).site_url || '');
      setCommissionRate(String((ps as any).commission_paywall || 40));
      setTickerText((ps as any).ticker_text || '');
    }
  }, []);

  // Site actions
  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('mini_sites').update({ published: !current }).eq('id', id);
    setSites(s => s.map(x => x.id === id ? { ...x, published: !current } : x));
    toast.success(!current ? T('gov_toast_site_published') : T('gov_toast_site_unpublished'));
  };
  const toggleBlock = async (id: string, current: boolean) => {
    await supabase.from('mini_sites').update({ blocked: !current } as any).eq('id', id);
    setSites(s => s.map(x => x.id === id ? { ...x, blocked: !current } : x));
    toast.success(!current ? T('gov_toast_site_blocked') : T('gov_toast_site_unblocked'));
  };
  const freePlan = async (userId: string) => {
    await supabase.from('subscriptions' as any).upsert({
      user_id: userId, plan: 'pro_admin_grant', price: 0, status: 'active',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await supabase.from('mini_sites').update({ published: true }).eq('user_id', userId);
    toast.success(T('toast_pro_granted'));
  };

  // Slug actions
  const addSingleSlug = async () => {
    if (!newSlug || !newSlugPrice) return;
    const slugAdded = newSlug.trim();
    setAddingSlug(true);
    await supabase.from('premium_slugs' as any).upsert({ slug: newSlug, keyword: newSlug, price: parseFloat(newSlugPrice), active: true });
    setNewSlug(''); setNewSlugPrice('');
    const { data } = await supabase.from('premium_slugs' as any).select('*').order('created_at', { ascending: false });
    setPremiumSlugs(data || []);
    toast.success(T('gov_toast_marketplace_slug').replace('{slug}', slugAdded));
    setAddingSlug(false);
  };

  const addBulkSlugs = async () => {
    if (!bulkSlugs) return;
    // Formato por linha: "slug:preco" ou só "slug" (usa bulkPrice como fallback)
    const slugList = bulkSlugs.split('\n')
      .map(s => s.trim()).filter(Boolean)
      .map(line => {
        const parts = line.split(':');
        const slug = parts[0].trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        const price = parts[1] ? parseFloat(parts[1].trim()) : parseFloat(bulkPrice || '12');
        return { slug, price };
      }).filter(({ slug }) => slug.length > 0);
    let count = 0; let skipped = 0;
    for (const { slug: s, price } of slugList) {
      const { error } = await supabase.from('premium_slugs' as any)
        .upsert({ slug: s, keyword: s, price, active: true }, { onConflict: 'slug', ignoreDuplicates: true });
      if (!error) count++;
      else skipped++;
    }
    setBulkSlugs(''); setBulkPrice('');
    loadAll();
    const suffix = skipped > 0 ? T('gov_scan_skipped_suffix').replace('{n}', String(skipped)) : '';
    toast.success(T('gov_scan_added').replace('{count}', String(count)).replace('{suffix}', suffix));
  };

  const toggleSlugActive = async (id: string, current: boolean) => {
    await supabase.from('premium_slugs' as any).update({ active: !current }).eq('id', id);
    setPremiumSlugs(s => s.map(x => x.id === id ? { ...x, active: !current } : x));
  };

  const createAuction = async () => {
    if (!auctionSlug || !auctionStart) return;
    const aSlug = auctionSlug.trim();
    await supabase.from('premium_slugs' as any).upsert({
      slug: auctionSlug, keyword: auctionSlug,
      price: parseFloat(auctionStart), active: true,
      auction: true, auction_end: auctionEnd || null,
    });
    setAuctionSlug(''); setAuctionStart(''); setAuctionEnd('');
    loadAll();
    toast.success(T('gov_toast_auction_created').replace('{slug}', aSlug));
  };

  // Broadcast
  const sendBroadcast = async () => {
    if (!broadcastMsg || !broadcastTitle) return;
    setSending(true);
    // Insert notification for all users (via mini_sites user_ids)
    const userIds = Array.from(new Set(sites.map((s: any) => s.user_id)));
    const notifs = userIds.map(uid => ({
      user_id: uid, type: 'broadcast',
      title: broadcastTitle, message: broadcastMsg, read: false,
    }));
    // Insert in batches of 50
    for (let i = 0; i < notifs.length; i += 50) {
      await supabase.from('notifications' as any).insert(notifs.slice(i, i + 50));
    }
    setBroadcastMsg(''); setBroadcastTitle('');
    setSending(false);
    toast.success(T('gov_toast_broadcast_users').replace('{count}', String(userIds.length)));
  };

  // Settings save
  const saveSettings = async () => {
    setSavingSettings(true);
    await supabase.from('platform_settings' as any).upsert({
      id: 1, site_name: siteName, favicon_url: faviconUrl,
      site_url: siteUrl, commission_paywall: parseFloat(commissionRate),
      ticker_text: tickerText, updated_at: new Date().toISOString(),
    });
    setSavingSettings(false);
    toast.success(T('toast_settings_saved'));
  };

  const uploadFavicon = async (file: File) => {
    const path = `admin/favicon_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('platform-assets').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const url = supabase.storage.from('platform-assets').getPublicUrl(path).data.publicUrl;
    setFaviconUrl(url);
    toast.success(T('gov_toast_favicon'));
  };

  const saveApiKeys = async () => {
    setSavingKeys(true);
    await supabase.from('platform_settings' as any).upsert({
      id: 1,
      stripe_key: stripeKey, stripe_webhook: stripeWebhook,
      coinbase_key: coinbaseKey, coinbase_webhook: coinbaseWebhook,
      platform_wallet: platformWallet,
      updated_at: new Date().toISOString(),
    });
    setSavingKeys(false);
    toast.success(T('gov_toast_api_keys_saved'));
  };

  const createAdminSite = async () => {
    if (!newSiteSlug || !newSiteName) return;
    setCreatingSite(true);
    try {
      // Find user by email or create without user
      let userId = user!.id; // default to admin
      if (newSiteEmail) {
        const { data: found } = await supabase.from('mini_sites').select('user_id').eq('slug', newSiteEmail.split('@')[0]).maybeSingle();
        if (found) userId = found.user_id;
      }
      const { error } = await supabase.from('mini_sites').insert({
        user_id: userId, slug: newSiteSlug, site_name: newSiteName, published: true,
      });
      if (error) throw error;
      toast.success(T('gov_toast_site_created').replace('{slug}', newSiteSlug));
      setNewSiteName(''); setNewSiteSlug(''); setNewSiteEmail('');
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    setCreatingSite(false);
  };

  if (loading || checking) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAdmin) return null;

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'sites', label: 'Mini Sites', icon: Globe },
    { id: 'slugs', label: 'Slugs', icon: Crown },
    { id: 'auction', label: 'Auctions', icon: Gavel },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: Flag },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'create' as Tab, label: 'Create Site', icon: Plus },
    { id: 'apikeys' as Tab, label: 'API Keys', icon: Database },
  ];

  const filteredSites = sites.filter(s =>
    !siteSearch || s.site_name?.toLowerCase().includes(siteSearch.toLowerCase()) ||
    s.slug?.toLowerCase().includes(siteSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Admin Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg)] sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {faviconUrl && <img src={faviconUrl} alt="" className="w-7 h-7 rounded" />}
            <Shield className="w-5 h-5 text-brand" />
            <span className="font-black text-[var(--text)]">{siteName} Admin</span>
            <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="p-2 hover:bg-[var(--bg2)] rounded-lg text-[var(--text2)]">
              <RefreshCw className="w-4 h-4" />
            </button>
            <a href="/" className="text-xs text-[var(--text2)] hover:text-[var(--text)] px-3 py-1.5">← Site</a>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 flex gap-0">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 py-6 pr-4 border-r border-[var(--border)] min-h-[calc(100vh-56px)] sticky top-14 self-start">
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  tab === id ? 'bg-brand text-white' : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
                }`}>
                <Icon className="w-4 h-4 shrink-0" /> {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 py-6 pl-6 min-w-0">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">Overview</h1>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Mini Sites', value: stats.sites, icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Slug Regs', value: stats.slugs, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: 'Users', value: stats.users, icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
                  { label: 'Classifieds', value: stats.classifieds, icon: Tag, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                  { label: 'Videos', value: stats.videos, icon: Activity, color: 'text-pink-500', bg: 'bg-pink-500/10' },
                  { label: 'Revenue', value: `$${stats.revenue.toFixed(0)}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="card p-5">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="text-2xl font-black text-[var(--text)]">{value}</p>
                    <p className="text-xs text-[var(--text2)] mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Recent sites */}
              <div className="card p-5">
                <h2 className="font-black text-[var(--text)] mb-4">Latest Mini Sites</h2>
                <div className="space-y-2">
                  {sites.slice(0, 8).map(site => (
                    <div key={site.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <div className="flex items-center gap-3">
                        {site.avatar_url
                          ? <img src={site.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          : <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-black text-brand">{site.site_name?.[0]}</div>
                        }
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">{site.site_name || 'Unnamed'}</p>
                          <p className="text-xs text-[var(--text2)] font-mono">/{site.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${site.published ? 'bg-green-500/10 text-green-500' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}>
                          {site.published ? 'Live' : 'Draft'}
                        </span>
                        <a href={`https://${site.slug}.trustbank.xyz`} target="_blank" className="text-xs text-brand hover:underline">View</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SITES */}
          {tab === 'sites' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-[var(--text)]">Mini Sites ({filteredSites.length})</h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
                  <input value={siteSearch} onChange={e => setSiteSearch(e.target.value)}
                    className="input pl-9 w-56" placeholder="Search sites..." />
                </div>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg2)]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text2)] uppercase">Site</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text2)] uppercase">Slug</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text2)] uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text2)] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSites.map(site => (
                      <tr key={site.id} className="border-b border-[var(--border)] hover:bg-[var(--bg2)]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {site.avatar_url
                              ? <img src={site.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                              : <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-black text-brand">{site.site_name?.[0]}</div>
                            }
                            <span className="text-sm font-medium text-[var(--text)]">{site.site_name || 'Unnamed'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text2)]">/{site.slug}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${site.published ? 'bg-green-500/10 text-green-500' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}>
                              {site.published ? 'Live' : 'Draft'}
                            </span>
                            {site.blocked && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-500/10 text-red-400">Blocked</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => togglePublish(site.id, site.published)}
                              className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${site.published ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}>
                              {site.published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => freePlan(site.user_id)}
                              className="text-xs px-2 py-1 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 font-medium">
                              Free Pro
                            </button>
                            <button onClick={() => toggleBlock(site.id, site.blocked)}
                              className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${site.blocked ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>
                              {site.blocked ? 'Unblock' : 'Block'}
                            </button>
                            <a href={`https://${site.slug}.trustbank.xyz`} target="_blank"
                              className="text-xs px-2 py-1 rounded-lg bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)]">
                              View
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLUGS */}
          {tab === 'slugs' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">Slug Management</h1>

              {/* Add single slug */}
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Single Slug</h2>
                <div className="flex gap-3">
                  <input value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="input flex-1" placeholder="slug name" />
                  <input value={newSlugPrice} onChange={e => setNewSlugPrice(e.target.value)}
                    className="input w-32" placeholder="Price $" type="number" />
                  <button onClick={addSingleSlug} disabled={addingSlug || !newSlug || !newSlugPrice}
                    className="btn-primary px-4">{addingSlug ? '...' : 'Add'}</button>
                </div>
              </div>

              {/* Bulk add */}
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2"><Database className="w-4 h-4" /> {T('gov_bulk_register_title')}</h2>
                <p className="text-xs text-[var(--text2)] mb-3">{T('gov_bulk_slug_format_help')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <textarea value={bulkSlugs} onChange={e => setBulkSlugs(e.target.value)}
                    className="input resize-none font-mono text-sm" rows={10}
                    placeholder={"ceo:5000\nboss:1500\nartist:500\ndev:500\nfit\nshop\ncars"} />
                  <div className="space-y-3">
                    <div>
                      <label className="label block mb-1">{T('gov_bulk_default_price_lbl')}</label>
                      <input value={bulkPrice} onChange={e => setBulkPrice(e.target.value)}
                        className="input" placeholder="ex: 12" type="number" />
                    </div>
                    <p className="text-xs text-[var(--text2)]">{T('gov_bulk_slugs_count').replace('{n}', String(bulkSlugs.split('\n').filter(s => s.trim()).length))}</p>
                    <button onClick={addBulkSlugs} disabled={!bulkSlugs || !bulkPrice} className="btn-primary w-full justify-center">
                      <Zap className="w-4 h-4" /> Add All Slugs
                    </button>
                  </div>
                </div>
              </div>

              {/* Active slugs */}
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-3">Premium Slugs Marketplace ({premiumSlugs.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                  {premiumSlugs.map(s => (
                    <div key={s.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm ${s.active ? 'border-[var(--border)] bg-[var(--bg2)]' : 'border-red-500/20 bg-red-500/5 opacity-60'}`}>
                      <div>
                        <p className="font-mono font-bold text-[var(--text)]">/{s.slug || s.keyword}</p>
                        <p className="text-xs text-brand">${s.price?.toLocaleString()}</p>
                        {s.sold_to && <p className="text-xs text-green-500">Sold</p>}
                      </div>
                      <button onClick={() => toggleSlugActive(s.id, s.active)}
                        className={`text-xs px-1.5 py-0.5 rounded ${s.active ? 'text-amber-400 hover:text-red-400' : 'text-green-400'}`}>
                        {s.active ? '●' : '○'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slug registrations */}
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-3">Registered Slugs ({slugRegs.length})</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {slugRegs.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
                      <span className="font-mono font-bold text-[var(--text)] text-sm">/{r.slug}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>{r.status}</span>
                        <span className="text-xs text-[var(--text2)]">${r.registration_fee}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AUCTIONS */}
          {tab === 'auction' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">Slug Auctions</h1>
              <div className="card p-6">
                <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2"><Gavel className="w-4 h-4" /> Create Auction</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label block mb-1">Slug</label>
                    <input value={auctionSlug} onChange={e => setAuctionSlug(e.target.value.toLowerCase())}
                      className="input" placeholder="e.g. ceo" />
                  </div>
                  <div>
                    <label className="label block mb-1">Starting Price ($)</label>
                    <input value={auctionStart} onChange={e => setAuctionStart(e.target.value)}
                      className="input" type="number" placeholder="100" />
                  </div>
                  <div>
                    <label className="label block mb-1">End Date (optional)</label>
                    <input value={auctionEnd} onChange={e => setAuctionEnd(e.target.value)}
                      className="input" type="datetime-local" />
                  </div>
                </div>
                <button onClick={createAuction} disabled={!auctionSlug || !auctionStart}
                  className="btn-primary mt-4">
                  <Gavel className="w-4 h-4" /> Start Auction
                </button>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-3">Active Auctions</h2>
                <div className="space-y-2">
                  {premiumSlugs.filter((s: any) => s.auction).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
                      <div>
                        <p className="font-mono font-bold text-[var(--text)]">/{s.slug}</p>
                        <p className="text-xs text-[var(--text2)]">Starting: ${s.price}</p>
                      </div>
                      <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full font-semibold">🔥 Auction</span>
                    </div>
                  ))}
                  {premiumSlugs.filter((s: any) => s.auction).length === 0 && (
                    <p className="text-sm text-[var(--text2)] text-center py-8">No active auctions</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-black text-[var(--text)]">Users ({sites.length})</h1>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="input pl-9 max-w-sm" placeholder="Search users..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites
                  .filter(s => !userSearch || s.site_name?.toLowerCase().includes(userSearch.toLowerCase()))
                  .map(site => (
                  <div key={site.id} className="card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {site.avatar_url
                        ? <img src={site.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        : <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center font-black text-brand">{site.site_name?.[0]}</div>
                      }
                      <div>
                        <p className="font-semibold text-[var(--text)] text-sm">{site.site_name || 'Unnamed'}</p>
                        <p className="text-xs text-[var(--text2)] font-mono">/{site.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => freePlan(site.user_id)} className="text-xs px-2 py-1 rounded-lg bg-brand/10 text-brand hover:bg-brand/20">Free Pro</button>
                      <button onClick={() => togglePublish(site.id, site.published)} className={`text-xs px-2 py-1 rounded-lg ${site.published ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                        {site.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => toggleBlock(site.id, site.blocked)} className={`text-xs px-2 py-1 rounded-lg ${site.blocked ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>
                        {site.blocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPORTS */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-black text-[var(--text)]">Reports & Moderation</h1>
              <div className="card p-6 text-center py-12">
                <Flag className="w-12 h-12 text-[var(--text2)]/30 mx-auto mb-3" />
                <p className="font-semibold text-[var(--text)]">No reports yet</p>
                <p className="text-sm text-[var(--text2)] mt-1">User reports about videos, posts and classifieds will appear here.</p>
              </div>
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Remove all expired posts', action: () => toast.info(T('gov_clean_expired_posts')), icon: Trash2 },
                    { label: 'Scan for spam', action: () => toast.info(T('gov_scan_spam')), icon: Search },
                    { label: 'Export site list', action: () => toast.info(T('gov_export_sites')), icon: FileText },
                    { label: 'Clear notifications', action: () => toast.info(T('gov_clear_notifications')), icon: Bell },
                  ].map(({ label, action, icon: Icon }) => (
                    <button key={label} onClick={action}
                      className="p-4 rounded-xl border border-[var(--border)] hover:border-brand hover:bg-brand/5 transition-all text-left">
                      <Icon className="w-5 h-5 text-[var(--text2)] mb-2" />
                      <p className="text-xs font-medium text-[var(--text)]">{label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BROADCAST */}
          {tab === 'broadcast' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">Broadcast Messages</h1>
              <div className="card p-6">
                <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2"><Radio className="w-4 h-4 text-brand" /> Send to All Users</h2>
                <div className="space-y-3">
                  <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
                    className="input" placeholder="Notification title (e.g. New feature!)" />
                  <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                    className="input resize-none" rows={5} placeholder="Write your message to all users..." />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--text2)]">Will be sent to {sites.length} users as in-app notification</p>
                    <button onClick={sendBroadcast} disabled={sending || !broadcastMsg || !broadcastTitle}
                      className="btn-primary flex items-center gap-2">
                      {sending ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</> : <><Megaphone className="w-4 h-4" /> Send Broadcast</>}
                    </button>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <h2 className="font-semibold text-[var(--text)] mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Site Ticker Message</h2>
                <div className="flex gap-3">
                  <input value={tickerText} onChange={e => setTickerText(e.target.value)}
                    className="input flex-1" placeholder="Message shown in the ticker bar... (slug names, announcements)" />
                  <button onClick={saveSettings} className="btn-primary px-4">Save</button>
                </div>
                <p className="text-xs text-[var(--text2)] mt-2">This text appears in the scrolling ticker at the top of every page.</p>
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {tab === 'analytics' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">Analytics</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sites', value: stats.sites, sub: 'all time' },
                  { label: 'Published', value: sites.filter(s => s.published).length, sub: 'live now' },
                  { label: 'Total Revenue', value: `$${stats.revenue.toFixed(2)}`, sub: 'from slugs' },
                  { label: 'Active Slugs', value: premiumSlugs.filter(s => s.active).length, sub: 'for sale' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="card p-5">
                    <p className="text-3xl font-black text-[var(--text)]">{value}</p>
                    <p className="text-sm font-semibold text-[var(--text)] mt-1">{label}</p>
                    <p className="text-xs text-[var(--text2)]">{sub}</p>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-4">Site Growth</h2>
                <div className="space-y-2">
                  {sites.slice(0, 10).map(site => (
                    <div key={site.id} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-[var(--text2)] font-mono truncate">/{site.slug}</div>
                      <div className="flex-1 bg-[var(--bg2)] rounded-full h-2">
                        <div className="bg-brand rounded-full h-2" style={{ width: site.published ? '100%' : '40%' }} />
                      </div>
                      <span className={`text-xs font-semibold w-16 text-right ${site.published ? 'text-green-500' : 'text-[var(--text2)]'}`}>
                        {site.published ? 'Live' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* API KEYS */}
          {tab === ('apikeys' as Tab) && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">API Keys & Payment Config</h1>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-600">🔒 Sensitive Data</p>
                <p className="text-xs text-amber-600/80 mt-1">These keys are stored in your database. For production, use Vercel environment variables instead.</p>
              </div>

              {/* Stripe */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#635bff]/10 flex items-center justify-center">
                    <span className="text-[#635bff] font-black text-xs">S</span>
                  </div>
                  <h2 className="font-semibold text-[var(--text)]">Stripe (Credit Card)</h2>
                  <a href="https://dashboard.stripe.com/apikeys" target="_blank" className="text-xs text-brand hover:underline ml-auto">Get keys →</a>
                </div>
                <div>
                  <label className="label block mb-1">Secret Key (sk_live_...)</label>
                  <input value={stripeKey} onChange={e => setStripeKey(e.target.value)} className="input font-mono text-xs" placeholder="sk_live_..." type="password" />
                </div>
                <div>
                  <label className="label block mb-1">Webhook Secret (whsec_...)</label>
                  <input value={stripeWebhook} onChange={e => setStripeWebhook(e.target.value)} className="input font-mono text-xs" placeholder="whsec_..." type="password" />
                </div>
                <div className="bg-[var(--bg2)] rounded-xl p-3 text-xs text-[var(--text2)]">
                  <p className="font-semibold mb-1">Stripe Webhook URL:</p>
                  <code className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}/api/stripe/webhook</code>
                </div>
              </div>

              {/* Coinbase */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-500 font-black text-xs">C</span>
                  </div>
                  <h2 className="font-semibold text-[var(--text)]">Coinbase Commerce (USDC)</h2>
                  <a href="https://commerce.coinbase.com/settings/security" target="_blank" className="text-xs text-brand hover:underline ml-auto">Get keys →</a>
                </div>
                <div>
                  <label className="label block mb-1">Coinbase App ID (for Onramp)</label>
                  <input value={coinbaseKey} onChange={e => setCoinbaseKey(e.target.value)} className="input font-mono text-xs" placeholder="App ID from portal.cdp.coinbase.com" />
                </div>
                <div>
                  <label className="label block mb-1">Webhook Secret</label>
                  <input value={coinbaseWebhook} onChange={e => setCoinbaseWebhook(e.target.value)} className="input font-mono text-xs" placeholder="Webhook secret..." type="password" />
                </div>
                <div>
                  <label className="label block mb-1">Platform Wallet (Polygon/USDC receiver)</label>
                  <input value={platformWallet} onChange={e => setPlatformWallet(e.target.value)} className="input font-mono text-xs" placeholder="0x..." />
                  <p className="text-xs text-[var(--text2)] mt-1">Legacy Polygon receiver (e.g. credits); main checkout uses Stripe</p>
                </div>
                <div className="bg-[var(--bg2)] rounded-xl p-3 text-xs text-[var(--text2)]">
                  <p className="font-semibold mb-1">Coinbase Webhook URL:</p>
                  <code className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}/api/coinbase/webhook</code>
                </div>
              </div>

              {/* Vercel env vars guide */}
              <div className="card p-6">
                <h2 className="font-semibold text-[var(--text)] mb-3">📋 Vercel Environment Variables</h2>
                <p className="text-xs text-[var(--text2)] mb-3">For production, add these in Vercel → Settings → Environment Variables:</p>
                <div className="bg-black rounded-xl p-4 font-mono text-xs space-y-1">
                  {[
                    'NEXT_PUBLIC_SUPABASE_URL',
                    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                    'NEXT_PUBLIC_COINBASE_APP_ID',
                    'NEXT_PUBLIC_PLATFORM_WALLET',
                    'STRIPE_SECRET_KEY',
                    'STRIPE_WEBHOOK_SECRET',
                    'COINBASE_WEBHOOK_SECRET',
                  ].map(k => <p key={k} className="text-green-400">{k}=<span className="text-slate-500">your_value</span></p>)}
                </div>
              </div>

              <button onClick={saveApiKeys} disabled={savingKeys} className="btn-primary px-8 py-3">
                {savingKeys ? 'Saving...' : '💾 Save API Keys'}
              </button>
            </div>
          )}

          {/* CREATE SITE */}
          {tab === ('create' as Tab) && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">Create Mini Site (Admin)</h1>
              <div className="card p-6 space-y-4">
                <p className="text-sm text-[var(--text2)]">Create a mini site for any user, published and free, without payment.</p>
                <div>
                  <label className="label block mb-1">Site Name</label>
                  <input value={newSiteName} onChange={e => setNewSiteName(e.target.value)} className="input" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="label block mb-1">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text2)] text-sm">/s/</span>
                    <input value={newSiteSlug} onChange={e => setNewSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} className="input flex-1" placeholder="johndoe" />
                  </div>
                </div>
                <div>
                  <label className="label block mb-1">User Email (optional — links to their account)</label>
                  <input value={newSiteEmail} onChange={e => setNewSiteEmail(e.target.value)} className="input" placeholder="user@email.com" type="email" />
                </div>
                <button onClick={createAdminSite} disabled={creatingSite || !newSiteName || !newSiteSlug} className="btn-primary w-full justify-center py-3">
                  {creatingSite ? 'Creating...' : '🚀 Create & Publish Site (Free)'}
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-[var(--text)]">Platform Settings</h1>

              {/* Feed global toggle */}
              <div className="card p-5">
                <h2 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-brand" /> Feed Global 400x448</h2>
                <div className="flex items-center justify-between p-4 bg-[var(--bg2)] rounded-xl">
                  <div>
                    <p className="font-semibold text-sm text-[var(--text)]">{T('gov_feed_window_title')}</p>
                    <p className="text-xs text-[var(--text2)] mt-0.5">{T('gov_feed_when_off_desc')}</p>
                  </div>
                  <button onClick={async()=>{
                    const {data:curr} = await (supabase as any).from('platform_settings').select('value').eq('key','feed_enabled_global').maybeSingle();
                    const next = curr?.value !== 'true' ? 'true' : 'false';
                    await (supabase as any).from('platform_settings').upsert({key:'feed_enabled_global',value:next,updated_at:new Date().toISOString()},{onConflict:'key'});
                    toast.success(next === 'true' ? T('gov_toast_feed_global_on') : T('gov_toast_feed_global_off'));
                  }} className="btn-primary text-xs px-4">{T('gov_feed_toggle_btn')}</button>
                </div>
              </div>

              <div className="card p-6 space-y-5">
                <h2 className="font-semibold text-[var(--text)] flex items-center gap-2"><Globe className="w-4 h-4" /> Branding</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1">Platform Name</label>
                    <input value={siteName} onChange={e => setSiteName(e.target.value)} className="input" placeholder="TrustBank" />
                  </div>
                  <div>
                    <label className="label block mb-1">Site URL</label>
                    <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)} className="input" placeholder="https://trustbank.xyz" />
                  </div>
                </div>

                <div>
                  <label className="label block mb-2">Favicon</label>
                  <div className="flex items-center gap-4">
                    {faviconUrl && <img src={faviconUrl} alt="favicon" className="w-10 h-10 rounded-lg border border-[var(--border)]" />}
                    <label className="btn-secondary text-xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Upload Favicon
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFavicon(e.target.files[0])} />
                    </label>
                    {faviconUrl && <input value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} className="input flex-1 text-xs" placeholder="or paste URL" />}
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[var(--text)] flex items-center gap-2"><DollarSign className="w-4 h-4" /> Revenue Settings</h2>
                <div>
                  <label className="label block mb-1">Commission Rate (%) — Platform takes this % from paywall/CV unlocks</label>
                  <input value={commissionRate} onChange={e => setCommissionRate(e.target.value)}
                    className="input max-w-xs" type="number" min="0" max="100" />
                  <p className="text-xs text-[var(--text2)] mt-1">Creator receives {100 - parseFloat(commissionRate || '40')}%</p>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[var(--text)] flex items-center gap-2"><Activity className="w-4 h-4" /> Ticker Bar</h2>
                <textarea value={tickerText} onChange={e => setTickerText(e.target.value)}
                  className="input resize-none" rows={3}
                  placeholder="DEV.HASHPO ($49) 🔥 ARTIST.HASHPO ($29) 🔥 GAMER.HASHPO ($19)..." />
                <p className="text-xs text-[var(--text2)]">Appears in the scrolling bar at the top. Leave empty to use live slug data.</p>
              </div>

              <button onClick={saveSettings} disabled={savingSettings} className="btn-primary px-8 py-3 text-base">
                {savingSettings ? 'Saving...' : '💾 Save All Settings'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
