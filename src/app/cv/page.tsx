'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import {
  Search, Lock, Unlock, MapPin, Briefcase, Code2,
  Globe, Award, DollarSign, Building2, CheckCircle,
  ExternalLink, Shield, ChevronDown, Loader2, Users, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CVProfile {
  id: string;
  slug: string;
  site_name: string;
  avatar_url?: string;
  is_verified?: boolean;
  cv_headline?: string;
  cv_location?: string;
  cv_skills?: string[];
  cv_hire_price?: number;
  cv_hire_currency?: string;
  cv_hire_type?: string;
  cv_free?: boolean;
  cv_price?: number;
  cv_locked?: boolean;
  accent_color?: string;
  // from cv_experience jsonb
  cv_experience?: { company: string; role: string; current?: boolean; start?: string; end?: string }[];
  cv_education?: { institution: string; degree: string; field: string }[];
  cv_languages?: { lang: string; level: string }[];
}

const CV_FILTER_ALL = '__all__';
const SKILL_OPTIONS = ['__all__', 'Tech', 'Design', 'Marketing', 'Finance', 'Legal', 'Health', 'Education', 'Sales', 'Engineering'] as const;
/** `value` must match typical `cv_location` text for filtering */
const REGION_FILTERS: { value: string; labelKey: string }[] = [
  { value: CV_FILTER_ALL, labelKey: 'cv_filter_all' },
  { value: 'Brasil', labelKey: 'cv_region_br' },
  { value: 'USA', labelKey: 'cv_region_usa' },
  { value: 'Europe', labelKey: 'cv_region_europe' },
  { value: 'Asia', labelKey: 'cv_region_asia' },
  { value: 'Remote', labelKey: 'cv_region_remote' },
];

