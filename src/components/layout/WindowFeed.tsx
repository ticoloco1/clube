'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ExternalLink, Play, Lock } from 'lucide-react';

const BRAND_COLORS: Record<string, string> = {
  instagram: '#E1306C', youtube: '#FF0000', tiktok: '#000',
  twitter: '#1DA1F2', linkedin: '#0A66C2', spotify: '#1DB954',
  github: '#fff', whatsapp: '#25D366', link: '#818cf8',
};

const BRAND_SVG: Record<string, string> = {
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  youtube:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.6 2.8 12 2.8 12 2.8s-4.6 0-6.8.2c-.6.1-1.9.1-3 1.3C1.3 5 1 7 1 7S.7 9.1.7 11.3v2c0 2.1.3 4.2.3 4.2s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7.3 21.7 12 21.7 12 21.7s4.6 0 6.8-.3c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.1.3-4.2v-2C23.3 9.1 23 7 23 7zM9.7 15.5V8.2l6.6 3.7-6.6 3.6z"/></svg>`,
  tiktok:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.17a8.16 8.16 0 0 0 4.77 1.52V7.25a4.85 4.85 0 0 1-1-.56z"/></svg>`,
  twitter:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  linkedin:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  link:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
};

interface FeedCard {
  id: string; type: 'site' | 'video' | 'post';
  slug: string; site_name: string; avatar_url?: string;
  accent_color?: string; bio?: string;
  title?: string; youtube_video_id?: string;
  paywall_enabled?: boolean; paywall_price?: number;
  links?: Array<{ icon: string; title: string; url: string }>;
}

export function WindowFeed() {
  const [cards, setCards] = useState<FeedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      // Load published sites with their links
      const { data: sites } = await supabase.from('mini_sites')
        .select('id, slug, site_name, avatar_url, accent_color, bio, published')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(12);

      const { data: videos } = await supabase.from('mini_site_videos')
        .select('id, title, youtube_video_id, paywall_enabled, paywall_price, site_id, mini_sites!inner(slug, site_name, avatar_url, accent_color, published)')
        .eq('mini_sites.published', true)
        .limit(8);

      const siteCards: FeedCard[] = (sites || []).map(s => ({
        id: s.id, type: 'site', slug: s.slug, site_name: s.site_name,
        avatar_url: s.avatar_url, accent_color: s.accent_color, bio: s.bio,
      }));

      const videoCards: FeedCard[] = (videos || []).map((v: any) => ({
        id: v.id, type: 'video',
        slug: v.mini_sites?.slug || '',
        site_name: v.mini_sites?.site_name || '',
        avatar_url: v.mini_sites?.avatar_url,
        accent_color: v.mini_sites?.accent_color,
        title: v.title, youtube_video_id: v.youtube_video_id,
        paywall_enabled: v.paywall_enabled, paywall_price: v.paywall_price,
      }));

      // Interleave
      const all: FeedCard[] = [];
      const max = Math.max(siteCards.length, videoCards.length);
      for (let i = 0; i < max; i++) {
        if (siteCards[i]) all.push(siteCards[i]);
        if (videoCards[i]) all.push(videoCards[i]);
      }
      setCards(all);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex gap-4 px-4 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[400px] h-[438px] rounded-2xl bg-[var(--bg2)] animate-pulse" />
      ))}
    </div>
  );

  return (
    <div ref={scrollRef}
      className="flex gap-4 px-4 overflow-x-auto scrollbar-hide"
      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
      {cards.map(card => {
        const accent = card.accent_color || '#818cf8';
        return (
          <a key={card.id}
            href={`https://${card.slug}.trustbank.xyz`}
            target="_blank" rel="noopener"
            style={{ scrollSnapAlign: 'start', flexShrink: 0, width: 400, height: 438, textDecoration: 'none' }}>

            {card.type === 'video' ? (
              /* ── Video card ── */
              <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative',
                background: `radial-gradient(ellipse at 50% 50%,${accent}20,#050510)`,
                border: `1px solid ${accent}25` }}>
                {/* Thumbnail */}
                <div style={{ width: '100%', height: 220, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={`https://img.youtube.com/vi/${card.youtube_video_id}/maxresdefault.jpg`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: card.paywall_enabled ? 0.4 : 0.9 }}
                    onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${card.youtube_video_id}/hqdefault.jpg`; }}
                  />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: card.paywall_enabled ? `${accent}cc` : 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                      {card.paywall_enabled
                        ? <Lock style={{ width: 24, height: 24, color: '#fff' }} />
                        : <Play style={{ width: 24, height: 24, fill: '#fff', color: '#fff', marginLeft: 3 }} />}
                    </div>
                  </div>
                  {card.paywall_enabled && (
                    <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 999, background: accent, color: '#fff', fontSize: 12, fontWeight: 800 }}>
                      ${card.paywall_price} USDC
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{card.title || 'Video'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {card.avatar_url
                      ? <img src={card.avatar_url} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}` }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>{card.site_name[0]}</div>}
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{card.site_name}</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: accent, marginLeft: 'auto' }}>{card.slug}.trustbank.xyz</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Site card ── */
              <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative',
                background: `linear-gradient(160deg, #0d1117 0%, #0d1117 60%, ${accent}18 100%)`,
                border: `1px solid ${accent}20` }}>
                {/* Top glow */}
                <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: `${accent}12`, filter: 'blur(40px)', pointerEvents: 'none' }} />

                <div style={{ padding: '32px 24px 20px', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
                  {/* Avatar */}
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'inline-block', padding: 3, borderRadius: '50%', background: `linear-gradient(135deg,${accent},${accent}60)` }}>
                      {card.avatar_url
                        ? <img src={card.avatar_url} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '3px solid #0d1117' }} />
                        : <div style={{ width: 72, height: 72, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: '#fff', border: '3px solid #0d1117' }}>{card.site_name[0]}</div>}
                    </div>
                    <p style={{ margin: '10px 0 4px', fontSize: 18, fontWeight: 900, color: '#e6edf3', letterSpacing: '-0.02em' }}>{card.site_name}</p>
                    {card.bio && <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, maxHeight: 36, overflow: 'hidden' }}>{card.bio}</p>}
                    <p style={{ margin: '6px 0 0', fontSize: 11, fontFamily: 'monospace', color: accent, opacity: 0.7 }}>{card.slug}.trustbank.xyz</p>
                  </div>

                  {/* Links preview */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
                    {(card.links || []).slice(0, 4).map((link, i) => {
                      const brandColor = BRAND_COLORS[link.icon] || accent;
                      const brandSvg = BRAND_SVG[link.icon] || BRAND_SVG.link;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0, height: 44, borderRadius: 12, border: `1px solid rgba(255,255,255,0.07)`, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${brandColor}18`, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ width: 20, height: 20, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: brandSvg }} />
                          </div>
                          <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{link.title}</span>
                          <ExternalLink style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)', marginRight: 12, flexShrink: 0 }} />
                        </div>
                      );
                    })}
                    {(!card.links || card.links.length === 0) && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Visit to see links</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>trustbank.xyz</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: `${accent}18`, border: `1px solid ${accent}30` }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>Live</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}
