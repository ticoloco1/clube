'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { BoostButton } from '@/components/ui/BoostButton';
import { SecureVideoPlayer } from '@/components/site/SecureVideoPlayer';
import { Play, Lock, Search, Shield, ExternalLink } from 'lucide-react';

interface VideoEntry {
  id: string; youtube_video_id: string; title: string;
  paywall_enabled: boolean; paywall_price: number;
  sort_order: number; boost_score?: number;
  mini_sites: { slug: string; site_name: string; avatar_url?: string; accent_color?: string; is_verified?: boolean; };
}

const PAGE_SIZE = 12;

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    let q = supabase.from('mini_site_videos')
      .select('*, mini_sites!inner(slug, site_name, avatar_url, accent_color, is_verified, published)')
      .eq('mini_sites.published', true)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search) q = (q as any).ilike('title', `%${search}%`);
    if (filter === 'free') q = (q as any).eq('paywall_enabled', false);
    if (filter === 'premium') q = (q as any).eq('paywall_enabled', true);
    const { data } = await q;
    const items = (data || []) as VideoEntry[];
    setVideos(prev => reset ? items : [...prev, ...items]);
    setHasMore(items.length === PAGE_SIZE);
    if (!reset) setPage(p => p + 1);
    setLoading(false);
  }, [page, search, filter]);

  useEffect(() => { load(true); setPage(1); }, [search, filter]);
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
          <h1 className="text-2xl font-black text-[var(--text)] flex items-center gap-2 mb-4">
            <Play className="w-6 h-6 text-red-500" /> Videos
          </h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text2)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Search videos..." />
            </div>
            <div className="flex gap-2">
              {[['all','All'],['free','Free'],['premium','Premium 🔒']].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === val ? 'bg-brand text-white' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text2)]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => {
            const accent = video.mini_sites?.accent_color || '#818cf8';
            const thumb = `https://img.youtube.com/vi/${video.youtube_video_id}/maxresdefault.jpg`;
            return (
              <div key={video.id} className="card overflow-hidden hover:border-brand/40 transition-all group">
                {/* Thumbnail / Player */}
                <div className="relative aspect-video bg-black">
                  {playing === video.id ? (
                    <SecureVideoPlayer videoId={video.id} title={video.title}
                      paywallEnabled={video.paywall_enabled} paywallPrice={video.paywall_price}
                      accentColor={accent} siteSlug={video.mini_sites?.slug} />
                  ) : (
                    <div className="relative w-full h-full cursor-pointer" onClick={() => setPlaying(video.id)}>
                      {!video.paywall_enabled
                        ? <img src={thumb} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ background: `radial-gradient(ellipse at 50% 50%, ${accent}20, #050510)` }}>
                            <Lock className="w-10 h-10" style={{ color: accent }} />
                          </div>
                      }
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-all">
                        <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {video.paywall_enabled
                            ? <Lock className="w-5 h-5" style={{ color: accent }} />
                            : <Play className="w-5 h-5 fill-white text-white ml-0.5" />}
                        </div>
                      </div>
                      {video.paywall_enabled && (
                        <div className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: accent + '30', color: accent, border: `1px solid ${accent}50` }}>
                          ${video.paywall_price} USDC
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="font-bold text-[var(--text)] text-sm mb-3 line-clamp-2">{video.title || 'Untitled'}</p>
                  <div className="flex items-center justify-between">
                    <a href={`https://${video.mini_sites?.slug}.trustbank.xyz`} target="_blank" rel="noopener"
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      {video.mini_sites?.avatar_url
                        ? <img src={video.mini_sites.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                        : <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: accent }}>{video.mini_sites?.site_name?.[0]}</div>}
                      <span className="text-xs text-[var(--text2)] flex items-center gap-1">
                        {video.mini_sites?.site_name}
                        {video.mini_sites?.is_verified && <Shield className="w-3 h-3 text-blue-500" />}
                      </span>
                    </a>
                    <BoostButton targetType="video" targetId={video.id} targetName={video.title} compact />
                  </div>
                </div>
              </div>
            );
          })}
          {loading && [...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse overflow-hidden">
              <div className="aspect-video bg-[var(--bg2)]" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-[var(--bg2)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bg2)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        {!loading && videos.length === 0 && (
          <div className="text-center py-20">
            <Play className="w-12 h-12 text-brand/30 mx-auto mb-3" />
            <p className="text-[var(--text2)]">No videos found</p>
          </div>
        )}
        <div ref={observerRef} className="h-10" />
      </div>
      <Footer />
    </div>
  );
}