// ─── CV Card ──────────────────────────────────────────────────────────────────
function CVCard({ profile, onUnlock }: { profile: CVProfile; onUnlock: (p: CVProfile) => void }) {
  const T = useT();
  const accent = profile.accent_color || '#818cf8';
  const isLocked = !profile.cv_free;
  const topExp = profile.cv_experience?.[0];

  return (
    <div className="card p-5 hover:border-brand/40 transition-all duration-200 hover:-translate-y-0.5 group">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {profile.avatar_url
          ? <img src={profile.avatar_url} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: `2px solid ${accent}40` }} />
          : <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-lg text-white" style={{ background: accent }}>{profile.site_name?.[0]?.toUpperCase()}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-black text-[var(--text)] text-base">{profile.site_name}</h3>
            {profile.is_verified && <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
            {isLocked
              ? <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> {T('cv_badge_premium')}</span>
              : <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Unlock className="w-2.5 h-2.5" /> {T('cv_badge_open')}</span>
            }
          </div>
          {profile.cv_headline && <p className="text-sm text-[var(--text2)] truncate">{profile.cv_headline}</p>}
          {profile.cv_location && <p className="text-xs text-[var(--text2)] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{profile.cv_location}</p>}
        </div>
      </div>

      {/* Hire rate badge */}
      {profile.cv_hire_price && profile.cv_hire_price > 0 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ background: accent + '15', color: accent, border: `1px solid ${accent}30` }}>
          <DollarSign className="w-3 h-3" />
          {profile.cv_hire_currency} $ {profile.cv_hire_price} / {profile.cv_hire_type}
        </div>
      )}

      {/* Top experience */}
      {topExp && (
        <div className="flex items-center gap-2 text-xs text-[var(--text2)] mb-3 bg-[var(--bg2)] rounded-lg px-3 py-2">
          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate"><span className="font-semibold text-[var(--text)]">{topExp.role}</span> · {topExp.company}</span>
          {topExp.current && <span className="ml-auto text-green-500 font-semibold flex-shrink-0">{T('cv_current')}</span>}
        </div>
      )}

      {/* Skills */}
      {profile.cv_skills && profile.cv_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.cv_skills.slice(0, 5).map(sk => (
            <span key={sk} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: accent + '15', color: accent }}>{sk}</span>
          ))}
          {profile.cv_skills.length > 5 && <span className="text-xs text-[var(--text2)]">+{profile.cv_skills.length - 5}</span>}
        </div>
      )}

      {/* Languages */}
      {profile.cv_languages && profile.cv_languages.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--text2)] mb-4">
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          {profile.cv_languages.map(l => l.lang).join(' · ')}
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-2">
        <a href={`https://${profile.slug}.trustbank.xyz`} target="_blank" rel="noopener"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--text2)] hover:border-brand/50 hover:text-brand transition-all">
          <ExternalLink className="w-3.5 h-3.5" /> {T('cv_view_profile')}
        </a>
        {isLocked ? (
          <button onClick={() => onUnlock(profile)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
            <Lock className="w-3.5 h-3.5" />
            {profile.cv_price ? `$ ${profile.cv_price} USD` : T('cv_unlock')}
          </button>
        ) : (
          <a href={`https://${profile.slug}.trustbank.xyz`} target="_blank" rel="noopener"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <Unlock className="w-3.5 h-3.5" /> {T('cv_view_cv')}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Company Plan Modal ───────────────────────────────────────────────────────
function CompanyModal({ onClose }: { onClose: () => void }) {
  const T = useT();
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');

  const prices = { monthly: 199, annual: 1590 }; // annual = ~$133/mo (save 33%)

  const handleSubscribe = () => {
    if (!user) { toast.error(T('toast_login_first')); return; }
    add({
      id: plan === 'monthly' ? 'directory_company_monthly' : 'directory_company_yearly',
      label: plan === 'monthly' ? T('cv_company_cart_m') : T('cv_company_cart_y'),
      price: prices[plan],
      type: 'directory_company',
    });
    toast.success(T('toast_plan_cart'));
    openCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-brand" />
          </div>
          <h3 className="font-black text-xl text-[var(--text)]">{T('cv_company_title')}</h3>
          <p className="text-[var(--text2)] text-sm mt-1">{T('cv_company_sub')}</p>
        </div>

        {/* Plan toggle */}
        <div className="flex gap-2 mb-5">
          {(['monthly', 'annual'] as const).map(p => (
            <button key={p} onClick={() => setPlan(p)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${plan === p ? 'bg-brand text-white border-brand' : 'border-[var(--border)] text-[var(--text2)] hover:border-brand/50'}`}>
              {p === 'monthly' ? T('cv_monthly') : T('cv_plan_annual')}
              {p === 'annual' && <span className="block text-xs font-normal mt-0.5 opacity-80">{T('cv_yearly_save')}</span>}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="text-center mb-5 p-4 bg-[var(--bg2)] rounded-xl">
          <p className="text-4xl font-black text-[var(--text)]">
            $ {plan === 'monthly' ? '199' : '1,590'}
            <span className="text-base font-normal text-[var(--text2)] ml-1">USD / {plan === 'monthly' ? T('cv_per_month') : T('cv_per_year')}</span>
          </p>
          {plan === 'annual' && <p className="text-green-500 text-sm mt-1">{T('cv_company_yearly_hint')}</p>}
        </div>

        {/* Features */}
        <div className="space-y-2.5 mb-5">
          {([
            ['cv_company_f1t', 'cv_company_f1d'],
            ['cv_company_f2t', 'cv_company_f2d'],
            ['cv_company_f3t', 'cv_company_f3d'],
            ['cv_company_f4t', 'cv_company_f4d'],
            ['cv_company_f5t', 'cv_company_f5d'],
          ] as const).map(([tk, dk]) => (
            <div key={tk} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{T(tk)}</p>
                <p className="text-xs text-[var(--text2)]">{T(dk)}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSubscribe}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
          <Building2 className="w-4 h-4" />
          {T('cv_company_subscribe').replace('{amount}', plan === 'monthly' ? '199' : '1,590')}
        </button>
        <p className="text-xs text-center text-[var(--text2)] mt-2">{T('cv_pay_note')}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export default function CVDirectoryPage() {
  const T = useT();
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [profiles, setProfiles] = useState<CVProfile[]>([]);
  const [search, setSearch] = useState('');
  const [skillArea, setSkillArea] = useState<string>(CV_FILTER_ALL);
  const [region, setRegion] = useState<string>(CV_FILTER_ALL);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [directoryPaid, setDirectoryPaid] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  const canBrowseDirectory = isAdmin || directoryPaid;

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      setDirectoryPaid(false);
      setAccessChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: roleRow }, { data: accessRow }] = await Promise.all([
        supabase.from('user_roles' as any).select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
        supabase.from('company_cv_directory_access' as any).select('expires_at').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setIsAdmin(!!roleRow);
      const exp = accessRow?.expires_at as string | undefined;
      setDirectoryPaid(!!(exp && new Date(exp) > new Date()));
      setAccessChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const load = useCallback(async (reset = false) => {
    if (!canBrowseDirectory) return;
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    let q = supabase.from('mini_sites')
      .select('id, slug, site_name, avatar_url, is_verified, cv_headline, cv_location, cv_skills, cv_hire_price, cv_hire_currency, cv_hire_type, cv_free, cv_price, cv_locked, accent_color, cv_experience, cv_education, cv_languages')
      .eq('show_cv', true)
      .eq('published', true)
      .not('cv_headline', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (search) q = (q as any).or(`cv_headline.ilike.%${search}%,site_name.ilike.%${search}%`);
    if (region !== CV_FILTER_ALL) q = (q as any).ilike('cv_location', `%${region}%`);

    const { data, count } = await (q as any);
    let filtered = (data || []) as CVProfile[];

    if (skillArea !== CV_FILTER_ALL) {
      filtered = filtered.filter(p => p.cv_skills?.some(s => s.toLowerCase().includes(skillArea.toLowerCase())));
    }

    setProfiles(prev => reset ? filtered : [...prev, ...filtered]);
    setHasMore(filtered.length === PAGE_SIZE);
    if (!reset) setPage(p => p + 1);
    if (count) setTotalCount(count);
    setLoading(false);
  }, [page, search, skillArea, region, canBrowseDirectory]);

  useEffect(() => {
    if (!canBrowseDirectory) return;
    load(true);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload directory when filters change; avoid loop with `load`+`page`
  }, [search, skillArea, region, canBrowseDirectory]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore && !loading) load(); }, { threshold: 0.1 });
    if (observerRef.current) obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  const handleUnlock = (profile: CVProfile) => {
    if (!user) { toast.error(T('toast_login_unlock_cv')); return; }
    const price = profile.cv_price || 10;
    add({
      id: `cv_unlock_${profile.id}`,
      label: T('cv_cart_unlock').replace('{name}', profile.site_name),
      price,
      type: 'cv',
    });
    toast.success(T('toast_cv_unlock_cart').replace('{name}', profile.site_name));
    openCart();
  };

  if (!accessChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (!canBrowseDirectory) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        {showCompanyModal && <CompanyModal onClose={() => setShowCompanyModal(false)} />}
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text)] mb-2">{T('cv_dir_locked_title')}</h1>
          <p className="text-[var(--text2)] text-sm mb-8">{T('cv_dir_locked_sub')}</p>
          {!user ? (
            <Link href="/auth?redirect=/cv" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              {T('cv_dir_locked_login')}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowCompanyModal(true)}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3"
            >
              <Building2 className="w-4 h-4" />
              {T('cv_dir_locked_cta')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      {showCompanyModal && <CompanyModal onClose={() => setShowCompanyModal(false)} />}

      {/* Hero */}
      <div className="border-b border-[var(--border)] bg-[var(--bg2)]">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-full mb-3 border border-brand/20">
                <Users className="w-3.5 h-3.5" /> {T('cv_dir_badge')}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-[var(--text)]">{T('cv_dir_title')}</h1>
              <p className="text-[var(--text2)] mt-1">{T('cv_dir_sub')}</p>
            </div>
            <button onClick={() => setShowCompanyModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm shadow-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
              <Building2 className="w-4 h-4" /> {T('cv_company_cta')}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-10 text-sm" placeholder={T('cv_search_ph')} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1.5 overflow-x-auto">
              {SKILL_OPTIONS.map(a => (
                <button key={a} onClick={() => setSkillArea(a)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${skillArea === a ? 'bg-brand text-white' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text2)] hover:border-brand/50'}`}>
                  {a === CV_FILTER_ALL ? T('cv_filter_all') : a}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-[var(--border)] mx-1 mt-0.5" />
            <div className="flex gap-1.5 overflow-x-auto">
              {REGION_FILTERS.map((r) => (
                <button key={r.value} onClick={() => setRegion(r.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${region === r.value ? 'bg-indigo-600 text-white' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text2)] hover:border-indigo-400/50'}`}>
                  {T(r.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {profiles.length > 0 && (
          <p className="text-sm text-[var(--text2)] mb-5">
            {profiles.length === 1
              ? T('cv_found_one')
              : T('cv_found_many').replace('{n}', String(profiles.length))}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map(p => (
            <CVCard key={p.id} profile={p} onUnlock={handleUnlock} />
          ))}
          {loading && [...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg2)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg2)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--bg2)] rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[var(--bg2)] rounded" />
                <div className="h-3 bg-[var(--bg2)] rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>

        {!loading && profiles.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-brand" />
            </div>
            <h3 className="font-bold text-[var(--text)] mb-1">{T('cv_empty_title')}</h3>
            <p className="text-[var(--text2)] text-sm">{T('cv_empty_sub')}</p>
            <Link href="/editor" className="btn-primary mt-4 inline-flex">{T('cv_create_cv')}</Link>
          </div>
        )}
        <div ref={observerRef} className="h-10" />
      </div>
    </div>
  );
}
