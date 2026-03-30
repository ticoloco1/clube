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

const SKILL_AREAS = ['Todos', 'Tech', 'Design', 'Marketing', 'Finance', 'Legal', 'Health', 'Education', 'Sales', 'Engineering'];
const REGIONS = ['Todos', 'Brasil', 'USA', 'Europe', 'Asia', 'Remote'];

// ─── CV Card ──────────────────────────────────────────────────────────────────
function CVCard({ profile, onUnlock }: { profile: CVProfile; onUnlock: (p: CVProfile) => void }) {
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
              ? <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Premium</span>
              : <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Unlock className="w-2.5 h-2.5" /> Aberto</span>
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
          {profile.cv_hire_currency} {profile.cv_hire_price} / {profile.cv_hire_type}
        </div>
      )}

      {/* Top experience */}
      {topExp && (
        <div className="flex items-center gap-2 text-xs text-[var(--text2)] mb-3 bg-[var(--bg2)] rounded-lg px-3 py-2">
          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate"><span className="font-semibold text-[var(--text)]">{topExp.role}</span> · {topExp.company}</span>
          {topExp.current && <span className="ml-auto text-green-500 font-semibold flex-shrink-0">Atual</span>}
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
          <ExternalLink className="w-3.5 h-3.5" /> Ver perfil
        </a>
        {isLocked ? (
          <button onClick={() => onUnlock(profile)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
            <Lock className="w-3.5 h-3.5" />
            {profile.cv_price ? `$${profile.cv_price} USDC` : 'Desbloquear'}
          </button>
        ) : (
          <a href={`https://${profile.slug}.trustbank.xyz`} target="_blank" rel="noopener"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <Unlock className="w-3.5 h-3.5" /> Ver CV
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Company Plan Modal ───────────────────────────────────────────────────────
function CompanyModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');

  const prices = { monthly: 199, annual: 1590 }; // annual = ~$133/mo (save 33%)

  const handleSubscribe = () => {
    if (!user) { toast.error('Faça login primeiro'); return; }
    add({
      id: `cv_directory_${plan}_${Date.now()}`,
      label: `Diretório de CVs — ${plan === 'monthly' ? '$199/mês' : '$1,590/ano'} (20 CVs inclusos)`,
      price: prices[plan],
      type: 'plan',
    });
    toast.success('Plano adicionado ao carrinho!');
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
          <h3 className="font-black text-xl text-[var(--text)]">Acesso Empresarial</h3>
          <p className="text-[var(--text2)] text-sm mt-1">Recrute talentos verificados globalmente</p>
        </div>

        {/* Plan toggle */}
        <div className="flex gap-2 mb-5">
          {(['monthly', 'annual'] as const).map(p => (
            <button key={p} onClick={() => setPlan(p)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${plan === p ? 'bg-brand text-white border-brand' : 'border-[var(--border)] text-[var(--text2)] hover:border-brand/50'}`}>
              {p === 'monthly' ? 'Mensal' : 'Anual'}
              {p === 'annual' && <span className="block text-xs font-normal mt-0.5 opacity-80">economize 33%</span>}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="text-center mb-5 p-4 bg-[var(--bg2)] rounded-xl">
          <p className="text-4xl font-black text-[var(--text)]">
            ${plan === 'monthly' ? '199' : '1,590'}
            <span className="text-base font-normal text-[var(--text2)] ml-1">USDC/{plan === 'monthly' ? 'mês' : 'ano'}</span>
          </p>
          {plan === 'annual' && <p className="text-green-500 text-sm mt-1">≈ $133/mês · economize $798/ano</p>}
        </div>

        {/* Features */}
        <div className="space-y-2.5 mb-5">
          {[
            ['20 CVs inclusos por mês', 'Abra contato de 20 profissionais/mês'],
            ['CVs adicionais por $8 cada', 'Compre mais conforme necessário'],
            ['Busca por skills, região e idioma', 'Encontre o talento certo'],
            ['Sem divisão com criador', 'Você paga direto para a plataforma'],
            ['Dashboard de recrutamento', 'Gerencie candidatos e contatos'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
                <p className="text-xs text-[var(--text2)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSubscribe}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
          <Building2 className="w-4 h-4" />
          Assinar por ${plan === 'monthly' ? '199' : '1,590'} USDC
        </button>
        <p className="text-xs text-center text-[var(--text2)] mt-2">Pago via USDC · Polygon · Cancele quando quiser</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;

export default function CVDirectoryPage() {
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [profiles, setProfiles] = useState<CVProfile[]>([]);
  const [search, setSearch] = useState('');
  const [skillArea, setSkillArea] = useState('Todos');
  const [region, setRegion] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
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
    if (region !== 'Todos') q = (q as any).ilike('cv_location', `%${region}%`);

    const { data, count } = await (q as any);
    let filtered = (data || []) as CVProfile[];

    if (skillArea !== 'Todos') {
      filtered = filtered.filter(p => p.cv_skills?.some(s => s.toLowerCase().includes(skillArea.toLowerCase())));
    }

    setProfiles(prev => reset ? filtered : [...prev, ...filtered]);
    setHasMore(filtered.length === PAGE_SIZE);
    if (!reset) setPage(p => p + 1);
    if (count) setTotalCount(count);
    setLoading(false);
  }, [page, search, skillArea, region]);

  useEffect(() => { load(true); setPage(1); }, [search, skillArea, region]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore && !loading) load(); }, { threshold: 0.1 });
    if (observerRef.current) obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  const handleUnlock = (profile: CVProfile) => {
    if (!user) { toast.error('Faça login para desbloquear CVs'); return; }
    const price = profile.cv_price || 10;
    add({
      id: `cv_unlock_${profile.id}`,
      label: `CV: ${profile.site_name} (desbloqueio direto)`,
      price,
      type: 'plan',
    });
    toast.success(`CV de ${profile.site_name} adicionado ao carrinho!`);
    openCart();
  };

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
                <Users className="w-3.5 h-3.5" /> Diretório Global de Profissionais
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-[var(--text)]">Encontre Talentos</h1>
              <p className="text-[var(--text2)] mt-1">Profissionais verificados com mini sites · Pagamento em USDC</p>
            </div>
            <button onClick={() => setShowCompanyModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm shadow-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
              <Building2 className="w-4 h-4" /> Acesso Empresarial · $199/mês
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-10 text-sm" placeholder="Buscar por nome, headline, skill..." />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1.5 overflow-x-auto">
              {SKILL_AREAS.map(a => (
                <button key={a} onClick={() => setSkillArea(a)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${skillArea === a ? 'bg-brand text-white' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text2)] hover:border-brand/50'}`}>
                  {a}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-[var(--border)] mx-1 mt-0.5" />
            <div className="flex gap-1.5 overflow-x-auto">
              {REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${region === r ? 'bg-indigo-600 text-white' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text2)] hover:border-indigo-400/50'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {profiles.length > 0 && (
          <p className="text-sm text-[var(--text2)] mb-5">{profiles.length} profissionais encontrados</p>
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
            <h3 className="font-bold text-[var(--text)] mb-1">Nenhum profissional encontrado</h3>
            <p className="text-[var(--text2)] text-sm">Tente outros filtros ou seja o primeiro a cadastrar seu CV!</p>
            <Link href="/editor" className="btn-primary mt-4 inline-flex">Criar meu CV</Link>
          </div>
        )}
        <div ref={observerRef} className="h-10" />
      </div>
    </div>
  );
}
