'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Key, Wallet, BarChart3, Settings, Save, Users, Globe,
  ToggleLeft, ToggleRight, DollarSign, Loader2, Plus, Trash2,
  Send, Bell, Shield, Tag, Gavel, ArrowRightLeft, RefreshCw, Sparkles,
  CheckCircle, XCircle, Eye, Copy, X, LayoutGrid, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { attachMiniSitesToSlugRows } from '@/lib/slugRegistrationMiniSite';
import { AdminMysticLottery } from '@/components/mystic/AdminMysticLottery';

const OWNER_EMAIL = 'arytcf@gmail.com';

type AdminAccountRow = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  blocked: boolean;
};

function Toggle({ label, desc, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)]">
      <div>
        <p className="font-bold text-sm text-[var(--text)]">{label}</p>
        <p className="text-xs text-[var(--text2)]">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-brand' : 'bg-[var(--border)]'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const T = useT();
  const [tab, setTab] = useState<'analytics'|'accounts'|'minisites'|'mystic'|'slugs'|'broadcast'|'features'|'pricing'|'wallet'|'apis'|'code'|'plans'>('analytics');
  const [saving, setSaving] = useState(false);
  /** null = a verificar; evita hooks condicionais mais abaixo */
  const [adminAllowed, setAdminAllowed] = useState<boolean | null>(null);

  // Stats
  const [stats, setStats] = useState<any>({});

  // Wallet & URLs
  const [platformWallet, setPlatformWallet] = useState('');
  const [siteUrl, setSiteUrl] = useState('https://trustbank.xyz');
  const [userWalletEmail, setUserWalletEmail] = useState('');
  const [userWalletAddress, setUserWalletAddress] = useState('');
  const [deleteSiteSlug, setDeleteSiteSlug] = useState('');
  const [deleteSiteEmail, setDeleteSiteEmail] = useState('');
  const [deletingSite, setDeletingSite] = useState(false);

  // Slugs admin
  const [slugsBulk, setSlugsBulk]     = useState('');
  const [adminSlugs, setAdminSlugs]   = useState<any[]>([]);
  const [allSlugs, setAllSlugs]       = useState<any[]>([]);
  const [slugSearch, setSlugSearch]   = useState('');
  const [allSlugsLoading, setAllSlugsLoading] = useState(false);
  const [adminSlugInput, setAdminSlugInput] = useState('');
  const [bulkSlugs, setBulkSlugs] = useState('');
  const [bulkRegistering, setBulkRegistering] = useState(false);
  const [bulkResults, setBulkResults] = useState<string[]>([]);
  const [adminSlugEmail, setAdminSlugEmail] = useState('');

  const registerBulk = async () => {
    const slugList = bulkSlugs.split(/[\n,]/).map(s => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);
    if (!slugList.length) return;
    setBulkRegistering(true);
    const results: string[] = [];
    for (const slug of slugList) {
      const { data: existing } = await (supabase as any).from('slug_registrations').select('id').eq('slug', slug).maybeSingle();
      if (existing) { results.push(T('admin_bulk_exists').replace('{slug}', slug)); continue; }
      const { error } = await (supabase as any).from('slug_registrations').insert({
        user_id: user?.id, slug, status: 'active',
        expires_at: new Date(Date.now() + 365*86400000).toISOString(), for_sale: false,
      });
      if (error) results.push(T('admin_bulk_err').replace('{slug}', slug));
      else results.push(T('admin_bulk_ok').replace('{slug}', slug));
    }
    setBulkResults(results);
    setBulkRegistering(false);
    toast.success(T('toast_admin_bulk_register').replace('{count}', String(results.filter(r => r.startsWith('✅')).length)));
  };

  const registerSlugFree = async () => {
    const clean = adminSlugInput.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) return;
    const { data: existing } = await (supabase as any).from('slug_registrations').select('id').eq('slug', clean).maybeSingle();
    if (existing) { toast.error(T('err_slug_taken_toast').replace('{slug}', clean)); return; }
    let userId = user?.id;
    if (adminSlugEmail) {
      const { data: target } = await (supabase as any).from('mini_sites').select('user_id').eq('contact_email', adminSlugEmail).maybeSingle();
      if (target) userId = (target as any).user_id;
    }
    await (supabase as any).from('slug_registrations').insert({ user_id: userId, slug: clean, status: 'active', expires_at: new Date(Date.now() + 365*86400000).toISOString(), for_sale: false });
    toast.success(T('toast_admin_slug_registered').replace('{slug}', clean));
    setAdminSlugInput('');
  };
  const [slugsLoading, setSlugsLoading] = useState(false);

  // Broadcast
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [broadcasts, setBroadcasts]     = useState<any[]>([]);

  // Features
  const [features, setFeatures] = useState({
    feed_enabled: true, boost_enabled: true,
    cv_directory_enabled: true, slug_marketplace_enabled: true,
    registration_open: true, classified_enabled: true,
    video_paywall_enabled: true,
  });
  // Pricing
  const [pricing, setPricing] = useState({
    plan_price: '29.99',
    slug_free_per_plan: '1',
    listings_free_per_plan: '10',
    video_split_creator: '70',
    cv_split_creator: '50',
    slug_split_creator: '85',
    slug_min_price: '10',
    slug_premium_min: '100',
  });

  // Code injection
  const [headCode,   setHeadCode]   = useState('');
  const [bodyCode,   setBodyCode]   = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [trialHours, setTrialHours] = useState('24');
  const [graceDays, setGraceDays] = useState('30');
  const [warningHours, setWarningHours] = useState('1');
  const [testRibbonText, setTestRibbonText] = useState('TEST MODE');

  // API keys status
  const [apiStatus, setApiStatus] = useState({ stripe: false, supabase: true, r2: false });

  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsHasMore, setAccountsHasMore] = useState(false);
  const [accountsTotal, setAccountsTotal] = useState<number | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsTogglingId, setAccountsTogglingId] = useState<string | null>(null);

  const MINI_SITES_PER_PAGE = 30;
  const [miniSitesPage, setMiniSitesPage] = useState(1);
  const [miniSitesList, setMiniSitesList] = useState<
    { id: string; slug: string; site_name: string; avatar_url: string | null; published: boolean; updated_at: string }[]
  >([]);
  const [miniSitesTotal, setMiniSitesTotal] = useState(0);
  const [miniSitesLoading, setMiniSitesLoading] = useState(false);
  const [miniSitesBulkText, setMiniSitesBulkText] = useState('');
  const [miniSitesBulkLoading, setMiniSitesBulkLoading] = useState(false);
  const [miniSitesBulkLog, setMiniSitesBulkLog] = useState<string[]>([]);

  const loadMyMiniSites = useCallback(
    async (page: number) => {
      if (!user?.id) return;
      setMiniSitesLoading(true);
      try {
        const from = (page - 1) * MINI_SITES_PER_PAGE;
        const to = from + MINI_SITES_PER_PAGE - 1;
        const { data, error, count } = await supabase
          .from('mini_sites')
          .select('id, slug, site_name, avatar_url, published, updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .range(from, to);
        if (error) throw error;
        setMiniSitesList(
          (data || []) as {
            id: string;
            slug: string;
            site_name: string;
            avatar_url: string | null;
            published: boolean;
            updated_at: string;
          }[],
        );
        setMiniSitesTotal(typeof count === 'number' ? count : 0);
        setMiniSitesPage(page);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setMiniSitesLoading(false);
      }
    },
    [user?.id],
  );

  const createMiniSitesBulk = async () => {
    const text = miniSitesBulkText.trim();
    if (!text) return;
    setMiniSitesBulkLoading(true);
    setMiniSitesBulkLog([]);
    try {
      const res = await fetch('/api/admin/create-mini-sites-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        results?: { slug: string; ok: boolean; error?: string }[];
        okCount?: number;
        total?: number;
      };
      if (!res.ok) {
        toast.error(j.error || 'Falha ao criar');
        return;
      }
      const lines =
        j.results?.map((r) =>
          r.ok ? `✅ ${r.slug}` : `⛔ ${r.slug}${r.error ? `: ${r.error}` : ''}`,
        ) || [];
      setMiniSitesBulkLog(lines);
      toast.success(
        T('admin_minisites_bulk_toast')
          .replace('{ok}', String(j.okCount ?? 0))
          .replace('{total}', String(j.total ?? lines.length)),
      );
      setMiniSitesBulkText('');
      void loadMyMiniSites(1);
      setMiniSitesPage(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setMiniSitesBulkLoading(false);
    }
  };

  /** DeepSeek / OpenAI-compatible: sugestão de preços (opcional). Chave também pode ir só em DEEPSEEK_API_KEY na Vercel. */
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: '',
  });

  const loadAccounts = useCallback(async (page: number) => {
    setAccountsLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts?page=${page}&perPage=50`, { cache: 'no-store' });
      const j = (await res.json().catch(() => ({}))) as {
        users?: AdminAccountRow[];
        page?: number;
        hasMore?: boolean;
        total?: number | null;
        error?: string;
      };
      if (!res.ok) {
        toast.error(j.error || T('admin_accounts_err_load'));
        return;
      }
      setAccounts(j.users || []);
      if (typeof j.page === 'number') setAccountsPage(j.page);
      setAccountsHasMore(Boolean(j.hasMore));
      setAccountsTotal(typeof j.total === 'number' ? j.total : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setAccountsLoading(false);
    }
  }, [T]);

  const toggleAccountBlocked = async (row: AdminAccountRow, blocked: boolean) => {
    if (blocked && row.id === user?.id) {
      toast.error(T('admin_accounts_self_block'));
      return;
    }
    setAccountsTogglingId(row.id);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: row.id, blocked }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(j.error || 'Failed');
        return;
      }
      toast.success(T('admin_accounts_updated'));
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === row.id
            ? { ...a, blocked, banned_until: blocked ? a.banned_until : null }
            : a,
        ),
      );
      await loadAccounts(accountsPage);
    } finally {
      setAccountsTogglingId(null);
    }
  };

  useEffect(() => {
    if (tab !== 'accounts') return;
    if (!user || adminAllowed !== true) return;
    setAccountsPage(1);
    void loadAccounts(1);
  }, [tab, user?.id, adminAllowed, loadAccounts]);

  const loadPlans = async () => {
    const { data, error } = await (supabase as any)
      .from('platform_plans')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPlans(data || []);
    setPlansLoaded(true);
  };

  const savePlan = async (p: any) => {
    setSaving(true);
    try {
      let feats: string[] = [];
      if (typeof p.features === 'string') {
        feats = p.features.split('\n').map((x: string) => x.trim()).filter(Boolean);
      } else if (Array.isArray(p.features)) {
        feats = p.features;
      }
      const baseSlug = String(p.slug || p.name || 'plan')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 40) || 'plan';
      const row = {
        name: p.name,
        price_monthly: Number(p.price_monthly) || 0,
        price_yearly: Number(p.price_yearly) || 0,
        color: p.color || '#818cf8',
        emoji: p.emoji || '✨',
        features: feats,
        active: p.active !== false,
        sort_order: Number(p.sort_order) || 0,
      };
      if (p.id) {
        const { error } = await (supabase as any).from('platform_plans').update(row).eq('id', p.id);
        if (error) throw error;
      } else {
        const slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);
        const { error } = await (supabase as any).from('platform_plans').insert({ ...row, slug });
        if (error) throw error;
      }
      toast.success(T('toast_saved'));
      setEditingPlan(null);
      await loadPlans();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setAdminAllowed(false);
        return;
      }
      const email = (user.email || '').toLowerCase();
      if (email === OWNER_EMAIL.toLowerCase()) {
        if (!cancelled) setAdminAllowed(true);
        return;
      }
      const { data } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (!cancelled) setAdminAllowed(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user || adminAllowed !== true) return;

    // Load stats
    Promise.all([
      supabase.from('mini_sites').select('id', { count: 'exact' }),
      supabase.from('mini_sites').select('id', { count: 'exact' }).eq('published', true),
      supabase.auth.admin ? Promise.resolve({ count: 0 }) : supabase.from('user_roles').select('id', { count: 'exact' }),
      (supabase as any).from('paywall_unlocks').select('amount_paid').limit(1000),
      (supabase as any).from('slug_registrations').select('id', { count: 'exact' }),
      (supabase as any).from('classified_listings').select('id', { count: 'exact' }),
    ]).then(([sites, published, users, unlocks, slugs, listings]) => {
      const revenue = ((unlocks as any).data || []).reduce((a: number, r: any) => a + (r.amount_paid || 0), 0);
      setStats({
        total_sites: (sites as any).count || 0,
        published_sites: (published as any).count || 0,
        total_slugs: (slugs as any).count || 0,
        total_listings: (listings as any).count || 0,
        revenue,
      });
    });

    // Load platform settings
    (supabase as any).from('platform_settings').select('*').then(({ data }: any) => {
      (data || []).forEach((s: any) => {
        if (s.key === 'platform_wallet') setPlatformWallet(s.value || '');
        if (s.key === 'site_url') setSiteUrl(s.value || 'https://trustbank.xyz');
        if (s.key === 'features') { try { setFeatures(JSON.parse(s.value)); } catch {} }
        if (s.key === 'head_code') setHeadCode(s.value || '');
        if (s.key === 'body_code') setBodyCode(s.value || '');
        if (s.key === 'terms_content') setTermsContent(s.value || '');
        if (s.key === 'privacy_content') setPrivacyContent(s.value || '');
        if (s.key === 'trial_hours') setTrialHours(String(s.value || '24'));
        if (s.key === 'grace_days') setGraceDays(String(s.value || '30'));
        if (s.key === 'warning_hours') setWarningHours(String(s.value || '1'));
        if (s.key === 'test_ribbon_text') setTestRibbonText(s.value || 'TEST MODE');
        if (s.key === 'pricing')  { try { setPricing(p => ({ ...p, ...JSON.parse(s.value) })); } catch {} }
        if (s.key === 'ai_config') {
          try {
            const j = JSON.parse(s.value) as typeof aiConfig;
            setAiConfig(prev => ({ ...prev, ...j, apiKey: j.apiKey || '' }));
          } catch { /* ignore */ }
        }
      });
    });

    // Load admin slugs
    loadAdminSlugs();

    // Load broadcasts
    (supabase as any).from('broadcasts').select('*').order('created_at', { ascending: false }).limit(10)
      .then(({ data }: any) => setBroadcasts(data || []));

    fetch('/api/checkout')
      .then((r) => r.json())
      .then((j) => {
        setApiStatus({
          stripe: !!j?.stripeConfigured,
          supabase: true,
          r2: !!process.env.R2_WORKER_URL,
        });
      })
      .catch(() => {
        setApiStatus({
          stripe: false,
          supabase: true,
          r2: !!process.env.R2_WORKER_URL,
        });
      });
  }, [user, adminAllowed]);

  useEffect(() => {
    if (adminAllowed !== true) return;
    if (tab !== 'minisites') return;
    void loadMyMiniSites(miniSitesPage);
  }, [adminAllowed, tab, miniSitesPage, loadMyMiniSites]);

  const loadAllSlugs = async (search = '') => {
    setAllSlugsLoading(true);
    let q = (supabase as any).from('slug_registrations').select('*').order('created_at', { ascending: false }).limit(100);
    if (search) q = q.ilike('slug', `%${search}%`);
    const { data } = await q;
    const merged = await attachMiniSitesToSlugRows(supabase, data || []);
    setAllSlugs(merged);
    setAllSlugsLoading(false);
  };

  const loadAdminSlugs = async () => {
    setSlugsLoading(true);
    const { data } = await (supabase as any).from('premium_slugs').select('*').order('created_at', { ascending: false }).limit(100);
    setAdminSlugs(data || []);
    setSlugsLoading(false);
  };

  const saveSetting = async (key: string, value: string) => {
    await (supabase as any).from('platform_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('platform_wallet', platformWallet),
        saveSetting('site_url', siteUrl),
        saveSetting('features', JSON.stringify(features)),
        saveSetting('head_code', headCode),
        saveSetting('body_code', bodyCode),
        saveSetting('terms_content', termsContent),
        saveSetting('privacy_content', privacyContent),
        saveSetting('trial_hours', trialHours),
        saveSetting('grace_days', graceDays),
        saveSetting('warning_hours', warningHours),
        saveSetting('test_ribbon_text', testRibbonText),
        saveSetting('pricing', JSON.stringify(pricing)),
        saveSetting('ai_config', JSON.stringify(aiConfig)),
      ]);
      toast.success(T('toast_saved'));
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const addSlugsBulk = async () => {
    const lines = slugsBulk.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setSaving(true);
    let ok = 0, skip = 0;
    for (const line of lines) {
      const [rawSlug, rawPrice] = line.split(':').map(s => s.trim());
      const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const price = parseFloat(rawPrice) || 100;
      if (!slug) { skip++; continue; }
      const { error } = await (supabase as any).from('premium_slugs').insert({ slug, price, active: true });
      if (error?.code === '23505') skip++;
      else if (!error) ok++;
    }
    toast.success(T('toast_admin_slugs_merge').replace('{ok}', String(ok)).replace('{skip}', String(skip)));
    setSlugsBulk('');
    loadAdminSlugs();
    setSaving(false);
  };

  const deleteSlug = async (id: string) => {
    await (supabase as any).from('premium_slugs').delete().eq('id', id);
    loadAdminSlugs();
  };

  const updateSlugPrice = async (id: string, price: number) => {
    await (supabase as any).from('premium_slugs').update({ price }).eq('id', id);
    toast.success(T('toast_price_updated'));
    loadAdminSlugs();
  };

  const setWalletForUser = async () => {
    if (!userWalletEmail || !userWalletAddress) {
      toast.error(T('err_admin_email_wallet'));
      return;
    }
    const cleanEmail = userWalletEmail.trim().toLowerCase();
    const cleanWallet = userWalletAddress.trim();
    const { error } = await (supabase as any)
      .from('mini_sites')
      .update({ wallet_address: cleanWallet })
      .eq('contact_email', cleanEmail);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(T('toast_admin_wallet_updated').replace('{email}', cleanEmail));
  };

  const deleteMiniSite = async () => {
    const slug = deleteSiteSlug.trim().toLowerCase();
    const email = deleteSiteEmail.trim().toLowerCase();
    if (!slug && !email) {
      toast.error(T('err_admin_slug_email'));
      return;
    }
    setDeletingSite(true);
    try {
      const label = slug || email;
      const ok = window.confirm(T('confirm_delete_minisite').replace('{label}', label));
      if (!ok) return;

      const res = await fetch('/api/admin/delete-mini-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slug ? { slug } : { email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || T('err_delete_minisite_fail'));

      toast.success(T('toast_minisite_removed').replace('{slug}', String((payload as { slug?: string }).slug || label)));
      setDeleteSiteSlug('');
      setDeleteSiteEmail('');
    } catch (e: any) {
      toast.error(e?.message || T('err_delete_minisite_fail'));
    } finally {
      setDeletingSite(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setSaving(true);
    const { count } = await supabase.from('mini_sites').select('*', { count: 'exact', head: true });
    await (supabase as any).from('broadcasts').insert({ message: broadcastMsg, sent_to: count || 0, sent_by: user!.id });
    toast.success(T('toast_broadcast_sites').replace('{count}', String(count ?? 0)));
    setBroadcastMsg('');
    const { data } = await (supabase as any).from('broadcasts').select('*').order('created_at', { ascending: false }).limit(10);
    setBroadcasts(data || []);
    setSaving(false);
  };

  const TABS = useMemo(
    () => [
      { id: 'analytics' as const, label: T('admin_tab_analytics'), icon: BarChart3 },
      { id: 'accounts' as const, label: T('admin_tab_accounts'), icon: Users },
      { id: 'minisites' as const, label: T('admin_tab_minisites'), icon: LayoutGrid },
      { id: 'mystic' as const, label: T('admin_tab_mystic'), icon: Sparkles },
      { id: 'slugs' as const, label: T('admin_tab_slugs'), icon: Key },
      { id: 'pricing' as const, label: T('admin_tab_pricing'), icon: DollarSign },
      { id: 'features' as const, label: T('admin_tab_features'), icon: ToggleRight },
      { id: 'broadcast' as const, label: T('admin_tab_broadcast'), icon: Bell },
      { id: 'wallet' as const, label: T('admin_tab_wallet'), icon: Wallet },
      { id: 'apis' as const, label: T('admin_tab_apis'), icon: Shield },
      { id: 'code' as const, label: T('admin_tab_code'), icon: Globe },
    ],
    [T],
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }
  if (adminAllowed === null) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }
  if (!adminAllowed) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--text)] font-bold text-center">{T('admin_access_denied')}</p>
        <Link href="/" className="btn-primary">
          {T('admin_access_home')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl text-[var(--text)]">{T('admin_panel_title')}</h1>
              <p className="text-xs text-[var(--text2)]">TrustBank · {user.email}</p>
            </div>
          </div>
          <button onClick={saveAll} disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {T('admin_save_all')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap -mb-px transition-all ${tab === t.id ? 'border-brand text-brand' : 'border-transparent text-[var(--text2)] hover:text-[var(--text)]'}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* ACCOUNTS (Auth) */}
        {tab === 'accounts' && (
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="font-black text-[var(--text)] text-lg">{T('admin_accounts_title')}</h3>
                <p className="text-xs text-[var(--text2)] mt-1 max-w-2xl">{T('admin_accounts_sub')}</p>
              </div>
              <button
                type="button"
                onClick={() => loadAccounts(accountsPage)}
                disabled={accountsLoading}
                className="btn-primary text-sm px-4 gap-2 shrink-0"
              >
                {accountsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {T('admin_accounts_refresh')}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text2)]">
              <span>
                {T('admin_accounts_page').replace('{page}', String(accountsPage))}
                {accountsTotal != null ? ` · ${accountsTotal} total` : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={accountsLoading || accountsPage <= 1}
                  onClick={() => {
                    const p = Math.max(1, accountsPage - 1);
                    setAccountsPage(p);
                    void loadAccounts(p);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] font-semibold disabled:opacity-40"
                >
                  {T('admin_accounts_prev')}
                </button>
                <button
                  type="button"
                  disabled={accountsLoading || !accountsHasMore}
                  onClick={() => {
                    const p = accountsPage + 1;
                    setAccountsPage(p);
                    void loadAccounts(p);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] font-semibold disabled:opacity-40"
                >
                  {T('admin_accounts_next')}
                </button>
              </div>
            </div>

            {accountsLoading && accounts.length === 0 ? (
              <div className="flex justify-center py-12 text-[var(--text2)]">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="divide-y divide-[var(--border)] max-h-[min(70vh,520px)] overflow-y-auto">
                  {accounts.map((row) => {
                    const label =
                      row.email ||
                      (row.phone ? String(row.phone) : null) ||
                      row.id.slice(0, 8) + '…';
                    const isSelf = row.id === user?.id;
                    return (
                      <div
                        key={row.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 bg-[var(--bg2)]/60 hover:bg-[var(--bg2)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-[var(--text)] truncate">{label}</span>
                            {isSelf && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand/20 text-brand">
                                {T('admin_accounts_you')}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                row.blocked ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'
                              }`}
                            >
                              {row.blocked ? T('admin_accounts_blocked') : T('admin_accounts_active')}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text2)] font-mono mt-0.5 truncate">{row.id}</p>
                          <p className="text-[10px] text-[var(--text2)] mt-0.5">
                            {row.last_sign_in_at
                              ? `${T('admin_accounts_last_in')}: ${new Date(row.last_sign_in_at).toLocaleString()}`
                              : `${T('admin_accounts_last_in')}: —`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {row.blocked ? (
                            <button
                              type="button"
                              disabled={accountsTogglingId === row.id}
                              onClick={() => toggleAccountBlocked(row, false)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-green-500/40 text-green-400 hover:bg-green-500/10"
                            >
                              {accountsTogglingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : T('admin_accounts_enable')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={accountsTogglingId === row.id || isSelf}
                              onClick={() => toggleAccountBlocked(row, true)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                            >
                              {accountsTogglingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : T('admin_accounts_block')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {accounts.length === 0 && !accountsLoading && (
                  <p className="text-sm text-[var(--text2)] text-center py-8">{T('admin_accounts_none')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'minisites' && (
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="font-black text-[var(--text)] text-lg">{T('admin_minisites_title')}</h3>
                <p className="text-xs text-[var(--text2)] mt-1 max-w-3xl">{T('admin_minisites_sub')}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void loadMyMiniSites(miniSitesPage)}
                  disabled={miniSitesLoading}
                  className="btn-secondary text-sm px-4 gap-2"
                >
                  {miniSitesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {T('admin_accounts_refresh')}
                </button>
                <Link href="/editor?new=1" className="btn-primary text-sm px-4 gap-2 inline-flex items-center">
                  <Plus className="w-4 h-4" />
                  {T('admin_minisites_create')}
                </Link>
              </div>
            </div>

            <p className="text-xs text-[var(--text2)]">
              {T('admin_minisites_page').replace('{page}', String(miniSitesPage)).replace('{total}', String(miniSitesTotal))}
            </p>

            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--bg2)]/30">
              <div>
                <h4 className="font-bold text-sm text-[var(--text)]">{T('admin_minisites_bulk_title')}</h4>
                <p className="text-xs text-[var(--text2)] mt-1">{T('admin_minisites_bulk_hint')}</p>
              </div>
              <textarea
                value={miniSitesBulkText}
                onChange={(e) => setMiniSitesBulkText(e.target.value)}
                className="input w-full resize-y font-mono text-sm min-h-[120px]"
                placeholder={T('admin_minisites_bulk_placeholder')}
                disabled={miniSitesBulkLoading}
              />
              <button
                type="button"
                onClick={() => void createMiniSitesBulk()}
                disabled={miniSitesBulkLoading || !miniSitesBulkText.trim()}
                className="btn-primary text-sm px-4 gap-2 inline-flex items-center"
              >
                {miniSitesBulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {T('admin_minisites_bulk_run')}
              </button>
              {miniSitesBulkLog.length > 0 && (
                <pre className="text-xs font-mono text-[var(--text2)] whitespace-pre-wrap max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] p-3 bg-[var(--bg)]">
                  {miniSitesBulkLog.join('\n')}
                </pre>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={miniSitesLoading || miniSitesPage <= 1}
                onClick={() => setMiniSitesPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-semibold disabled:opacity-40"
              >
                {T('admin_accounts_prev')}
              </button>
              <button
                type="button"
                disabled={miniSitesLoading || miniSitesPage * MINI_SITES_PER_PAGE >= miniSitesTotal}
                onClick={() => setMiniSitesPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-semibold disabled:opacity-40"
              >
                {T('admin_accounts_next')}
              </button>
            </div>

            {miniSitesLoading && miniSitesList.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                {miniSitesList.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-3 py-3 bg-[var(--bg2)]/50 hover:bg-[var(--bg2)]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {row.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-[var(--border)]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center text-lg font-black text-brand flex-shrink-0">
                          {(row.site_name || row.slug || '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--text)] truncate">{row.site_name || '—'}</p>
                        <p className="text-xs font-mono text-brand truncate">{row.slug}.trustbank.xyz</p>
                        <p className="text-[10px] text-[var(--text2)] mt-0.5">
                          {T('admin_minisites_updated')}: {row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          row.published ? 'bg-green-500/15 text-green-400' : 'bg-[var(--border)] text-[var(--text2)]'
                        }`}
                      >
                        {row.published ? T('admin_minisites_live') : T('admin_minisites_draft')}
                      </span>
                      <Link
                        href={`/editor?site=${row.id}`}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-brand text-white hover:opacity-90 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {T('admin_minisites_open')}
                      </Link>
                      <a
                        href={`https://${row.slug}.trustbank.xyz`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-brand/50 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {T('admin_minisites_view')}
                      </a>
                    </div>
                  </div>
                ))}
                {miniSitesList.length === 0 && !miniSitesLoading && (
                  <p className="text-sm text-[var(--text2)] text-center py-10">{T('admin_minisites_none')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'mystic' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text2)]">
              Mesmo painel de{' '}
              <a href="/mistico/config" className="text-brand font-semibold underline">
                /mistico/config
              </a>{' '}
              (preferências locais até existir tabela no Supabase).
            </p>
            <AdminMysticLottery />
          </div>
        )}

        {/* ANALYTICS */}
        {tab === 'analytics' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: T('admin_stat_mini'), value: stats.total_sites || 0, sub: T('admin_stat_total'), color: 'text-brand' },
              { label: T('admin_stat_pub'), value: stats.published_sites || 0, sub: T('admin_stat_live'), color: 'text-green-400' },
              { label: T('admin_stat_slugs'), value: stats.total_slugs || 0, sub: T('admin_stat_reg'), color: 'text-amber-400' },
              { label: T('admin_stat_ads'), value: stats.total_listings || 0, sub: T('admin_stat_active'), color: 'text-blue-400' },
              { label: T('admin_stat_rev'), value: `$${(stats.revenue || 0).toFixed(2)}`, sub: T('admin_stat_rev_sub'), color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="card p-5">
                <p className="text-xs text-[var(--text2)] font-semibold mb-1">{s.label}</p>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-[var(--text2)] mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* SLUGS ADMIN */}
        {tab === 'slugs' && (
          <div className="space-y-6">
            {/* Add bulk */}
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-3">{T('admin_premium_slugs')}</h3>
              <p className="text-xs text-[var(--text2)] mb-3">{T('admin_bulk_format')}</p>
              <textarea value={slugsBulk} onChange={e => setSlugsBulk(e.target.value)}
                className="input w-full resize-none font-mono text-sm" rows={6}
                placeholder={'ceo:5000\ncto:3000\ndev:1000\nart\nnyc:800\nlondon:1200'} />
              <button onClick={addSlugsBulk} disabled={saving || !slugsBulk.trim()} className="btn-primary mt-3 gap-2">
                <Plus className="w-4 h-4" /> {T('admin_add_slugs')}
              </button>
            </div>

            {/* Registered slugs for sale */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="card p-5 mb-6">
                  <h3 className="font-black text-[var(--text)] mb-4">{T('admin_register_free')}</h3>
                  <div className="flex gap-3 mb-3">
                    <input value={adminSlugInput} onChange={e=>setAdminSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
                      placeholder="slug" className="input flex-1 font-mono"/>
                    <button onClick={registerSlugFree} className="btn btn-primary px-6">{T('admin_register_slug_btn')}</button>
                  </div>
                  <input value={adminSlugEmail} onChange={e=>setAdminSlugEmail(e.target.value)}
                    placeholder={T('admin_placeholder_user_email')} className="input text-sm"/>
                </div>

                {/* Bulk registration */}
                <div className="card p-5 mb-4">
                  <h3 className="font-black text-[var(--text)] mb-2">{T('admin_bulk_title')}</h3>
                  <p className="text-xs text-[var(--text2)] mb-3">{T('admin_bulk_line')}</p>
                  <textarea value={bulkSlugs} onChange={e => setBulkSlugs(e.target.value)}
                    className="input text-sm font-mono mb-3" rows={5}
                    placeholder={"italy\nspain\ndubai"}/>
                  <button onClick={registerBulk} disabled={bulkRegistering || !bulkSlugs.trim()}
                    className="btn btn-primary w-full mb-3 justify-center">
                    {bulkRegistering ? T('admin_bulk_registering') : T('admin_bulk_register_btn').replace('{n}', String(bulkSlugs.split(/[\n,]/).filter((s: string) => s.trim()).length))}
                  </button>
                  {bulkResults.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {bulkResults.map((r:string, i:number) => <p key={i} className="text-xs font-mono text-[var(--text)]">{r}</p>)}
                    </div>
                  )}
                </div>

                {/* All registered slugs */}
                <div className="card p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-[var(--text)]">{T('admin_slugs_all')}</h3>
                    <button onClick={() => loadAllSlugs(slugSearch)} className="text-brand text-xs font-bold">{T('admin_load')}</button>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input value={slugSearch} onChange={e => setSlugSearch(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && loadAllSlugs(slugSearch)}
                      placeholder={T('admin_search_slug')} className="input flex-1 text-sm py-2"/>
                    <button onClick={() => loadAllSlugs(slugSearch)} className="btn btn-primary px-4 text-sm">{T('admin_search_btn')}</button>
                  </div>
                  {allSlugsLoading && <p className="text-xs text-[var(--text2)]">{T('admin_loading')}</p>}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allSlugs.map((s:any) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 bg-[var(--bg2)] rounded-xl">
                        <span className="font-mono text-sm font-bold text-brand flex-1">{s.slug}.trustbank.xyz</span>
                        <span className="text-xs text-[var(--text2)]">{s.for_sale ? `💰 $${s.sale_price}` : s.status}</span>
                        <button onClick={async () => {
                          await (supabase as any).from('slug_registrations').update({ for_sale: !s.for_sale, sale_price: s.for_sale ? null : 100, status: s.for_sale ? 'active' : 'for_sale' }).eq('id', s.id);
                          loadAllSlugs(slugSearch);
                        }} className="text-xs font-bold px-2 py-1 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)]">
                          {s.for_sale ? T('admin_remove_sale') : T('admin_put_sale')}
                        </button>
                        <button onClick={async () => {
                          const price = prompt(T('admin_price_prompt').replace('{slug}', s.slug), String(s.sale_price || '100'));
                          if (!price) return;
                          await (supabase as any).from('slug_registrations').update({ sale_price: parseFloat(price), for_sale: true, status: 'for_sale' }).eq('id', s.id);
                          loadAllSlugs(slugSearch);
                          toast.success(T('toast_price_updated'));
                        }} className="text-xs font-bold px-2 py-1 rounded-lg border border-brand/30 text-brand hover:bg-brand/10">
                          {T('admin_price_btn')}
                        </button>
                        <button onClick={async () => {
                          if (!confirm(T('confirm_delete_slug_short').replace('{slug}', s.slug))) return;
                          await (supabase as any).from('slug_registrations').delete().eq('id', s.id);
                          loadAllSlugs(slugSearch);
                          toast.success(T('toast_deleted'));
                        }} className="text-red-400 hover:opacity-70 text-xs">✕</button>
                      </div>
                    ))}
                    {allSlugs.length === 0 && !allSlugsLoading && <p className="text-xs text-[var(--text2)]">{T('admin_click_load_slugs')}</p>}
                  </div>
                </div>

                <h3 className="font-black text-[var(--text)]">{T('admin_slugs_for_sale').replace('{n}', String(adminSlugs.length))}</h3>
                <button onClick={loadAdminSlugs} className="text-[var(--text2)] hover:text-brand">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {slugsLoading ? <Loader2 className="w-5 h-5 animate-spin text-brand mx-auto" /> : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {adminSlugs.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-[var(--bg2)] rounded-xl">
                      <span className="font-black text-[var(--text)] flex-1 font-mono text-sm">{s.slug}.trustbank.xyz</span>
                      <input type="number" defaultValue={s.price} min="1"
                        className="input w-24 py-1 text-sm text-right"
                        onBlur={e => updateSlugPrice(s.id, parseFloat(e.target.value))} />
                      <span className="text-xs text-[var(--text2)]">USD</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.active ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {s.sold_to ? T('admin_sold') : s.active ? T('admin_status_active') : T('admin_status_inactive')}
                      </span>
                      <button onClick={async () => {
                          await (supabase as any).from('premium_slugs').update({ active: !s.active }).eq('id', s.id);
                          loadAdminSlugs();
                        }} className={`text-xs font-bold px-2 py-1 rounded-lg border ${s.active ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'} transition`}>
                        {s.active ? T('admin_toggle_pause') : T('admin_toggle_activate')}
                      </button>
                      <button onClick={() => deleteSlug(s.id)} className="text-red-400 hover:opacity-70 ml-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRICING */}
        {tab === 'pricing' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-4">{T('admin_pricing_pro')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label block mb-1">{T('admin_pricing_plan')}</label>
                  <input value={pricing.plan_price} onChange={e => setPricing(p => ({...p, plan_price: e.target.value}))}
                    className="input" type="number" step="0.01" />
                </div>
                <div>
                  <label className="label block mb-1">{T('admin_pricing_slug_free')}</label>
                  <input value={pricing.slug_free_per_plan} onChange={e => setPricing(p => ({...p, slug_free_per_plan: e.target.value}))}
                    className="input" type="number" />
                </div>
                <div>
                  <label className="label block mb-1">{T('admin_pricing_free_listings')}</label>
                  <input value={pricing.listings_free_per_plan} onChange={e => setPricing(p => ({...p, listings_free_per_plan: e.target.value}))}
                    className="input" type="number" />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-4">{T('admin_pricing_splits')}</h3>
              <p className="text-xs text-[var(--text2)] mb-4">{T('admin_pricing_splits_hint')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  { key: 'video_split_creator', label: T('admin_pricing_split_vid'), hint: T('admin_pricing_split_vid_d') },
                  { key: 'cv_split_creator', label: T('admin_pricing_split_cv'), hint: T('admin_pricing_split_cv_d') },
                  { key: 'slug_split_creator', label: T('admin_pricing_split_slug'), hint: T('admin_pricing_split_slug_d') },
                ] as const).map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className="label block mb-1">{label}</label>
                    <div className="flex items-center gap-2">
                      <input value={(pricing as any)[key]}
                        onChange={e => setPricing(p => ({...p, [key]: e.target.value}))}
                        className="input flex-1" type="number" min="0" max="100" />
                      <span className="text-sm font-bold text-[var(--text2)]">%</span>
                    </div>
                    <p className="text-xs text-[var(--text2)] mt-1">{hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-4">{T('admin_pricing_slug_prices')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1">{T('admin_pricing_min_slug')}</label>
                  <input value={pricing.slug_min_price} onChange={e => setPricing(p => ({...p, slug_min_price: e.target.value}))}
                    className="input" type="number" />
                </div>
                <div>
                  <label className="label block mb-1">{T('admin_pricing_min_prem')}</label>
                  <input value={pricing.slug_premium_min} onChange={e => setPricing(p => ({...p, slug_premium_min: e.target.value}))}
                    className="input" type="number" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FEATURES */}
        {tab === 'features' && (
          <div className="card p-5 space-y-3">
            <h3 className="font-black text-[var(--text)] mb-2">{T('admin_feat_flags')}</h3>
            <Toggle label={T('admin_feat_feed')} desc={T('admin_feat_feed_d')} value={features.feed_enabled} onChange={(v: boolean) => setFeatures(f => ({ ...f, feed_enabled: v }))} />
            <Toggle label={T('admin_feat_boost')} desc={T('admin_feat_boost_d')} value={features.boost_enabled} onChange={(v: boolean) => setFeatures(f => ({ ...f, boost_enabled: v }))} />
            <Toggle label={T('admin_feat_video')} desc={T('admin_feat_video_d')} value={features.video_paywall_enabled} onChange={(v: boolean) => setFeatures(f => ({ ...f, video_paywall_enabled: v }))} />
            <Toggle label={T('admin_feat_cv')} desc={T('admin_feat_cv_d')} value={features.cv_directory_enabled} onChange={(v: boolean) => setFeatures(f => ({ ...f, cv_directory_enabled: v }))} />
            <Toggle label={T('admin_feat_slug')} desc={T('admin_feat_slug_d')} value={features.slug_marketplace_enabled} onChange={(v: boolean) => setFeatures(f => ({ ...f, slug_marketplace_enabled: v }))} />
            <Toggle label={T('admin_feat_classified')} desc={T('admin_feat_classified_d')} value={features.classified_enabled} onChange={(v: boolean) => setFeatures(f => ({ ...f, classified_enabled: v }))} />
            <Toggle label={T('admin_feat_reg')} desc={T('admin_feat_reg_d')} value={features.registration_open} onChange={(v: boolean) => setFeatures(f => ({ ...f, registration_open: v }))} />
          </div>
        )}

        {/* BROADCAST */}
        {tab === 'broadcast' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-3">{T('admin_broadcast_title')}</h3>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                className="input w-full resize-none" rows={4} maxLength={500}
                placeholder={T('admin_broadcast_ph')}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[var(--text2)]">{broadcastMsg.length}/500</span>
                <button onClick={sendBroadcast} disabled={saving || !broadcastMsg.trim()} className="btn-primary gap-2">
                  <Send className="w-4 h-4" /> {T('admin_broadcast_send')}
                </button>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-3">{T('admin_broadcast_hist')}</h3>
              {broadcasts.length === 0 ? <p className="text-sm text-[var(--text2)]">{T('admin_broadcast_none')}</p> : (
                <div className="space-y-2">
                  {broadcasts.map(b => (
                    <div key={b.id} className="p-3 bg-[var(--bg2)] rounded-xl">
                      <p className="text-sm text-[var(--text)]">{b.message}</p>
                      <p className="text-xs text-[var(--text2)] mt-1">{new Date(b.created_at).toLocaleString()} · {T('admin_broadcast_recipients').replace('{n}', String(b.sent_to))}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WALLET */}
        {tab === 'wallet' && (
          <div className="card p-5 space-y-4">
            <h3 className="font-black text-[var(--text)]">{T('admin_wallet_settings')}</h3>
            <div>
              <label className="label block mb-1">{T('admin_wallet_label')}</label>
              <input value={platformWallet} onChange={e => setPlatformWallet(e.target.value)}
                className="input font-mono text-sm" placeholder="0x..." />
            </div>
            <div>
              <label className="label block mb-1">{T('admin_url_site')}</label>
              <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
                className="input" placeholder="https://trustbank.xyz" />
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="font-black text-[var(--text)] mb-2">{T('admin_wallet_section')}</h4>
              <p className="text-xs text-[var(--text2)] mb-3">
                {T('admin_wallet_body')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={userWalletEmail} onChange={e => setUserWalletEmail(e.target.value)}
                  className="input" placeholder="email@usuario.com" />
                <input value={userWalletAddress} onChange={e => setUserWalletAddress(e.target.value)}
                  className="input font-mono text-sm" placeholder="0x..." />
              </div>
              <button onClick={setWalletForUser} className="btn-primary mt-3">
                {T('admin_apply_wallet')}
              </button>
            </div>
            <div className="border-t border-red-500/30 pt-4">
              <h4 className="font-black text-red-400 mb-2">{T('admin_delete_zone_title')}</h4>
              <p className="text-xs text-[var(--text2)] mb-3">
                {T('admin_delete_zone_body')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={deleteSiteSlug}
                  onChange={e => setDeleteSiteSlug(e.target.value)}
                  className="input"
                  placeholder={T('admin_ph_slug_del')}
                />
                <input
                  value={deleteSiteEmail}
                  onChange={e => setDeleteSiteEmail(e.target.value)}
                  className="input"
                  placeholder={T('admin_ph_contact')}
                />
              </div>
              <button
                onClick={deleteMiniSite}
                disabled={deletingSite || (!deleteSiteSlug.trim() && !deleteSiteEmail.trim())}
                className="mt-3 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                {deletingSite ? T('admin_delete_deleting') : T('admin_delete_mini')}
              </button>
            </div>
          </div>
        )}

        {/* APIS */}
        {tab === 'apis' && (
          <div className="space-y-5">
            <div className="card p-5 space-y-3">
              <h3 className="font-black text-[var(--text)] mb-2">{T('admin_integrations')}</h3>
              {[
                { key: 'supabase', label: T('admin_integ_supabase'), ok: apiStatus.supabase },
                { key: 'stripe', label: T('admin_integ_stripe'), ok: apiStatus.stripe },
                { key: 'r2', label: T('admin_integ_r2'), ok: apiStatus.r2 },
              ].map(a => (
                <div key={a.key} className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)]">
                  {a.ok
                    ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <span className="flex-1 text-sm font-semibold text-[var(--text)]">{a.label}</span>
                  <span className={`text-xs font-bold ${a.ok ? 'text-green-400' : 'text-red-400'}`}>{a.ok ? 'OK' : T('admin_not_configured')}</span>
                </div>
              ))}
              <p className="text-xs text-[var(--text2)] mt-2">{T('admin_integrations_note')}</p>
            </div>

            <div className="card p-5 space-y-4">
              <h3 className="font-black text-[var(--text)]">{T('admin_ai_title')}</h3>
              <p className="text-xs text-[var(--text2)] leading-relaxed">
                {T('admin_ai_body')}
              </p>
              <p className="text-xs text-[var(--text2)] leading-relaxed border-l-2 border-violet-500/40 pl-3">
                {T('admin_ai_lively_hint')}
              </p>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={aiConfig.enabled}
                  onChange={e => setAiConfig(c => ({ ...c, enabled: e.target.checked }))}
                />
                {T('admin_ai_checkbox')}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text2)]">{T('admin_ai_url')}</label>
                  <input
                    value={aiConfig.baseUrl}
                    onChange={e => setAiConfig(c => ({ ...c, baseUrl: e.target.value }))}
                    className="input w-full mt-1 font-mono text-xs"
                    placeholder="https://api.deepseek.com/v1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text2)]">{T('admin_ai_model')}</label>
                  <input
                    value={aiConfig.model}
                    onChange={e => setAiConfig(c => ({ ...c, model: e.target.value }))}
                    className="input w-full mt-1 font-mono text-xs"
                    placeholder="deepseek-chat"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text2)]">{T('admin_ai_api_key')}</label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={e => setAiConfig(c => ({ ...c, apiKey: e.target.value }))}
                  className="input w-full mt-1 font-mono text-xs"
                  placeholder={T('admin_ai_api_ph')}
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-amber-400/90">
                {T('admin_ai_key_warn')}
              </p>
            </div>
          </div>
        )}


        {/* CODE */}
        {tab === 'code' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">{T('admin_code_head_title')}</h3>
              <p className="text-xs text-[var(--text2)] mb-3">{T('admin_head_hint')}</p>
              <textarea value={headCode} onChange={e => setHeadCode(e.target.value)}
                className="input w-full font-mono text-xs resize-none" rows={8}
                placeholder={T('admin_head_code_ph')} />
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">{T('admin_code_body_title')}</h3>
              <p className="text-xs text-[var(--text2)] mb-3">{T('admin_head_body')}</p>
              <textarea value={bodyCode} onChange={e => setBodyCode(e.target.value)}
                className="input w-full font-mono text-xs resize-none" rows={8}
                placeholder={T('admin_body_code_ph')} />
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">{T('admin_legal_title')}</h3>
              <p className="text-xs text-[var(--text2)] mb-3">{T('admin_legal_body')}</p>
              <label className="label block mb-1">{T('admin_terms_content_label')}</label>
              <textarea value={termsContent} onChange={e => setTermsContent(e.target.value)}
                className="input w-full font-mono text-xs resize-none mb-3" rows={8}
                placeholder={T('admin_terms_content_ph')} />
              <label className="label block mb-1">{T('admin_privacy_content_label')}</label>
              <textarea value={privacyContent} onChange={e => setPrivacyContent(e.target.value)}
                className="input w-full font-mono text-xs resize-none" rows={8}
                placeholder={T('admin_privacy_content_ph')} />
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">{T('admin_trial_settings')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="label block mb-1">{T('admin_trial_hours')}</label><input value={trialHours} onChange={e => setTrialHours(e.target.value)} className="input" type="number" min="1" /></div>
                <div><label className="label block mb-1">{T('admin_trial_grace')}</label><input value={graceDays} onChange={e => setGraceDays(e.target.value)} className="input" type="number" min="30" /></div>
                <div><label className="label block mb-1">{T('admin_trial_warn')}</label><input value={warningHours} onChange={e => setWarningHours(e.target.value)} className="input" type="number" min="1" /></div>
                <div><label className="label block mb-1">{T('admin_trial_ribbon')}</label><input value={testRibbonText} onChange={e => setTestRibbonText(e.target.value)} className="input" /></div>
              </div>
            </div>
            <p className="text-xs text-[var(--text2)]">{T('admin_code_apply')}</p>
          </div>
        )}
        {/* PLANS */}
        {tab === 'plans' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[var(--text)] text-lg">{T('admin_plans_title')}</h3>
              <div className="flex gap-2">
                {!plansLoaded && <button onClick={loadPlans} className="btn-primary text-sm px-4">{T('admin_load')}</button>}
                <button onClick={() => setEditingPlan({ name:'', price_monthly:'29.99', price_yearly:'288', color:'#818cf8', emoji:'⚡', features:'', active:true, sort_order:plans.length })}
                  className="btn-primary text-sm px-4 gap-2"><Plus className="w-4 h-4" /> {T('admin_new_plan')}</button>
              </div>
            </div>

            {editingPlan && (
              <div className="card p-5 border-brand/40">
                <h4 className="font-black text-[var(--text)] mb-4">{editingPlan.id ? T('admin_plan_edit') : T('admin_plan_new')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div><label className="label block mb-1">{T('admin_plan_name')}</label>
                    <input value={editingPlan.name} onChange={e=>setEditingPlan((p:any)=>({...p,name:e.target.value}))} className="input" placeholder={T('admin_plan_name_ph')}/></div>
                  <div><label className="label block mb-1">{T('admin_plan_per_mo')}</label>
                    <input value={editingPlan.price_monthly} onChange={e=>setEditingPlan((p:any)=>({...p,price_monthly:e.target.value}))} className="input" type="number" step="0.01"/></div>
                  <div><label className="label block mb-1">{T('admin_plan_per_yr')}</label>
                    <input value={editingPlan.price_yearly} onChange={e=>setEditingPlan((p:any)=>({...p,price_yearly:e.target.value}))} className="input" type="number" step="0.01"/></div>
                  <div><label className="label block mb-1">{T('admin_plan_order')}</label>
                    <input value={editingPlan.sort_order||0} onChange={e=>setEditingPlan((p:any)=>({...p,sort_order:e.target.value}))} className="input" type="number"/></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="label block mb-1">{T('admin_plan_color')}</label>
                    <div className="flex gap-2">
                      <input value={editingPlan.color||''} onChange={e=>setEditingPlan((p:any)=>({...p,color:e.target.value}))} className="input flex-1" placeholder="#818cf8"/>
                      <input type="color" value={editingPlan.color||'#818cf8'} onChange={e=>setEditingPlan((p:any)=>({...p,color:e.target.value}))} className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer p-1"/>
                    </div></div>
                  <div><label className="label block mb-1">{T('admin_plan_emoji')}</label>
                    <input value={editingPlan.emoji||''} onChange={e=>setEditingPlan((p:any)=>({...p,emoji:e.target.value}))} className="input" placeholder="⚡"/></div>
                </div>
                <div className="mb-3">
                  <label className="label block mb-1">{T('admin_plan_features')}</label>
                  <textarea value={Array.isArray(editingPlan.features)?editingPlan.features.join('\n'):(editingPlan.features||'')}
                    onChange={e=>setEditingPlan((p:any)=>({...p,features:e.target.value}))}
                    className="input resize-none" rows={5} placeholder={T('admin_plan_features_ph')}/>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={()=>savePlan(editingPlan)} disabled={saving||!editingPlan.name} className="btn-primary gap-2">
                    {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckCircle className="w-4 h-4"/>} {T('admin_save')}
                  </button>
                  <button onClick={()=>setEditingPlan(null)} className="btn gap-2 text-[var(--text2)]">
                    <X className="w-4 h-4"/> {T('admin_cancel')}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="card p-5" style={{ borderColor: plan.color+'40' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-2xl mr-2">{plan.emoji}</span>
                      <span className="font-black text-lg" style={{ color: plan.color }}>{plan.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {plan.active ? T('admin_status_active') : T('admin_status_off')}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[var(--text)] mb-1">
                    ${plan.price_monthly}<span className="text-sm text-[var(--text2)] font-normal">{T('admin_plan_per_mo')}</span>
                  </p>
                  {plan.price_yearly > 0 && <p className="text-sm text-green-400 mb-3">{T('admin_plan_yearly_price').replace('${price}', String(plan.price_yearly))}</p>}
                  <ul className="space-y-1 mb-4">
                    {(Array.isArray(plan.features)?plan.features:[]).slice(0,4).map((f:string,i:number)=>(
                      <li key={i} className="text-xs text-[var(--text2)] flex items-center gap-2">
                        <span className="text-green-400">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button onClick={()=>setEditingPlan({...plan,features:Array.isArray(plan.features)?plan.features.join('\n'):plan.features})}
                      className="btn text-xs px-3 py-1.5 gap-1"><CheckCircle className="w-3 h-3"/> {T('admin_edit')}</button>
                    <button onClick={async()=>{ await (supabase as any).from('platform_plans').update({active:!plan.active}).eq('id',plan.id); loadPlans(); }}
                      className="btn text-xs px-3 py-1.5">{plan.active ? T('admin_deactivate') : T('admin_activate')}</button>
                    <button onClick={async()=>{ if(!confirm(T('confirm_delete_plan')))return; await (supabase as any).from('platform_plans').delete().eq('id',plan.id); loadPlans(); toast.success(T('toast_deleted')); }}
                      className="btn text-xs px-3 py-1.5 text-red-400">{T('admin_delete')}</button>
                  </div>
                </div>
              ))}
              {plans.length===0&&plansLoaded&&<p className="text-[var(--text2)] text-sm col-span-2">{T('admin_no_plans')}</p>}
              {!plansLoaded&&<p className="text-[var(--text2)] text-sm col-span-2">{T('admin_plans_load_hint')}</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
