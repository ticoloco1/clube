'use client';
export const dynamic = 'force-dynamic';
import { usePublicSite } from '@/hooks/useSite';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { toast } from 'sonner';
import { EarningsWidget } from '@/components/ui/EarningsWidget';
import { SecureVideoPlayer } from '@/components/site/SecureVideoPlayer';
import { ShareWidget } from '@/components/ui/ShareWidget';
import { SlugTicker } from '@/components/ui/SlugTicker';
import { FeedSection } from '@/components/site/FeedSection';
import { CVView } from '@/components/editor/CVEditor';
import { useT } from '@/lib/i18n';
import { Lock, Unlock, Shield, Clock, CheckCircle, ExternalLink, Play } from 'lucide-react';
import Link from 'next/link';

// ─── Social brand colors & SVG paths ─────────────────────────────────────────
const BRANDS: Record<string, { color: string; bg: string; path: string }> = {
  instagram: { color:'#fff', bg:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', path:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
  youtube:   { color:'#fff', bg:'#FF0000', path:'M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z' },
  tiktok:    { color:'#fff', bg:'#000', path:'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.17a8.16 8.16 0 004.77 1.52V7.25a4.85 4.85 0 01-1-.56z' },
  twitter:   { color:'#fff', bg:'#000', path:'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  linkedin:  { color:'#fff', bg:'#0A66C2', path:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  spotify:   { color:'#fff', bg:'#1DB954', path:'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z' },
  github:    { color:'#fff', bg:'#24292e', path:'M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z' },
  whatsapp:  { color:'#fff', bg:'#25D366', path:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
  facebook:  { color:'#fff', bg:'#1877F2', path:'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  link:      { color:'#fff', bg:'rgba(255,255,255,0.15)', path:'' },
};

// ─── 30 themes ────────────────────────────────────────────────────────────────
const THEMES: Record<string, any> = {
  midnight:  { bg:'#0d1117', text:'#e6edf3', text2:'rgba(255,255,255,0.5)', accent:'#818cf8', btn:'rgba(255,255,255,0.08)', btnHover:'rgba(255,255,255,0.14)', border:'rgba(255,255,255,0.08)', radius:16, font:'Inter,system-ui', aurora:true },
  noir:      { bg:'#000', text:'#fff', text2:'rgba(255,255,255,0.45)', accent:'#fff', btn:'rgba(255,255,255,0.07)', btnHover:'rgba(255,255,255,0.12)', border:'rgba(255,255,255,0.06)', radius:8, font:'"Helvetica Neue",sans-serif' },
  neon:      { bg:'#07001a', text:'#fce7f3', text2:'#c084fc', accent:'#d946ef', btn:'rgba(217,70,239,0.1)', btnHover:'rgba(217,70,239,0.18)', border:'rgba(192,132,252,0.15)', radius:20, font:'"Space Grotesk",sans-serif', aurora:true },
  gold:      { bg:'#0a0700', text:'#fef3c7', text2:'rgba(251,191,36,0.6)', accent:'#f59e0b', btn:'rgba(245,158,11,0.1)', btnHover:'rgba(245,158,11,0.18)', border:'rgba(245,158,11,0.12)', radius:6, font:'"Georgia",serif' },
  ocean:     { bg:'#020c18', text:'#e0f2fe', text2:'rgba(56,189,248,0.6)', accent:'#06b6d4', btn:'rgba(6,182,212,0.1)', btnHover:'rgba(6,182,212,0.18)', border:'rgba(56,189,248,0.12)', radius:14, font:'system-ui', aurora:true },
  rose:      { bg:'#1a0010', text:'#ffe4e6', text2:'rgba(251,113,133,0.6)', accent:'#f43f5e', btn:'rgba(244,63,94,0.1)', btnHover:'rgba(244,63,94,0.18)', border:'rgba(251,113,133,0.15)', radius:24, font:'"Georgia",serif', aurora:true },
  forest:    { bg:'#071a07', text:'#dcfce7', text2:'rgba(74,222,128,0.6)', accent:'#22c55e', btn:'rgba(34,197,94,0.1)', btnHover:'rgba(34,197,94,0.18)', border:'rgba(74,222,128,0.12)', radius:12, font:'system-ui' },
  aurora:    { bg:'#030112', text:'#e0e7ff', text2:'rgba(129,140,248,0.6)', accent:'#6366f1', btn:'rgba(99,102,241,0.12)', btnHover:'rgba(99,102,241,0.2)', border:'rgba(129,140,248,0.15)', radius:18, font:'system-ui', aurora:true },
  steel:     { bg:'#1a1f2e', text:'#c8d3e0', text2:'rgba(148,163,184,0.6)', accent:'#94a3b8', btn:'rgba(148,163,184,0.08)', btnHover:'rgba(148,163,184,0.14)', border:'rgba(148,163,184,0.1)', radius:8, font:'"IBM Plex Sans",sans-serif' },
  matrix:    { bg:'#000800', text:'#00ff41', text2:'rgba(0,255,65,0.5)', accent:'#00ff41', btn:'rgba(0,255,65,0.07)', btnHover:'rgba(0,255,65,0.13)', border:'rgba(0,255,65,0.12)', radius:4, font:'"Courier New",monospace' },
  nebula:    { bg:'#0d0520', text:'#f3e8ff', text2:'rgba(168,85,247,0.6)', accent:'#a855f7', btn:'rgba(168,85,247,0.1)', btnHover:'rgba(168,85,247,0.18)', border:'rgba(168,85,247,0.15)', radius:18, font:'system-ui', aurora:true },
  ember:     { bg:'#1c0800', text:'#ffedd5', text2:'rgba(249,115,22,0.6)', accent:'#f97316', btn:'rgba(249,115,22,0.1)', btnHover:'rgba(249,115,22,0.18)', border:'rgba(249,115,22,0.12)', radius:14, font:'system-ui' },
  arctic:    { bg:'#0a1628', text:'#e0f2fe', text2:'rgba(125,211,252,0.6)', accent:'#7dd3fc', btn:'rgba(125,211,252,0.08)', btnHover:'rgba(125,211,252,0.14)', border:'rgba(125,211,252,0.1)', radius:16, font:'system-ui', aurora:true },
  volcanic:  { bg:'#1a0505', text:'#fecaca', text2:'rgba(239,68,68,0.6)', accent:'#ef4444', btn:'rgba(239,68,68,0.08)', btnHover:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.12)', radius:10, font:'system-ui' },
  hex:       { bg:'#0f1923', text:'#e2e8f0', text2:'rgba(6,182,212,0.6)', accent:'#06b6d4', btn:'rgba(6,182,212,0.08)', btnHover:'rgba(6,182,212,0.14)', border:'rgba(6,182,212,0.1)', radius:0, font:'system-ui' },
  ivory:     { bg:'#fafafa', text:'#18181b', text2:'#71717a', accent:'#6366f1', btn:'rgba(0,0,0,0.05)', btnHover:'rgba(99,102,241,0.1)', border:'rgba(0,0,0,0.08)', radius:16, font:'"DM Sans",sans-serif' },
  editorial: { bg:'#fffbf5', text:'#1c1917', text2:'#78716c', accent:'#78716c', btn:'rgba(0,0,0,0.05)', btnHover:'rgba(0,0,0,0.09)', border:'rgba(0,0,0,0.07)', radius:4, font:'"Georgia",serif' },
  sky:       { bg:'#f0f9ff', text:'#0c4a6e', text2:'#0369a1', accent:'#0ea5e9', btn:'rgba(14,165,233,0.08)', btnHover:'rgba(14,165,233,0.15)', border:'rgba(14,165,233,0.12)', radius:18, font:'"DM Sans",sans-serif' },
  mint:      { bg:'#f0fdf4', text:'#14532d', text2:'#16a34a', accent:'#16a34a', btn:'rgba(22,163,74,0.08)', btnHover:'rgba(22,163,74,0.14)', border:'rgba(22,163,74,0.1)', radius:16, font:'system-ui' },
  lavender:  { bg:'#faf5ff', text:'#4c1d95', text2:'#7c3aed', accent:'#7c3aed', btn:'rgba(124,58,237,0.08)', btnHover:'rgba(124,58,237,0.14)', border:'rgba(124,58,237,0.1)', radius:18, font:'"DM Sans",sans-serif' },
  peach:     { bg:'#fff7ed', text:'#7c2d12', text2:'#ea580c', accent:'#ea580c', btn:'rgba(234,88,12,0.08)', btnHover:'rgba(234,88,12,0.14)', border:'rgba(234,88,12,0.1)', radius:16, font:'system-ui' },
  lemon:     { bg:'#fefce8', text:'#713f12', text2:'#ca8a04', accent:'#ca8a04', btn:'rgba(202,138,4,0.08)', btnHover:'rgba(202,138,4,0.14)', border:'rgba(202,138,4,0.1)', radius:14, font:'system-ui' },
  blush:     { bg:'#fdf2f8', text:'#831843', text2:'#db2777', accent:'#db2777', btn:'rgba(219,39,119,0.08)', btnHover:'rgba(219,39,119,0.14)', border:'rgba(219,39,119,0.1)', radius:24, font:'"Georgia",serif' },
  paper:     { bg:'#faf8f4', text:'#3d2b1f', text2:'#92400e', accent:'#92400e', btn:'rgba(146,64,14,0.06)', btnHover:'rgba(146,64,14,0.11)', border:'rgba(146,64,14,0.08)', radius:6, font:'"Georgia",serif' },
  geo:       { bg:'#f8fafc', text:'#1e293b', text2:'#475569', accent:'#6366f1', btn:'rgba(99,102,241,0.06)', btnHover:'rgba(99,102,241,0.12)', border:'rgba(99,102,241,0.08)', radius:0, font:'"Space Grotesk",sans-serif' },
  cream:     { bg:'#fdf6e3', text:'#3b2f1e', text2:'#b45309', accent:'#b45309', btn:'rgba(180,83,9,0.06)', btnHover:'rgba(180,83,9,0.11)', border:'rgba(180,83,9,0.08)', radius:12, font:'system-ui' },
  cloud:     { bg:'#f8f9ff', text:'#1e3a5f', text2:'#3b82f6', accent:'#3b82f6', btn:'rgba(59,130,246,0.07)', btnHover:'rgba(59,130,246,0.13)', border:'rgba(59,130,246,0.09)', radius:20, font:'"DM Sans",sans-serif' },
  sand:      { bg:'#fdf4e7', text:'#44260a', text2:'#d97706', accent:'#d97706', btn:'rgba(217,119,6,0.07)', btnHover:'rgba(217,119,6,0.13)', border:'rgba(217,119,6,0.1)', radius:12, font:'system-ui' },
  nordic:    { bg:'#f5f5f0', text:'#2d2d2a', text2:'#4b7bb5', accent:'#4b7bb5', btn:'rgba(75,123,181,0.07)', btnHover:'rgba(75,123,181,0.13)', border:'rgba(75,123,181,0.09)', radius:6, font:'system-ui' },
  sakura:    { bg:'#fff1f5', text:'#4a1530', text2:'#e11d79', accent:'#e11d79', btn:'rgba(225,29,121,0.07)', btnHover:'rgba(225,29,121,0.13)', border:'rgba(225,29,121,0.1)', radius:24, font:'"Georgia",serif' },
};

function getPostMedia(post: any): string[] {
  if (Array.isArray(post?.media_urls)) return post.media_urls;
  if (typeof post?.media_urls === 'string') {
    try {
      const parsed = JSON.parse(post.media_urls);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return post?.image_url ? [post.image_url] : [];
}

function hasMeaningfulHtml(html?: string): boolean {
  if (!html) return false;
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.length > 0;
}

function normalizeEmbedHtml(html?: string): string {
  if (!html) return '';
  return html.replace(
    /src="https?:\/\/(?:(?:www|m|music)\.)?(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/live\/|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})[^"]*"/gi,
    'src="https://www.youtube.com/embed/$1"',
  );
}

function Countdown({ expiresAt, accent }: { expiresAt: string; accent: string }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setLabel(''); return; }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setLabel(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [expiresAt]);
  if (!label) return null;
  const urgent = (new Date(expiresAt).getTime() - Date.now()) < 3600000;
  return <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:900, color: urgent ? '#ff4444' : '#00ff41', background:'rgba(0,0,0,0.4)', padding:'2px 8px', borderRadius:4 }}>⏱ {label}</span>;
}

export default function SitePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const { site, loading, notFound } = usePublicSite(slug);
  const { user, loading: authLoading } = useAuth();
  const { add: addToCart, open: openCart } = useCart();
  const [links, setLinks] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [cvUnlocked, setCvUnlocked] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string|null>(null);
  const customTickerItems: { label: string; url: string }[] = (() => {
    const raw = (site as any)?.ticker_items;
    try {
      if (Array.isArray(raw)) return raw.filter((x: any) => x?.label && x?.url);
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x: any) => x?.label && x?.url);
      }
    } catch {}
    return [];
  })();
  const tickerEnabled = (site as any)?.ticker_enabled !== false;

  const t = (site?.theme && THEMES[site.theme]) ? THEMES[site.theme] : THEMES.midnight;
  const accent = site?.accent_color || t.accent;
  const isOwner = user?.id === site?.user_id;
  const isAdminViewer = (user?.email || '').toLowerCase() === 'arytcf@gmail.com';
  const canManageFeed = isOwner || isAdminViewer || ((user?.email || '').toLowerCase() === (site?.contact_email || '').toLowerCase());
  const T = useT();
  const feedCols: 1|2|3 = (site as any)?.feed_cols || 1;
  const photoSizeMap: Record<string,number> = { sm:72, md:96, lg:128, xl:160 };
  const avatarSize = photoSizeMap[(site as any)?.photo_size || 'md'] || 96;
  const rawTextColor = (site as any)?.text_color;
  const textColorOverride = rawTextColor && rawTextColor !== '' && rawTextColor !== 'auto' ? rawTextColor : null;
  const textMain  = textColorOverride || t.text;
  const textSub   = textColorOverride ? textColorOverride + 'bb' : t.text2;
  const moduleOrder: string[] = (() => {
    try { return JSON.parse((site as any)?.module_order || '["links","videos","cv","feed"]'); }
    catch { return ['links','videos','cv','feed']; }
  })();
  const pageModulesMap: Record<string, string[]> = (() => {
    try {
      const parsed = JSON.parse((site as any)?.page_modules || '{}');
      if (parsed && typeof parsed === 'object') {
        const out: Record<string, string[]> = {};
        Object.entries(parsed).forEach(([pageId, raw]: any) => {
          if (Array.isArray(raw)) out[pageId] = raw;
          else out[pageId] = Array.isArray(raw?.modules) ? raw.modules : [];
        });
        return out;
      }
    } catch {}
    return { home: moduleOrder };
  })();
  const pageColumnsMap: Record<string, 1|2|3> = (() => {
    try {
      const parsed = JSON.parse((site as any)?.page_modules || '{}');
      if (parsed && typeof parsed === 'object') {
        const out: Record<string, 1|2|3> = {};
        Object.entries(parsed).forEach(([pageId, raw]: any) => {
          const c = Number(raw?.columns);
          out[pageId] = [1,2,3].includes(c) ? (c as 1|2|3) : 1;
        });
        return out;
      }
    } catch {}
    return { home: 1 };
  })();
  const pageModuleColumnsMap: Record<string, Record<string, 1|2|3>> = (() => {
    try {
      const parsed = JSON.parse((site as any)?.page_modules || '{}');
      if (parsed && typeof parsed === 'object') {
        const out: Record<string, Record<string, 1|2|3>> = {};
        Object.entries(parsed).forEach(([pageId, raw]: any) => {
          out[pageId] = {
            links: [1,2,3].includes(Number(raw?.moduleColumns?.links)) ? Number(raw.moduleColumns.links) as 1|2|3 : 1,
            videos: [1,2,3].includes(Number(raw?.moduleColumns?.videos)) ? Number(raw.moduleColumns.videos) as 1|2|3 : 1,
            cv: [1,2,3].includes(Number(raw?.moduleColumns?.cv)) ? Number(raw.moduleColumns.cv) as 1|2|3 : 1,
            feed: [1,2,3].includes(Number(raw?.moduleColumns?.feed)) ? Number(raw.moduleColumns.feed) as 1|2|3 : 1,
          };
        });
        return out;
      }
    } catch {}
    return { home: { links: 1, videos: 1, cv: 1, feed: 1 } };
  })();
  const sitePages: {id:string;label:string;template?:'default'|'videos_3'|'videos_4'}[] = (() => {
    try { return JSON.parse((site as any)?.site_pages || '[{"id":"home","label":"Home","template":"default"}]'); }
    catch { return [{id:'home',label:'Home',template:'default'}]; }
  })();
  const [activePage, setActivePage] = useState('home');
  const [pageContents, setPageContents] = useState<Record<string,string>>({});
  const activeModules = pageModulesMap[activePage] || (activePage === 'home' ? moduleOrder : []);
  const activeColumns = pageColumnsMap[activePage] || 1;
  const activeModuleCols = pageModuleColumnsMap[activePage] || { links: 1, videos: 1, cv: 1, feed: 1 };
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '' });
  const [subActive, setSubActive] = useState(false);
  const [trialCountdown, setTrialCountdown] = useState('');
  const [warningHours, setWarningHours] = useState(1);
  const [testRibbonText, setTestRibbonText] = useState('TEST MODE');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const warnedOneHour = useRef(false);
  const hostRedirectDone = useRef(false);
  useEffect(() => {
    if (!site) return;
    try { setPageContents(JSON.parse((site as any)?.page_contents || '{}')); }
    catch { setPageContents({}); }
  }, [site]);
  useEffect(() => {
    if (!site?.slug || typeof window === 'undefined' || hostRedirectDone.current) return;
    const host = window.location.hostname;
    const canonical = `${site.slug}.trustbank.xyz`;
    const manageMode = new URLSearchParams(window.location.search).get('manage') === '1';
    if (!manageMode && (host === 'trustbank.xyz' || host === 'www.trustbank.xyz') && window.location.pathname.startsWith('/s/')) {
      hostRedirectDone.current = true;
      window.location.replace(`https://${canonical}`);
    }
  }, [site?.slug]);
  useEffect(() => {
    if (!sitePages.length) return;
    if (!sitePages.find(p => p.id === activePage)) {
      setActivePage(sitePages[0].id);
    }
  }, [sitePages, activePage]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setUtm({
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
    });
  }, []);
  const isDark = !['ivory','editorial','sky','mint','lavender','peach','lemon','blush','paper','geo','cream','cloud','sand','nordic','sakura'].includes(site?.theme||'');

  // Auto-open cart if returning from auth with items pending
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('unlock') === 'cv' && user && site) {
      addToCart({ id:`cv_${site.id}`, label:`CV: ${site.site_name}`, price: site?.cv_price||20, type:'plan' });
      openCart();
      // Remove param from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user, site]);

  useEffect(() => {
    if (!site?.id || !site.published || authLoading) return;
    if (user?.id === site.user_id) return;
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    const device = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    (supabase as any).from('site_visits').insert({
      site_id: site.id,
      slug: site.slug,
      referrer: ref?.slice(0, 500) || null,
      device: device?.slice(0, 200) || null,
      utm_source: utm.source || null,
      utm_medium: utm.medium || null,
      utm_campaign: utm.campaign || null,
    }).then(() => {});
  }, [site?.id, site?.published, site?.slug, site?.user_id, user?.id, authLoading, utm.source, utm.medium, utm.campaign]);

  useEffect(() => {
    if (!site?.id) return;
    supabase.from('mini_site_links').select('*').eq('site_id', site.id).order('sort_order').then(r => setLinks(r.data||[]));
    supabase.from('mini_site_videos').select('*').eq('site_id', site.id).order('sort_order').then(r => setVideos(r.data||[]));
    const now = new Date().toISOString();
    (supabase as any).from('feed_posts').select('*').eq('site_id', site.id)
      .or(`pinned.eq.true,expires_at.gt.${now}`)
      .order('pinned',{ascending:false}).order('created_at',{ascending:false}).limit(20)
      .then((r:any) => setPosts(r.data||[]));
    if (user) {
      (supabase as any).from('paywall_unlocks').select('id').eq('user_id',user.id).eq('video_id',site.id).maybeSingle()
        .then(({data}:any) => { if (data) setCvUnlocked(true); });
    }
  }, [site?.id, user]);

  useEffect(() => {
    if (!isOwner || !site?.user_id || !user?.id) return;
    supabase.from('subscriptions' as any).select('expires_at').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      const active = !!(data?.expires_at && new Date(data.expires_at) > new Date());
      setSubActive(active);
    });
  }, [isOwner, site?.user_id, user?.id]);

  useEffect(() => {
    (supabase as any).from('platform_settings').select('key,value').in('key', ['warning_hours', 'test_ribbon_text']).then(({ data }: any) => {
      (data || []).forEach((s: any) => {
        if (s.key === 'warning_hours') setWarningHours(Math.max(1, Number(s.value) || 1));
        if (s.key === 'test_ribbon_text') setTestRibbonText(s.value || 'TEST MODE');
      });
    });
  }, []);

  useEffect(() => {
    if (!isOwner || subActive) return;
    if (!(site as any)?.trial_publish_until) return;
    const tick = () => {
      const diff = new Date((site as any).trial_publish_until).getTime() - Date.now();
      if (diff <= 0) { setTrialCountdown('00:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTrialCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      if (diff <= warningHours * 3600000 && !warnedOneHour.current) {
        warnedOneHour.current = true;
        toast.error(`${warningHours} hour(s) left in trial. Subscribe monthly or yearly (discount) to stay online.`);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOwner, subActive, (site as any)?.trial_publish_until, warningHours]);

  const handleCvUnlock = () => {
    if (!user) { 
      // Save current page so we come back after login
      const returnUrl = window.location.pathname + '?unlock=cv';
      window.location.href = '/auth?redirect=' + encodeURIComponent(returnUrl);
      return; 
    }
    addToCart({ id:`cv_${site!.id}`, label:`CV: ${site!.site_name}`, price: site?.cv_price||20, type:'plan' });
    openCart();
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:40,height:40,border:'3px solid #818cf8',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,fontFamily:'system-ui'}}>
      <p style={{fontSize:64,margin:0}}>🔍</p>
      <h1 style={{color:'#e6edf3',fontSize:24,fontWeight:900,margin:0}}>/{slug} not found</h1>
      <a href="/slugs" style={{padding:'12px 28px',borderRadius:14,background:'#818cf8',color:'#fff',fontWeight:700,textDecoration:'none'}}>Claim /{slug}</a>
    </div>
  );

  if (!site) return null;

  if (!site.published && !isOwner) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui', padding: 24 }}>
        <p style={{ fontSize: 56, margin: 0 }}>🔒</p>
        <h1 style={{ color: '#e6edf3', fontSize: 22, fontWeight: 900, margin: 0, textAlign: 'center' }}>This profile is not online yet</h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, maxWidth: 360, textAlign: 'center', margin: 0 }}>
          The creator needs to activate a plan to appear publicly on TrustBank.
        </p>
        <Link href="/planos" style={{ padding: '12px 24px', borderRadius: 14, background: '#818cf8', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
          View plans
        </Link>
        <Link href="/" style={{ color: '#818cf8', fontSize: 13 }}>Back to home</Link>
      </div>
    );
  }

  // Background
  const pageBg = t.bg;
  const r = Number(t.radius) || 16;

  const pageMaxWidth = Math.max(580, Number((site as any)?.page_width || 580));
  const activePageTemplate = sitePages.find(p => p.id === activePage)?.template || 'default';

  return (
    <div style={{minHeight:'100vh',background:pageBg,fontFamily:t.font,position:'relative',overflowX:'hidden'}}>
      {/* Aurora glow */}
      {t.aurora && <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,background:`radial-gradient(ellipse at 30% 20%,${accent}22 0%,transparent 55%),radial-gradient(ellipse at 70% 80%,${accent}14 0%,transparent 55%)`}}/>}

      {/* Slug ticker */}
      <SlugTicker siteUserId={site.user_id} customItems={customTickerItems} enabled={tickerEnabled} />

      {Boolean((site as any)?.trial_publish_until && !subActive) && (
        <div style={{
          position:'fixed', top: 30, right: 12, zIndex: 20, padding:'6px 10px', borderRadius: 999,
          background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', fontSize:11, fontWeight:900, letterSpacing:0.3,
        }}>
          {testRibbonText}
        </div>
      )}

      {isOwner && !site.published && (
        <div style={{
          margin: '0 auto', maxWidth: 580, padding: '12px 16px', borderRadius: 14,
          background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(234,88,12,0.15))',
          border: '1px solid rgba(245,158,11,0.45)', color: t.text, fontSize: 13, fontWeight: 700, textAlign: 'center', zIndex: 5, position: 'relative',
        }}>
          Stay online: pay for a plan and appear to the world →{' '}
          <Link href="/planos" style={{ color: accent, textDecoration: 'underline' }}>Plans</Link>
        </div>
      )}

      {/* Banner — acima do feed visual; avatar sobrepõe com z-index */}
      {site.banner_url && (
        <div style={{width:'100%',height:220,maxHeight:'42vh',overflow:'hidden',position:'relative',flexShrink:0,zIndex:1,background:pageBg}}>
          <img src={site.banner_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${(site as any).banner_focus_x ?? 50}% ${(site as any).banner_focus_y ?? 50}%`,display:'block',verticalAlign:'top'}}/>
        </div>
      )}

      {/* Content */}
      <div style={{maxWidth:pageMaxWidth,margin:'0 auto',padding: site.banner_url ? '0 20px 80px' : '48px 20px 80px',position:'relative',zIndex:1}}>

        {/* ── Profile ── */}
        <div style={{textAlign:'center',marginBottom:32,marginTop: site.banner_url ? -(avatarSize/2 + 6) : 0, position:'relative', zIndex:2}}>

          {/* Avatar ring */}
          <div style={{display:'inline-block',padding:3,borderRadius: site.photo_shape==='round'?'50%': site.photo_shape==='square'?20:32,background:`linear-gradient(135deg,${accent},${accent}60,transparent)`,marginBottom:14}}>
            {site.avatar_url
              ? <img src={site.avatar_url} alt={site.site_name} style={{width:avatarSize,height:avatarSize,borderRadius: site.photo_shape==='round'?'50%': site.photo_shape==='square'?Math.round(avatarSize*0.16):Math.round(avatarSize*0.28),objectFit:'cover',display:'block',border:`3px solid ${pageBg}`}}/>
              : <div style={{width:avatarSize,height:avatarSize,borderRadius:'50%',background:`linear-gradient(135deg,${accent},${accent}80)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(avatarSize*0.42),fontWeight:900,color:'#fff',border:`3px solid ${pageBg}`}}>{site.site_name?.[0]?.toUpperCase()}</div>}
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:4}}>
            <h1 style={{margin:0,fontSize:26,fontWeight:900,color:t.text,letterSpacing:'-0.02em',lineHeight:1.1}}>{site.site_name}</h1>
            {site.is_verified && <CheckCircle style={{width:20,height:20,color:'#60a5fa',flexShrink:0}}/>}
          </div>

          {site.cv_headline && <p style={{margin:'0 0 6px',fontSize:15,color:accent,fontWeight:700}}>{site.cv_headline}</p>}
          {site.bio && <p style={{margin:'0 0 16px',fontSize:15,color:textSub,lineHeight:1.7,maxWidth:440,marginLeft:'auto',marginRight:'auto'}}>{site.bio}</p>}

          {isOwner && <div style={{marginBottom:14}}><EarningsWidget userId={site.user_id} accentColor={accent} compact/></div>}

          <ShareWidget slug={slug} siteName={site.site_name} accentColor={accent}/>
        </div>

        {/* ── Multi-page menu ── */}
        {sitePages.length > 1 && (
          <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:24,flexWrap:'wrap'}}>
            {sitePages.map(page => (
              <button key={page.id} onClick={() => setActivePage(page.id)}
                style={{
                  padding:'8px 20px', borderRadius:999, fontSize:13, fontWeight:700,
                  border:`1.5px solid ${activePage===page.id ? accent : t.border}`,
                  background: activePage===page.id ? accent : t.btn,
                  color: activePage===page.id ? '#fff' : t.text,
                  cursor:'pointer', transition:'all .2s',
                }}>
                {page.label}
              </button>
            ))}
          </div>
        )}

        {/* ── DYNAMIC MODULE ORDER ── */}
        {(() => {
          const renderModule = (mod: string) => {
          if (mod === 'links' && links.length > 0) return (
            <div key="links" style={{display:'flex',flexDirection:'column',gap:12,marginBottom:32}}>
              {links.map((link:any) => {
                const brand = BRANDS[link.icon] || BRANDS.link;
                const isHov = hoveredLink === link.id;
                const hasColor = link.color && link.color !== 'default';
                const btnBg = hasColor
                  ? link.color
                  : isHov ? t.btnHover : t.btn;
                const linkTextColor = hasColor ? '#fff' : t.text;
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener"
                    onMouseEnter={() => setHoveredLink(link.id)}
                    onMouseLeave={() => setHoveredLink(null)}
                    onClick={() => {
                      (supabase as any).from('site_link_clicks').insert({
                        site_id: site.id,
                        link_id: link.id,
                        slug: site.slug,
                        destination_url: link.url,
                        utm_source: utm.source || null,
                        utm_medium: utm.medium || null,
                        utm_campaign: utm.campaign || null,
                      }).then(() => {});
                    }}
                    style={{
                      display:'flex', alignItems:'center', gap:0,
                      height:56, borderRadius:r, overflow:'hidden',
                      border:`1.5px solid ${isHov ? accent+'50' : t.border}`,
                      background: btnBg, textDecoration:'none',
                      transition:'all .18s', transform: isHov ? 'translateY(-2px) scale(1.01)' : 'none',
                      boxShadow: isHov ? `0 8px 32px ${accent}25` : 'none',
                      cursor:'pointer', position:'relative',
                    }}>
                    <div style={{width:52,height:52,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:brand.bg,borderRight:`1px solid rgba(255,255,255,0.1)`}}>
                      {brand.path
                        ? <svg viewBox="0 0 24 24" width={20} height={20} style={{display:'block',fill:brand.color}}><path d={brand.path}/></svg>
                        : <span style={{fontSize:18,color:brand.color}}>🔗</span>}
                    </div>
                    <span style={{flex:1,textAlign:'center',fontSize:16,fontWeight:700,color:linkTextColor,paddingLeft:8,paddingRight:48}}>{link.title}</span>
                    <div style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',opacity:isHov?0.7:0.25,transition:'opacity .18s'}}>
                      <ExternalLink style={{width:15,height:15,color:t.text}}/>
                    </div>
                  </a>
                );
              })}
            </div>
          );
          if (mod === 'cv' && site.show_cv) return (
            <div key="cv" style={{marginBottom:32}}>
              {(site.cv_locked && !cvUnlocked) ? (
                <div style={{padding:20,borderRadius:r,border:`1.5px solid ${accent}35`,background:`${accent}0a`}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <Lock style={{width:16,height:16,color:accent}}/>
                        <span style={{fontWeight:800,color:t.text,fontSize:16}}>CV / Resume</span>
                      </div>
                      {site.cv_headline && <p style={{color:t.text2,fontSize:13,margin:0}}>{site.cv_headline}</p>}
                    </div>
                    <button onClick={handleCvUnlock} style={{padding:'11px 22px',borderRadius:999,background:`linear-gradient(135deg,${accent},${accent}cc)`,color:'#fff',fontWeight:800,fontSize:13,border:'none',cursor:'pointer',whiteSpace:'nowrap'}}>
                      🔓 ${site.cv_price||20} USDC (unlock contacts)
                    </button>
                  </div>
                </div>
              ) : null}
              <div style={{padding:20,borderRadius:r,border:`1.5px solid ${t.border}`,background:t.btn,marginTop:(site.cv_locked && !cvUnlocked) ? 10 : 0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <Unlock style={{width:16,height:16,color:'#22c55e'}}/>
                  <span style={{fontWeight:800,color:t.text,fontSize:16}}>CV / Resume</span>
                </div>
                <CVView
                  data={{
                    show_cv: !!site.show_cv,
                    cv_free: !!(site as any).cv_free,
                    cv_price: Number(site.cv_price || 20),
                    cv_headline: site.cv_headline || '',
                    cv_location: (site as any).cv_location || '',
                    cv_content: site.cv_content || '',
                    cv_skills: site.cv_skills || [],
                    cv_experience: (site as any).cv_experience || [],
                    cv_education: (site as any).cv_education || [],
                    cv_projects: (site as any).cv_projects || [],
                    cv_languages: (site as any).cv_languages || [],
                    cv_certificates: (site as any).cv_certificates || [],
                    contact_email: (site.cv_locked && !cvUnlocked) ? '' : ((site as any).contact_email || ''),
                    cv_contact_whatsapp: (site.cv_locked && !cvUnlocked) ? '' : ((site as any).cv_contact_whatsapp || ''),
                    cv_hire_price: Number((site as any).cv_hire_price || 0),
                    cv_hire_currency: (site as any).cv_hire_currency || 'USD',
                    cv_hire_type: (site as any).cv_hire_type || 'hour',
                    section_order: (site as any).section_order || ['summary','experience','education','skills','projects','languages','certificates','contact'],
                  }}
                  accentColor={accent}
                />
              </div>
            </div>
          );
          if (mod === 'videos' && videos.length > 0) return (
            <div key="videos" style={{marginBottom:32}}>
              <h2 style={{color:t.text,fontSize:16,fontWeight:800,margin:'0 0 12px',display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:24,height:24,borderRadius:6,background:'#ff0000',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
                  <Play style={{width:12,height:12,fill:'#fff',color:'#fff',marginLeft:2}}/>
                </span>
                Videos
              </h2>
              <div style={{display:'grid',gridTemplateColumns:videos.length===1?'1fr':'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
                {videos.map((v:any) => (
                  <div key={v.id} style={{borderRadius:r,overflow:'hidden',border:`1.5px solid ${t.border}`}}>
                    <SecureVideoPlayer videoId={v.id} title={v.title} paywallEnabled={v.paywall_enabled} paywallPrice={v.paywall_price} accentColor={accent} siteSlug={slug}/>
                    {v.title && <div style={{padding:'8px 12px',background:t.btn}}><p style={{margin:0,fontWeight:700,fontSize:13,color:t.text}}>{v.title}</p></div>}
                  </div>
                ))}
              </div>
            </div>
          );
          if (mod === 'feed' && (site as any).show_feed !== false) return (
            <div key="feed" style={{marginBottom:32}}>
              {/* Owner composer */}
              {isOwner && site.id && activeModules.includes('feed') && (
                <FeedSection siteId={site.id} isOwner={isOwner} accentColor={accent} isDark={isDark} textColor={textMain} onPost={() => {
                  const now = new Date().toISOString();
                  (supabase as any).from('feed_posts').select('*').eq('site_id', site.id)
                    .or(`pinned.eq.true,expires_at.gt.${now}`)
                    .order('pinned',{ascending:false}).order('created_at',{ascending:false}).limit(20)
                    .then((r:any) => setPosts(r.data||[]));
                }}/>
              )}
              {/* Pinned posts — outside window, highlighted */}
              {posts.filter((p:any) => p.pinned).map((p:any) => (
                <div key={p.id} style={{padding:'14px 16px',borderRadius:r,border:`2px solid ${accent}`,background:`${accent}10`,marginBottom:10}}>
                  <p style={{color:accent,fontSize:11,fontWeight:800,margin:'0 0 6px'}}>📌 FIXADO</p>
                  <p style={{margin:0,color:t.text,fontSize:14,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{p.text}</p>
                  {getPostMedia(p).length > 0 && (
                    <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(getPostMedia(p).length, 3)}, minmax(0,1fr))`,gap:8,marginTop:8}}>
                      {getPostMedia(p).slice(0, 3).map((url:string, i:number) => (
                        <img key={i} src={url} onClick={() => setLightboxImage(url)} style={{width:'100%',aspectRatio:'1 / 1',borderRadius:8,objectFit:'contain',background:'rgba(0,0,0,0.08)',cursor:'zoom-in'}}/>
                      ))}
                    </div>
                  )}
                  {p.video_embed_url && (
                    <div style={{marginTop:8,borderRadius:8,overflow:'hidden'}}>
                      <iframe src={p.video_embed_url} width="100%" height="215" allowFullScreen style={{border:'none',display:'block'}} />
                    </div>
                  )}
                  {(canManageFeed || user?.id === p.user_id) && (
                    <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
                      <button
                        onClick={async () => {
                          const ok = window.confirm('Delete this post?');
                          if (!ok) return;
                          await (supabase as any).from('feed_posts').delete().eq('id', p.id).eq('site_id', site.id);
                          const now = new Date().toISOString();
                          (supabase as any).from('feed_posts').select('*').eq('site_id', site.id)
                            .or(`pinned.eq.true,expires_at.gt.${now}`)
                            .order('pinned',{ascending:false}).order('created_at',{ascending:false}).limit(20)
                            .then((r:any) => setPosts(r.data||[]));
                        }}
                        style={{fontSize:11,padding:'6px 10px',borderRadius:8,border:`1px solid ${t.border}`,background:'transparent',color:'#f87171',cursor:'pointer'}}
                      >
                        Delete post
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {/* Feed window (Instagram-like) */}
              {posts.filter((p:any) => !p.pinned).length > 0 && (
                <div style={{width:'100%',maxWidth:550,margin:'0 auto'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <h2 style={{color:t.text,fontSize:14,fontWeight:800,margin:0}}>{T('site_posts')}</h2>
                    <span style={{fontSize:11,color:t.text2}}>{posts.filter((p:any)=>!p.pinned).length} posts</span>
                  </div>
                  {/* Feed window 550x550 com scroll interno */}
                  <div style={{
                    width:'100%',
                    height:550,
                    overflowY:'scroll',
                    overflowX:'hidden',
                    display:'flex',
                    flexDirection:'column',
                    gap:10,
                    padding:'4px 8px 4px 4px',
                    border:`1.5px solid ${t.border}`,
                    borderRadius:r,
                    background:t.btn,
                    scrollbarWidth:'thin',
                    scrollbarColor:`${accent}40 transparent`,
                  }}>
                    {posts.filter((p:any) => !p.pinned).map((p:any) => (
                      <div key={p.id} style={{
                        padding:'14px 16px',
                        borderRadius:Math.max(r-4,6),
                        border:`1.5px solid ${t.border}`,
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        flexShrink:0,
                      }}>
                        <p style={{margin:0,color:t.text,fontSize:14,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{p.text}</p>
                        {getPostMedia(p).length > 0 && (
                          <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(getPostMedia(p).length, 3)}, minmax(0,1fr))`,gap:8,marginTop:8}}>
                            {getPostMedia(p).slice(0, 3).map((url:string, i:number) => (
                              <img key={i} src={url} onClick={() => setLightboxImage(url)} style={{width:'100%',aspectRatio:'1 / 1',borderRadius:8,objectFit:'contain',background:'rgba(0,0,0,0.08)',cursor:'zoom-in'}}/>
                            ))}
                          </div>
                        )}
                        {p.video_embed_url && (
                          <div style={{marginTop:8,borderRadius:8,overflow:'hidden'}}>
                            <iframe src={p.video_embed_url} width="100%" height="215" allowFullScreen style={{border:'none',display:'block'}} />
                          </div>
                        )}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8,paddingTop:6,borderTop:`1px solid ${t.border}`}}>
                          <span style={{fontSize:10,color:t.text2}}>{new Date(p.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            {p.expires_at && <Countdown expiresAt={p.expires_at} accent={accent}/>}
                            {(canManageFeed || user?.id === p.user_id) && (
                              <button
                                onClick={async () => {
                                  const ok = window.confirm('Delete this post?');
                                  if (!ok) return;
                                  await (supabase as any).from('feed_posts').delete().eq('id', p.id).eq('site_id', site.id);
                                  const now = new Date().toISOString();
                                  (supabase as any).from('feed_posts').select('*').eq('site_id', site.id)
                                    .or(`pinned.eq.true,expires_at.gt.${now}`)
                                    .order('pinned',{ascending:false}).order('created_at',{ascending:false}).limit(20)
                                    .then((r:any) => setPosts(r.data||[]));
                                }}
                                style={{fontSize:10,padding:'4px 8px',borderRadius:8,border:`1px solid ${t.border}`,background:'transparent',color:'#f87171',cursor:'pointer'}}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
          return null;
          };

          if (activeColumns <= 1) {
            return activeModules.map((mod) => renderModule(mod));
          }

          const columns: Record<number, string[]> = { 1: [], 2: [], 3: [] };
          activeModules.forEach((mod) => {
            const c = activeModuleCols[mod] || 1;
            columns[c].push(mod);
          });

          return (
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${activeColumns}, minmax(0,1fr))`, gap:16, marginBottom:12 }}>
              {Array.from({ length: activeColumns }).map((_, idx) => {
                const col = idx + 1;
                return (
                  <div key={`col_${col}`} style={{ minWidth: 0 }}>
                    {columns[col].map((mod) => renderModule(mod))}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {activePageTemplate !== 'default' && videos.length > 0 && (
          <div style={{marginBottom:32}}>
            <h2 style={{color:t.text,fontSize:16,fontWeight:800,margin:'0 0 12px'}}>Video Wall</h2>
            <div style={{
              display:'grid',
              gridTemplateColumns: activePageTemplate === 'videos_4'
                ? 'repeat(4,minmax(0,1fr))'
                : 'repeat(3,minmax(0,1fr))',
              gap:10,
            }}>
              {videos.map((v:any) => (
                <div key={`wall_${v.id}`} style={{borderRadius:r,overflow:'hidden',border:`1.5px solid ${t.border}`}}>
                  <SecureVideoPlayer videoId={v.id} title={v.title} paywallEnabled={v.paywall_enabled} paywallPrice={v.paywall_price} accentColor={accent} siteSlug={slug}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current page rich content */}
        {hasMeaningfulHtml(pageContents[activePage]) && (
          <div style={{paddingBottom:24}}>
            <div
              dangerouslySetInnerHTML={{ __html: normalizeEmbedHtml(pageContents[activePage]) }}
              style={{ fontSize:15, lineHeight:1.8, color:textMain, padding:'4px 0', maxWidth:(site as any)?.page_width||600, margin:'0 auto', width:'100%' }}
              className="rich-content"
            />
          </div>
        )}

        {/* Empty state for custom pages */}
        {activePage !== 'home' && !hasMeaningfulHtml(pageContents[activePage]) && (
          <div style={{paddingBottom:32}}>
            {isOwner ? (
              <div style={{textAlign:'center',padding:'40px 0',border:`1.5px dashed ${t.border}`,borderRadius:16}}>
                <p style={{fontSize:32,marginBottom:8}}>✏️</p>
                <p style={{fontSize:14,color:t.text2,marginBottom:12}}>{T("page_no_content") || "Add content in the editor"}</p>
                <a href="/editor" style={{color:accent,fontSize:13,fontWeight:700}}>{T("open_editor") || "Open Editor"} →</a>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'40px 0',color:t.text2}}>
                <p style={{fontSize:32,marginBottom:8}}>📝</p>
                <p style={{fontSize:14}}>{T("coming_soon") || "Coming soon"}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign:'center',paddingTop:8}}>
          <a href="https://trustbank.xyz" target="_blank" rel="noopener"
            style={{fontSize:12,color:t.text2,opacity:.3,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:5,transition:'opacity .2s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.opacity='0.6'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.opacity='0.3'}}>
            <span style={{width:14,height:14,background:accent,borderRadius:3,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'#fff'}}>T</span>
            trustbank.xyz
          </a>
        </div>
        {isOwner && !subActive && Boolean((site as any)?.trial_publish_until) && (
          <div style={{
            position:'fixed', left:12, right:12, bottom:12, zIndex:30, padding:'10px 14px', borderRadius:12,
            background:'rgba(0,0,0,0.82)', border:'1px solid rgba(245,158,11,0.4)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap',
          }}>
            <span style={{ fontSize:12, fontWeight:700 }}>
              Trial active: {trialCountdown || '--:--:--'} · then it moves to draft
            </span>
            <a href="/planos" style={{ color:'#fbbf24', fontSize:12, fontWeight:800, textDecoration:'underline' }}>
              Subscribe monthly or yearly (discount)
            </a>
          </div>
        )}
        {lightboxImage && (
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position:'fixed', inset:0, zIndex:120, background:'rgba(0,0,0,0.88)',
              border:'none', padding:20, cursor:'zoom-out', display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >
            <img src={lightboxImage} style={{maxWidth:'95vw',maxHeight:'92vh',objectFit:'contain',borderRadius:10}} />
          </button>
        )}
      </div>
      <style>{`*{box-sizing:border-box}body{margin:0}@keyframes spin{to{transform:rotate(360deg)}}
      .rich-content img{max-width:100%;height:auto;border-radius:10px;display:block;margin:10px 0}
      .rich-content iframe{max-width:100%;width:100%;min-height:240px;border:0;border-radius:12px;display:block;margin:10px 0}
      .rich-content .trust-video-wrapper{position:relative;padding-bottom:56.25%;height:0;margin:12px 0;border-radius:12px;overflow:hidden}
      .rich-content .trust-video-wrapper iframe{position:absolute;inset:0;width:100%;height:100%}
      .rich-content .tb-paper{padding:14px 16px;border-radius:12px;margin:10px 0;border:1px solid rgba(255,255,255,.15)}
      .rich-content .tb-paper-yellow{
        background:repeating-linear-gradient(180deg, rgba(180,83,9,.12) 0 1px, transparent 1px 28px),linear-gradient(180deg,#fef3c7,#fde68a);
        color:#5b3a09;border-color:#f59e0b66
      }
      .rich-content .tb-paper-white{background:#ffffff;color:#111827;border-color:#d1d5db}
      .rich-content .tb-paper-map{
        background:radial-gradient(circle at 20% 30%, rgba(56,189,248,.25), transparent 40%),radial-gradient(circle at 80% 70%, rgba(251,113,133,.25), transparent 45%),linear-gradient(135deg,#ecfeff,#f0fdf4,#fff7ed);
        color:#134e4a;border-color:#99f6e4
      }
      .rich-content .tb-paper-dark{background:linear-gradient(135deg,#0f172a,#1e1b4b);color:#e2e8f0;border-color:#4f46e5}
      `}</style>
    </div>
  );
}
