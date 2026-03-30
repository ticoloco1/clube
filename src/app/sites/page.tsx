'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { BoostButton } from '@/components/ui/BoostButton';
import { Shield, Search, Globe, Users, Zap, ExternalLink } from 'lucide-react';

interface SiteEntry {
  id: string; slug: string; site_name: string; bio?: string;
  avatar_url?: string; accent_color?: string; theme?: string;
  is_verified?: boolean; boost_score?: number;
}

const PAGE_SIZE = 16;

export default function SitesDirectoryPage() {
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    let q = supabase.from('mini_sites')
      .select('id, slug, site_name, bio, avatar_url, accent_color, theme, is_verified')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search) q = (q as any).or(`site_name.ilike.%${search}%,bio.ilike.%${search}%,slug.ilike.%${search}%`);
    const { data } = await q;
    const items = (data || []) as SiteEntry[];
    setSites(prev => reset ? items : [...prev, ...items]);
    setHasMore(items.length === PAGE_SIZE);
    if (!reset) setPage(p => p + 1);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(true); setPage(1); }, [search]);

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
              <h1 className="text-2xl font-black text-[var(--text)] flex items-center gap-2"><Globe className="w-6 h-6 text-brand" /> Mini Sites</h1>
              <p className="text-sm text-[var(--text2)]">Discover creators, professionals and brands</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Search by name, slug or bio..." />
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
                {site.bio && <p className="text-xs text-[var(--text2)] text-center mt-1.5 line-clamp-2">{site.bio}</p>}
                <div className="flex gap-1.5 mt-3">
                  <a href={`https://${site.slug}.trustbank.xyz`} target="_blank" rel="noopener"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text2)] hover:border-brand/50 hover:text-brand transition-all">
                    <ExternalLink className="w-3 h-3" /> Visit
                  </a>
                  <BoostButton targetType="site" targetId={site.id} targetName={site.site_name} compact />
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
            <p className="text-[var(--text2)]">No sites found</p>
          </div>
        )}
        <div ref={observerRef} className="h-10" />
      </div>
      <Footer />
    </div>
  );
}
