'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { BoostButton } from '@/components/ui/BoostButton';
import { SiteFollowButton } from '@/components/site/SiteFollowButton';
import { useI18n, useT } from '@/lib/i18n';
import { DIRECTORY_PROFILE_I18N_KEYS } from '@/lib/directoryProfileLabels';
import { Shield, Search, Globe, Users, Zap, ExternalLink } from 'lucide-react';

interface SiteEntry {
  id: string; slug: string; site_name: string; bio?: string;
  avatar_url?: string; accent_color?: string; theme?: string;
  is_verified?: boolean; boost_score?: number;
  follower_count?: number | null;
  directory_profile_slug?: string | null;
  site_category_slug?: string | null;
  ad_asking_price_usdc?: number | null;
}

const PAGE_SIZE = 16;

export default function SitesDirectoryPage() {
  const T = useT();
  const { lang } = useI18n();
  const numLocale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [search, setSearch] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'followers'>('followers');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    let q = supabase.from('mini_sites')
      .select('id, slug, site_name, bio, avatar_url, accent_color, theme, is_verified, follower_count, directory_profile_slug, site_category_slug, ad_asking_price_usdc')
      .eq('published', true);
    if (search) q = (q as any).or(`site_name.ilike.%${search}%,bio.ilike.%${search}%,slug.ilike.%${search}%`);
    if (profileFilter) q = q.eq('directory_profile_slug', profileFilter);
    if (categoryFilter) q = q.eq('site_category_slug', categoryFilter);
    if (sortBy === 'followers') q = q.order('follower_count', { ascending: false });
    else q = q.order('created_at', { ascending: false });
    q = q.range(from, from + PAGE_SIZE - 1);
    const { data } = await q;
    const items = (data || []) as SiteEntry[];
    setSites(prev => reset ? items : [...prev, ...items]);
    setHasMore(items.length === PAGE_SIZE);
    if (!reset) setPage(p => p + 1);
    setLoading(false);
  }, [page, search, profileFilter, categoryFilter, sortBy]);

  useEffect(() => { load(true); setPage(1); }, [search, profileFilter, categoryFilter, sortBy]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting && hasMore && !loading) load(); }, { threshold: 0.1 });
    if (observerRef.current) obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Header />
      <div className="border-b border-[var(--border)] bg-[var(--bg2)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-[var(--text)] flex items-center gap-2"><Globe className="w-6 h-6 text-brand" /> {T('sites_title')}</h1>
              <p className="text-sm text-[var(--text2)]">{T('sites_subtitle')}</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder={T('sites_search_placeholder')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <select value={profileFilter} onChange={e => setProfileFilter(e.target.value)} className="input text-sm">
              <option value="">{T('sites_filter_all_profiles')}</option>
              <option value="influencer">{T('sites_prof_influencer')}</option>
              <option value="actor">{T('sites_prof_actor')}</option>
              <option value="actress">{T('sites_prof_actress')}</option>
              <option value="athlete">{T('sites_prof_athlete')}</option>
              <option value="entrepreneur">{T('sites_prof_entrepreneur')}</option>
              <option value="automotive">{T('sites_prof_automotive')}</option>
              <option value="creator">{T('sites_prof_creator')}</option>
              <option value="services">{T('sites_prof_services')}</option>
              <option value="other">{T('sites_prof_other')}</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input text-sm">
              <option value="">{T('sites_filter_all_categories')}</option>
              <option value="creator">{T('sites_cat_creator')}</option>
              <option value="services">{T('sites_cat_services')}</option>
              <option value="tech">{T('sites_cat_tech')}</option>
              <option value="business">{T('sites_cat_business')}</option>
              <option value="local">{T('sites_cat_local')}</option>
              <option value="other">{T('sites_cat_other')}</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'recent' | 'followers')} className="input text-sm">
              <option value="followers">{T('sites_filter_sort_followers')}</option>
              <option value="recent">{T('sites_filter_sort_recent')}</option>
            </select>
            <a
              href="/marketplace/ads"
              className="input text-sm flex items-center justify-center font-semibold text-brand border-brand/40 hover:bg-brand/10"
            >
              {T('sites_sponsor_cta')}
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sites.map(site => {
            const accent = site.accent_color || '#818cf8';
            return (
              <div key={site.id} className="card p-4 hover:border-brand/40 transition-all hover:-translate-y-0.5 duration-200">
                <div className="text-center mb-3">
                  {site.avatar_url
                    ? <img src={site.avatar_url} className="w-14 h-14 rounded-xl mx-auto object-cover" style={{ border: `2px solid ${accent}40` }} />
                    : <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center font-black text-2xl text-white" style={{ background: accent }}>{site.site_name?.[0]?.toUpperCase()}</div>
                  }
                </div>
                <p className="font-black text-[var(--text)] text-sm text-center flex items-center justify-center gap-1">
                  {site.site_name}
                  {site.is_verified && <Shield className="w-3 h-3 text-blue-500" />}
                </p>
                <p className="text-xs text-center font-mono mt-0.5" style={{ color: accent }}>{site.slug}.trustbank.xyz</p>
                <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5 min-h-[22px]">
                  {site.directory_profile_slug && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)]">
                      {DIRECTORY_PROFILE_I18N_KEYS[site.directory_profile_slug]
                        ? T(DIRECTORY_PROFILE_I18N_KEYS[site.directory_profile_slug])
                        : site.directory_profile_slug}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/25">
                    <Users className="w-3 h-3 inline mr-0.5 align-text-bottom" />
                    {(site.follower_count ?? 0).toLocaleString(numLocale)}
                  </span>
                  {site.ad_asking_price_usdc != null && site.ad_asking_price_usdc > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30" title={T('ads_price_title')}>
                      {T('sites_from_usdc').replace('{value}', Number(site.ad_asking_price_usdc).toLocaleString(numLocale))}
                    </span>
                  )}
                </div>
                {site.bio && <p className="text-xs text-[var(--text2)] text-center mt-1.5 line-clamp-2">{site.bio}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3 items-center justify-center">
                  <SiteFollowButton
                    siteId={site.id}
                    siteSlug={site.slug}
                    accentColor={accent}
                    textColor="var(--text)"
                    borderColor="var(--border)"
                    compact
                  />
                  <a href={`https://${site.slug}.trustbank.xyz`} target="_blank" rel="noopener"
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text2)] hover:border-brand/50 hover:text-brand transition-all">
                    <ExternalLink className="w-3 h-3" /> {T('sites_visit')}
                  </a>
                  <a
                    href={`/marketplace/ads?slug=${encodeURIComponent(site.slug)}`}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-all"
                  >
                    {T('sites_ads_short')}
                  </a>
                  <BoostButton targetType="site" siteId={site.id} slug={site.slug} targetName={site.site_name} compact />
                </div>
              </div>
            );
          })}
          {loading && [...Array(8)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="w-14 h-14 rounded-xl bg-[var(--bg2)] mx-auto mb-3" />
              <div className="h-3 bg-[var(--bg2)] rounded mx-auto w-3/4 mb-2" />
              <div className="h-2 bg-[var(--bg2)] rounded mx-auto w-1/2" />
            </div>
          ))}
        </div>
        {!loading && sites.length === 0 && (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-brand/30 mx-auto mb-3" />
            <p className="text-[var(--text2)]">{T('sites_not_found')}</p>
          </div>
        )}
        <div ref={observerRef} className="h-10" />
      </div>
      <Footer />
    </div>
  );
}
