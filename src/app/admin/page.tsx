'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Key, Wallet, BarChart3, Settings, Save, Users, Globe,
  ToggleLeft, ToggleRight, DollarSign, Loader2, Plus, Trash2,
  Send, Bell, Shield, Tag, Gavel, ArrowRightLeft, RefreshCw,
  CheckCircle, XCircle, Eye, Copy, X
} from 'lucide-react';
import { toast } from 'sonner';

const OWNER_EMAIL = 'arytcf@gmail.com';

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
  const router = useRouter();
  const [tab, setTab] = useState<'analytics'|'slugs'|'broadcast'|'features'|'pricing'|'wallet'|'apis'|'code'|'plans'>('analytics');
  const [saving, setSaving] = useState(false);

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
      if (existing) { results.push(`⚠️ ${slug} — já existe`); continue; }
      const { error } = await (supabase as any).from('slug_registrations').insert({
        user_id: user?.id, slug, status: 'active',
        expires_at: new Date(Date.now() + 365*86400000).toISOString(), for_sale: false,
      });
      if (error) results.push(`❌ ${slug} — erro`);
      else results.push(`✅ ${slug}.trustbank.xyz`);
    }
    setBulkResults(results);
    setBulkRegistering(false);
    toast.success(`${results.filter(r => r.startsWith('✅')).length} slugs registrados!`);
  };

  const registerSlugFree = async () => {
    const clean = adminSlugInput.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) return;
    const { data: existing } = await (supabase as any).from('slug_registrations').select('id').eq('slug', clean).maybeSingle();
    if (existing) { toast.error(`${clean} já registrado`); return; }
    let userId = user?.id;
    if (adminSlugEmail) {
      const { data: target } = await (supabase as any).from('mini_sites').select('user_id').eq('contact_email', adminSlugEmail).maybeSingle();
      if (target) userId = (target as any).user_id;
    }
    await (supabase as any).from('slug_registrations').insert({ user_id: userId, slug: clean, status: 'active', expires_at: new Date(Date.now() + 365*86400000).toISOString(), for_sale: false });
    toast.success(`✅ ${clean}.trustbank.xyz registrado!`);
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
    jackpot_enabled: true, feed_enabled: true, boost_enabled: true,
    cv_directory_enabled: true, slug_marketplace_enabled: true,
    registration_open: true, classified_enabled: true,
    video_paywall_enabled: true,
  });

  // Pricing
  const [pricing, setPricing] = useState({
    plan_price: '29.90',
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
  const [graceDays, setGraceDays] = useState('7');
  const [warningHours, setWarningHours] = useState('1');
  const [testRibbonText, setTestRibbonText] = useState('TEST MODE');

  // API keys status
  const [apiStatus, setApiStatus] = useState({ helio: false, supabase: true, r2: false });

  /** DeepSeek / OpenAI-compatible: sugestão de preços (opcional). Chave também pode ir só em DEEPSEEK_API_KEY na Vercel. */
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: '',
  });

  useEffect(() => {
    if (!loading && user && user.email !== OWNER_EMAIL) {
      router.push('/');
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user || user.email !== OWNER_EMAIL) return;

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
        if (s.key === 'grace_days') setGraceDays(String(s.value || '7'));
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

    // Check API keys
    setApiStatus({
      helio: !!process.env.NEXT_PUBLIC_HELIO_API_KEY,
      supabase: true,
      r2: !!process.env.R2_WORKER_URL,
    });
  }, [user]);

  const loadAllSlugs = async (search = '') => {
    setAllSlugsLoading(true);
    let q = (supabase as any).from('slug_registrations').select('*, mini_sites(site_name, user_id)').order('created_at', { ascending: false }).limit(100);
    if (search) q = q.ilike('slug', `%${search}%`);
    const { data } = await q;
    setAllSlugs(data || []);
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
      toast.success('✅ Salvo!');
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
    toast.success(`✅ ${ok} slugs adicionados · ${skip} ignorados`);
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
    toast.success('Preço atualizado');
    loadAdminSlugs();
  };

  const setWalletForUser = async () => {
    if (!userWalletEmail || !userWalletAddress) {
      toast.error('Informe email e wallet');
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
    toast.success(`✅ Wallet atualizada para ${cleanEmail}`);
  };

  const deleteMiniSite = async () => {
    const slug = deleteSiteSlug.trim().toLowerCase();
    const email = deleteSiteEmail.trim().toLowerCase();
    if (!slug && !email) {
      toast.error('Informe slug ou email');
      return;
    }
    setDeletingSite(true);
    try {
      const label = slug || email;
      const ok = window.confirm(`Tem certeza que deseja apagar o mini-site "${label}"?`);
      if (!ok) return;

      const res = await fetch('/api/admin/delete-mini-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slug ? { slug } : { email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Falha ao deletar');

      toast.success(`✅ Mini-site ${(payload as { slug?: string }).slug || label} removido.`);
      setDeleteSiteSlug('');
      setDeleteSiteEmail('');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao deletar mini-site');
    } finally {
      setDeletingSite(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setSaving(true);
    const { count } = await supabase.from('mini_sites').select('*', { count: 'exact', head: true });
    await (supabase as any).from('broadcasts').insert({ message: broadcastMsg, sent_to: count || 0, sent_by: user!.id });
    toast.success(`📣 Broadcast enviado para ${count} sites`);
    setBroadcastMsg('');
    const { data } = await (supabase as any).from('broadcasts').select('*').order('created_at', { ascending: false }).limit(10);
    setBroadcasts(data || []);
    setSaving(false);
  };

  if (loading || !user) return <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  if (user.email !== OWNER_EMAIL) return null;

  const TABS = [
    { id:'analytics', label:'Analytics',  icon:BarChart3 },
    { id:'slugs',     label:'Slugs',      icon:Key },
    { id:'pricing',   label:'Preços',     icon:DollarSign },
    { id:'features',  label:'Features',   icon:ToggleRight },
    { id:'broadcast', label:'Broadcast',  icon:Bell },
    { id:'wallet',    label:'Wallet',     icon:Wallet },
    { id:'apis',      label:'APIs',       icon:Shield },
    { id:'code',      label:'HTML/SEO',    icon:Globe },
  ];

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
              <h1 className="font-black text-xl text-[var(--text)]">Admin Panel</h1>
              <p className="text-xs text-[var(--text2)]">TrustBank · {user.email}</p>
            </div>
          </div>
          <button onClick={saveAll} disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Tudo
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

        {/* ANALYTICS */}
        {tab === 'analytics' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label:'Mini Sites', value: stats.total_sites || 0, sub:'total', color:'text-brand' },
              { label:'Publicados', value: stats.published_sites || 0, sub:'ao vivo', color:'text-green-400' },
              { label:'Slugs', value: stats.total_slugs || 0, sub:'registrados', color:'text-amber-400' },
              { label:'Anúncios', value: stats.total_listings || 0, sub:'ativos', color:'text-blue-400' },
              { label:'Receita', value: `$${(stats.revenue||0).toFixed(2)}`, sub:'USDC total', color:'text-purple-400' },
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
              <h3 className="font-black text-[var(--text)] mb-3">Adicionar Slugs Premium</h3>
              <p className="text-xs text-[var(--text2)] mb-3">Um por linha. Formato: <code className="text-brand">slug:preco</code> ou só <code className="text-brand">slug</code> (preço padrão $100)</p>
              <textarea value={slugsBulk} onChange={e => setSlugsBulk(e.target.value)}
                className="input w-full resize-none font-mono text-sm" rows={6}
                placeholder={'ceo:5000\ncto:3000\ndev:1000\nart\nnyc:800\nlondon:1200'} />
              <button onClick={addSlugsBulk} disabled={saving || !slugsBulk.trim()} className="btn-primary mt-3 gap-2">
                <Plus className="w-4 h-4" /> Adicionar Slugs
              </button>
            </div>

            {/* Registered slugs for sale */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="card p-5 mb-6">
                  <h3 className="font-black text-[var(--text)] mb-4">🔑 Registrar Slug Grátis</h3>
                  <div className="flex gap-3 mb-3">
                    <input value={adminSlugInput} onChange={e=>setAdminSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
                      placeholder="slug" className="input flex-1 font-mono"/>
                    <button onClick={registerSlugFree} className="btn btn-primary px-6">Registrar</button>
                  </div>
                  <input value={adminSlugEmail} onChange={e=>setAdminSlugEmail(e.target.value)}
                    placeholder="Email do usuário (opcional — padrão: você mesmo)" className="input text-sm"/>
                </div>

                {/* Bulk registration */}
                <div className="card p-5 mb-4">
                  <h3 className="font-black text-[var(--text)] mb-2">📋 Registro em Massa</h3>
                  <p className="text-xs text-[var(--text2)] mb-3">Um slug por linha ou separado por vírgula</p>
                  <textarea value={bulkSlugs} onChange={e => setBulkSlugs(e.target.value)}
                    className="input text-sm font-mono mb-3" rows={5}
                    placeholder={"italy\nspain\ndubai"}/>
                  <button onClick={registerBulk} disabled={bulkRegistering || !bulkSlugs.trim()}
                    className="btn btn-primary w-full mb-3 justify-center">
                    {bulkRegistering ? '⏳ Registrando...' : `📋 Registrar ${bulkSlugs.split(/[\n,]/).filter((s:string)=>s.trim()).length} slugs`}
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
                    <h3 className="font-black text-[var(--text)]">🔍 Todos os Slugs Registrados</h3>
                    <button onClick={() => loadAllSlugs(slugSearch)} className="text-brand text-xs font-bold">Carregar</button>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input value={slugSearch} onChange={e => setSlugSearch(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && loadAllSlugs(slugSearch)}
                      placeholder="Pesquisar slug..." className="input flex-1 text-sm py-2"/>
                    <button onClick={() => loadAllSlugs(slugSearch)} className="btn btn-primary px-4 text-sm">Buscar</button>
                  </div>
                  {allSlugsLoading && <p className="text-xs text-[var(--text2)]">Carregando...</p>}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allSlugs.map((s:any) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 bg-[var(--bg2)] rounded-xl">
                        <span className="font-mono text-sm font-bold text-brand flex-1">{s.slug}.trustbank.xyz</span>
                        <span className="text-xs text-[var(--text2)]">{s.for_sale ? `💰 $${s.sale_price}` : s.status}</span>
                        <button onClick={async () => {
                          await (supabase as any).from('slug_registrations').update({ for_sale: !s.for_sale, sale_price: s.for_sale ? null : 100, status: s.for_sale ? 'active' : 'for_sale' }).eq('id', s.id);
                          loadAllSlugs(slugSearch);
                        }} className="text-xs font-bold px-2 py-1 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)]">
                          {s.for_sale ? 'Tirar venda' : 'Vender'}
                        </button>
                        <button onClick={async () => {
                          const price = prompt(`Novo preço para ${s.slug}:`, s.sale_price || '100');
                          if (!price) return;
                          await (supabase as any).from('slug_registrations').update({ sale_price: parseFloat(price), for_sale: true, status: 'for_sale' }).eq('id', s.id);
                          loadAllSlugs(slugSearch);
                          toast.success('Preço atualizado!');
                        }} className="text-xs font-bold px-2 py-1 rounded-lg border border-brand/30 text-brand hover:bg-brand/10">
                          Preço
                        </button>
                        <button onClick={async () => {
                          if (!confirm(`Deletar ${s.slug}?`)) return;
                          await (supabase as any).from('slug_registrations').delete().eq('id', s.id);
                          loadAllSlugs(slugSearch);
                          toast.success('Deletado!');
                        }} className="text-red-400 hover:opacity-70 text-xs">✕</button>
                      </div>
                    ))}
                    {allSlugs.length === 0 && !allSlugsLoading && <p className="text-xs text-[var(--text2)]">Clique em Carregar para ver os slugs</p>}
                  </div>
                </div>

                <h3 className="font-black text-[var(--text)]">Slugs à Venda ({adminSlugs.length})</h3>
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
                      <span className="text-xs text-[var(--text2)]">USDC</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.active ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {s.sold_to ? 'Vendido' : s.active ? 'Ativo' : 'Inativo'}
                      </span>
                      <button onClick={async () => {
                          await (supabase as any).from('premium_slugs').update({ active: !s.active }).eq('id', s.id);
                          loadAdminSlugs();
                        }} className={`text-xs font-bold px-2 py-1 rounded-lg border ${s.active ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'} transition`}>
                        {s.active ? '⏸ Tirar' : '▶ Ativar'}
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
              <h3 className="font-black text-[var(--text)] mb-4">Plano Pro</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label block mb-1">Preço do plano ($/mês)</label>
                  <input value={pricing.plan_price} onChange={e => setPricing(p => ({...p, plan_price: e.target.value}))}
                    className="input" type="number" step="0.01" />
                </div>
                <div>
                  <label className="label block mb-1">Slugs grátis por plano</label>
                  <input value={pricing.slug_free_per_plan} onChange={e => setPricing(p => ({...p, slug_free_per_plan: e.target.value}))}
                    className="input" type="number" />
                </div>
                <div>
                  <label className="label block mb-1">Anúncios grátis por tipo</label>
                  <input value={pricing.listings_free_per_plan} onChange={e => setPricing(p => ({...p, listings_free_per_plan: e.target.value}))}
                    className="input" type="number" />
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-4">Splits de Receita (%)</h3>
              <p className="text-xs text-[var(--text2)] mb-4">% que vai para o criador. O restante fica na plataforma.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key:'video_split_creator', label:'🎬 Vídeo Paywall', hint:'Padrão: 70% criador' },
                  { key:'cv_split_creator',    label:'📄 CV Unlock',     hint:'Padrão: 50% criador' },
                  { key:'slug_split_creator',  label:'🔑 Venda de Slug', hint:'Padrão: 85% criador' },
                ].map(({ key, label, hint }) => (
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
              <h3 className="font-black text-[var(--text)] mb-4">Slugs — Preços</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1">Preço mínimo slug ($)</label>
                  <input value={pricing.slug_min_price} onChange={e => setPricing(p => ({...p, slug_min_price: e.target.value}))}
                    className="input" type="number" />
                </div>
                <div>
                  <label className="label block mb-1">Mínimo slug premium ($)</label>
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
            <h3 className="font-black text-[var(--text)] mb-2">Feature Flags</h3>
            <Toggle label="🎰 Jackpot" desc="Pool de prêmios" value={features.jackpot_enabled} onChange={(v: boolean) => setFeatures(f => ({...f, jackpot_enabled:v}))} />
            <Toggle label="📝 Feed de Posts" desc="Posts no mini site" value={features.feed_enabled} onChange={(v: boolean) => setFeatures(f => ({...f, feed_enabled:v}))} />
            <Toggle label="⚡ Boost" desc="Destacar mini sites" value={features.boost_enabled} onChange={(v: boolean) => setFeatures(f => ({...f, boost_enabled:v}))} />
            <Toggle label="🎬 Video Paywall" desc="Vídeos pagos" value={features.video_paywall_enabled} onChange={(v: boolean) => setFeatures(f => ({...f, video_paywall_enabled:v}))} />
            <Toggle label="📄 CV Directory" desc="Diretório de CVs" value={features.cv_directory_enabled} onChange={(v: boolean) => setFeatures(f => ({...f, cv_directory_enabled:v}))} />
            <Toggle label="🔑 Slug Marketplace" desc="Compra/venda de slugs" value={features.slug_marketplace_enabled} onChange={(v: boolean) => setFeatures(f => ({...f, slug_marketplace_enabled:v}))} />
            <Toggle label="🏠 Classificados" desc="Imóveis e carros" value={features.classified_enabled} onChange={(v: boolean) => setFeatures(f => ({...f, classified_enabled:v}))} />
            <Toggle label="🚪 Registro Aberto" desc="Novos usuários podem se registrar" value={features.registration_open} onChange={(v: boolean) => setFeatures(f => ({...f, registration_open:v}))} />
          </div>
        )}

        {/* BROADCAST */}
        {tab === 'broadcast' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-3">Enviar Mensagem</h3>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                className="input w-full resize-none" rows={4} maxLength={500}
                placeholder="Mensagem para todos os usuários..." />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[var(--text2)]">{broadcastMsg.length}/500</span>
                <button onClick={sendBroadcast} disabled={saving || !broadcastMsg.trim()} className="btn-primary gap-2">
                  <Send className="w-4 h-4" /> Enviar
                </button>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-3">Histórico</h3>
              {broadcasts.length === 0 ? <p className="text-sm text-[var(--text2)]">Nenhum broadcast ainda</p> : (
                <div className="space-y-2">
                  {broadcasts.map(b => (
                    <div key={b.id} className="p-3 bg-[var(--bg2)] rounded-xl">
                      <p className="text-sm text-[var(--text)]">{b.message}</p>
                      <p className="text-xs text-[var(--text2)] mt-1">{new Date(b.created_at).toLocaleString('pt-BR')} · {b.sent_to} destinatários</p>
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
            <h3 className="font-black text-[var(--text)]">Configurações da Plataforma</h3>
            <div>
              <label className="label block mb-1">Polygon Wallet (recebe splits da plataforma)</label>
              <input value={platformWallet} onChange={e => setPlatformWallet(e.target.value)}
                className="input font-mono text-sm" placeholder="0x..." />
            </div>
            <div>
              <label className="label block mb-1">URL do Site</label>
              <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
                className="input" placeholder="https://trustbank.xyz" />
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="font-black text-[var(--text)] mb-2">Wallet de Recebimento por Usuário</h4>
              <p className="text-xs text-[var(--text2)] mb-3">
                Define a carteira que recebe ganhos do mini-site (campo `wallet_address` em `mini_sites`).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={userWalletEmail} onChange={e => setUserWalletEmail(e.target.value)}
                  className="input" placeholder="email@usuario.com" />
                <input value={userWalletAddress} onChange={e => setUserWalletAddress(e.target.value)}
                  className="input font-mono text-sm" placeholder="0x..." />
              </div>
              <button onClick={setWalletForUser} className="btn-primary mt-3">
                Aplicar wallet no usuário
              </button>
            </div>
            <div className="border-t border-red-500/30 pt-4">
              <h4 className="font-black text-red-400 mb-2">Danger Zone · Delete mini-site</h4>
              <p className="text-xs text-[var(--text2)] mb-3">
                Apaga mini-site e dados relacionados (links, vídeos, feed, analytics) e remove o slug do registro do dono.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={deleteSiteSlug}
                  onChange={e => setDeleteSiteSlug(e.target.value)}
                  className="input"
                  placeholder="slug (ex: artnoir)"
                />
                <input
                  value={deleteSiteEmail}
                  onChange={e => setDeleteSiteEmail(e.target.value)}
                  className="input"
                  placeholder="ou email de contato"
                />
              </div>
              <button
                onClick={deleteMiniSite}
                disabled={deletingSite || (!deleteSiteSlug.trim() && !deleteSiteEmail.trim())}
                className="mt-3 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                {deletingSite ? 'Deletando...' : 'Delete mini-site'}
              </button>
            </div>
          </div>
        )}

        {/* APIS */}
        {tab === 'apis' && (
          <div className="space-y-5">
            <div className="card p-5 space-y-3">
              <h3 className="font-black text-[var(--text)] mb-2">Status das Integrações</h3>
              {[
                { key:'supabase', label:'Supabase (Banco de dados + Auth)', ok: apiStatus.supabase },
                { key:'helio',    label:'Helio (Pagamentos USDC)', ok: apiStatus.helio },
                { key:'r2',       label:'Cloudflare R2 (Upload de mídia)', ok: apiStatus.r2 },
              ].map(a => (
                <div key={a.key} className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)]">
                  {a.ok
                    ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <span className="flex-1 text-sm font-semibold text-[var(--text)]">{a.label}</span>
                  <span className={`text-xs font-bold ${a.ok ? 'text-green-400' : 'text-red-400'}`}>{a.ok ? 'OK' : 'Não configurado'}</span>
                </div>
              ))}
              <p className="text-xs text-[var(--text2)] mt-2">Helio e R2: variáveis na Vercel. A chave DeepSeek pode ficar só no servidor (recomendado).</p>
            </div>

            <div className="card p-5 space-y-4">
              <h3 className="font-black text-[var(--text)]">IA · Bolsa de preços (DeepSeek ou API compatível)</h3>
              <p className="text-xs text-[var(--text2)] leading-relaxed">
                O TrustBank já calcula uma faixa com seguidores, visitas (30d) e nicho. Se ativares, o modelo pode refinar o valor.
                DeepSeek costuma ser mais barato que GPT-4. Alternativa: define <code className="text-brand">DEEPSEEK_API_KEY</code> na Vercel e deixa a chave aqui vazia.
              </p>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={aiConfig.enabled}
                  onChange={e => setAiConfig(c => ({ ...c, enabled: e.target.checked }))}
                />
                Ativar refinamento por IA (ou define <code className="text-brand">AI_PRICING_ENABLED=true</code> na Vercel com <code className="text-brand">DEEPSEEK_API_KEY</code>)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text2)]">Base URL (OpenAI-compatible)</label>
                  <input
                    value={aiConfig.baseUrl}
                    onChange={e => setAiConfig(c => ({ ...c, baseUrl: e.target.value }))}
                    className="input w-full mt-1 font-mono text-xs"
                    placeholder="https://api.deepseek.com/v1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text2)]">Modelo</label>
                  <input
                    value={aiConfig.model}
                    onChange={e => setAiConfig(c => ({ ...c, model: e.target.value }))}
                    className="input w-full mt-1 font-mono text-xs"
                    placeholder="deepseek-chat"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text2)]">API Key (opcional se usares só env)</label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={e => setAiConfig(c => ({ ...c, apiKey: e.target.value }))}
                  className="input w-full mt-1 font-mono text-xs"
                  placeholder="sk-… ou deixa vazio"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-amber-400/90">
                Guardar chave aqui grava em platform_settings (acesso admin). Em produção preferir variável de ambiente.
              </p>
            </div>
          </div>
        )}


        {/* CODE */}
        {tab === 'code' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">Head Code</h3>
              <p className="text-xs text-[var(--text2)] mb-3">Google Analytics, Meta Pixel, AdSense verification, custom CSS. Inserted in &lt;head&gt;.</p>
              <textarea value={headCode} onChange={e => setHeadCode(e.target.value)}
                className="input w-full font-mono text-xs resize-none" rows={8}
                placeholder="<!-- Google Analytics -->" />
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">Body Code</h3>
              <p className="text-xs text-[var(--text2)] mb-3">AdSense ads, chat widgets, custom scripts. Inserted before &lt;/body&gt;.</p>
              <textarea value={bodyCode} onChange={e => setBodyCode(e.target.value)}
                className="input w-full font-mono text-xs resize-none" rows={8}
                placeholder="<!-- AdSense -->" />
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">Editable Legal Pages (English)</h3>
              <p className="text-xs text-[var(--text2)] mb-3">Use plain text or HTML. Terms/Privacy pages will load from here when set.</p>
              <label className="label block mb-1">Terms Content</label>
              <textarea value={termsContent} onChange={e => setTermsContent(e.target.value)}
                className="input w-full font-mono text-xs resize-none mb-3" rows={8}
                placeholder="Terms content in English..." />
              <label className="label block mb-1">Privacy Content</label>
              <textarea value={privacyContent} onChange={e => setPrivacyContent(e.target.value)}
                className="input w-full font-mono text-xs resize-none" rows={8}
                placeholder="Privacy content in English..." />
            </div>
            <div className="card p-5">
              <h3 className="font-black text-[var(--text)] mb-1">Trial Settings</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="label block mb-1">Trial Hours</label><input value={trialHours} onChange={e => setTrialHours(e.target.value)} className="input" type="number" min="1" /></div>
                <div><label className="label block mb-1">Grace Days</label><input value={graceDays} onChange={e => setGraceDays(e.target.value)} className="input" type="number" min="1" /></div>
                <div><label className="label block mb-1">Warning (hours before)</label><input value={warningHours} onChange={e => setWarningHours(e.target.value)} className="input" type="number" min="1" /></div>
                <div><label className="label block mb-1">Test Ribbon</label><input value={testRibbonText} onChange={e => setTestRibbonText(e.target.value)} className="input" /></div>
              </div>
            </div>
            <p className="text-xs text-[var(--text2)]">Click "Save All" at the top to apply changes.</p>
          </div>
        )}
        {/* PLANS */}
        {tab === 'plans' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[var(--text)] text-lg">💳 Planos & Preços</h3>
              <div className="flex gap-2">
                {!plansLoaded && <button onClick={loadPlans} className="btn-primary text-sm px-4">Carregar</button>}
                <button onClick={() => setEditingPlan({ name:'', price_monthly:'19.90', price_yearly:'190', color:'#818cf8', emoji:'⚡', features:'', active:true, sort_order:plans.length })}
                  className="btn-primary text-sm px-4 gap-2"><Plus className="w-4 h-4" /> Novo Plano</button>
              </div>
            </div>

            {editingPlan && (
              <div className="card p-5 border-brand/40">
                <h4 className="font-black text-[var(--text)] mb-4">{editingPlan.id ? 'Editar Plano' : 'Novo Plano'}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div><label className="label block mb-1">Nome</label>
                    <input value={editingPlan.name} onChange={e=>setEditingPlan((p:any)=>({...p,name:e.target.value}))} className="input" placeholder="Pro"/></div>
                  <div><label className="label block mb-1">$/mês</label>
                    <input value={editingPlan.price_monthly} onChange={e=>setEditingPlan((p:any)=>({...p,price_monthly:e.target.value}))} className="input" type="number" step="0.01"/></div>
                  <div><label className="label block mb-1">$/ano</label>
                    <input value={editingPlan.price_yearly} onChange={e=>setEditingPlan((p:any)=>({...p,price_yearly:e.target.value}))} className="input" type="number" step="0.01"/></div>
                  <div><label className="label block mb-1">Ordem</label>
                    <input value={editingPlan.sort_order||0} onChange={e=>setEditingPlan((p:any)=>({...p,sort_order:e.target.value}))} className="input" type="number"/></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="label block mb-1">Cor (hex)</label>
                    <div className="flex gap-2">
                      <input value={editingPlan.color||''} onChange={e=>setEditingPlan((p:any)=>({...p,color:e.target.value}))} className="input flex-1" placeholder="#818cf8"/>
                      <input type="color" value={editingPlan.color||'#818cf8'} onChange={e=>setEditingPlan((p:any)=>({...p,color:e.target.value}))} className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer p-1"/>
                    </div></div>
                  <div><label className="label block mb-1">Emoji</label>
                    <input value={editingPlan.emoji||''} onChange={e=>setEditingPlan((p:any)=>({...p,emoji:e.target.value}))} className="input" placeholder="⚡"/></div>
                </div>
                <div className="mb-3">
                  <label className="label block mb-1">Features (uma por linha)</label>
                  <textarea value={Array.isArray(editingPlan.features)?editingPlan.features.join('\n'):(editingPlan.features||'')}
                    onChange={e=>setEditingPlan((p:any)=>({...p,features:e.target.value}))}
                    className="input resize-none" rows={5} placeholder={"Unlimited links\n3 site pages\nVideo paywall\nCV paywall"}/>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={()=>savePlan(editingPlan)} disabled={saving||!editingPlan.name} className="btn-primary gap-2">
                    {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckCircle className="w-4 h-4"/>} Salvar
                  </button>
                  <button onClick={()=>setEditingPlan(null)} className="btn gap-2 text-[var(--text2)]">
                    <X className="w-4 h-4"/> Cancelar
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
                      {plan.active ? 'Ativo' : 'Off'}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[var(--text)] mb-1">
                    ${plan.price_monthly}<span className="text-sm text-[var(--text2)] font-normal">/mês</span>
                  </p>
                  {plan.price_yearly > 0 && <p className="text-sm text-green-400 mb-3">${plan.price_yearly}/ano</p>}
                  <ul className="space-y-1 mb-4">
                    {(Array.isArray(plan.features)?plan.features:[]).slice(0,4).map((f:string,i:number)=>(
                      <li key={i} className="text-xs text-[var(--text2)] flex items-center gap-2">
                        <span className="text-green-400">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button onClick={()=>setEditingPlan({...plan,features:Array.isArray(plan.features)?plan.features.join('\n'):plan.features})}
                      className="btn text-xs px-3 py-1.5 gap-1"><CheckCircle className="w-3 h-3"/> Editar</button>
                    <button onClick={async()=>{ await (supabase as any).from('platform_plans').update({active:!plan.active}).eq('id',plan.id); loadPlans(); }}
                      className="btn text-xs px-3 py-1.5">{plan.active?'Desativar':'Ativar'}</button>
                    <button onClick={async()=>{ if(!confirm('Deletar plano?'))return; await (supabase as any).from('platform_plans').delete().eq('id',plan.id); loadPlans(); toast.success('Deletado'); }}
                      className="btn text-xs px-3 py-1.5 text-red-400">Deletar</button>
                  </div>
                </div>
              ))}
              {plans.length===0&&plansLoaded&&<p className="text-[var(--text2)] text-sm col-span-2">Nenhum plano. Clique "Novo Plano" para criar.</p>}
              {!plansLoaded&&<p className="text-[var(--text2)] text-sm col-span-2">Clique "Carregar" para ver os planos existentes.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
