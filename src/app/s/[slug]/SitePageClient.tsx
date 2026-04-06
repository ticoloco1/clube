'use client';
import { usePublicSite, type MiniSite } from '@/hooks/useSite';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { toast } from 'sonner';
import { EarningsWidget } from '@/components/ui/EarningsWidget';
import { SecureVideoPlayer } from '@/components/site/SecureVideoPlayer';
import { TrustBankShareModal } from '@/components/ui/TrustBankShareModal';
import { SlugTicker } from '@/components/ui/SlugTicker';
import { FeedSection } from '@/components/site/FeedSection';
import { MiniSiteAdsPanel } from '@/components/site/MiniSiteAdsPanel';
import { SiteFollowButton } from '@/components/site/SiteFollowButton';
import { LivelyAvatarWidget } from '@/components/site/LivelyAvatarWidget';
import { AvatarTiltShell } from '@/components/site/AvatarTiltShell';
import { CentralProfileMagicAvatar } from '@/components/site/CentralProfileMagicAvatar';
import { MagicPortraitOutOfFrame } from '@/components/site/MagicPortraitOutOfFrame';
import { SiteBookingWidget } from '@/components/site/SiteBookingWidget';
import { SiteSlugMarketPanel } from '@/components/site/SiteSlugMarketPanel';
import { SiteClassifiedsPanel } from '@/components/site/SiteClassifiedsPanel';
import { resolvePublicSiteFaceUrl } from '@/lib/floatingAgentImage';
import { normalizeLivelyTtsProvider } from '@/lib/livelyTtsPreference';
import { CentralProfileSpeakingAvatar } from '@/components/site/CentralProfileSpeakingAvatar';
import { CVView } from '@/components/editor/CVEditor';
import { useT } from '@/lib/i18n';
import { DIRECTORY_PROFILE_I18N_KEYS } from '@/lib/directoryProfileLabels';
import { PLATFORM_USD } from '@/lib/platformPricing';
import { hasDisplayableRichHtml, normalizeRichEmbeds, youtubeWatchUrlToEmbedUrl } from '@/lib/embedHtml';
import { trackSiteVisit, trackLinkClick, trackPageView } from '@/lib/publicAnalytics';
import { FeedPostImpression } from '@/components/site/FeedPostImpression';
import { Lock, Unlock, Shield, Clock, CheckCircle, ExternalLink, Play, Users, MessageCircle } from 'lucide-react';
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

// ─── Mini-site themes (bg = page fill; accent often contrasts for links/buttons) ─
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
  cyber_violet:{ bg:'#0a0518', text:'#f5e6ff', text2:'rgba(196,181,253,0.65)', accent:'#c084fc', btn:'rgba(192,132,252,0.12)', btnHover:'rgba(192,132,252,0.22)', border:'rgba(167,139,250,0.35)', radius:18, font:'"Orbitron","Space Grotesk",sans-serif', aurora:true },
  cyber_azure: { bg:'#030a14', text:'#e0f7ff', text2:'rgba(56,189,248,0.65)', accent:'#22d3ee', btn:'rgba(34,211,238,0.1)', btnHover:'rgba(34,211,238,0.2)', border:'rgba(6,182,212,0.35)', radius:16, font:'"Orbitron","IBM Plex Sans",sans-serif', aurora:true },
  cyber_crimson:{ bg:'#140205', text:'#ffe4ec', text2:'rgba(251,113,133,0.65)', accent:'#fb7185', btn:'rgba(251,113,133,0.12)', btnHover:'rgba(251,113,133,0.22)', border:'rgba(244,63,94,0.4)', radius:14, font:'"Orbitron","Space Grotesk",sans-serif', aurora:true },
  /* Fundos claramente coloridos (não cinza/preto/branco quase neutro) */
  azul:        { bg:'linear-gradient(160deg,#2563eb 0%,#1d4ed8 50%,#1e40af 100%)', text:'#ffffff', text2:'rgba(219,234,254,0.88)', accent:'#fde047', btn:'rgba(255,255,255,0.18)', btnHover:'rgba(255,255,255,0.28)', border:'rgba(255,255,255,0.25)', radius:14, font:'system-ui', aurora:true, auroraSoft:true },
  amarelo:     { bg:'linear-gradient(165deg,#facc15 0%,#eab308 45%,#ca8a04 100%)', text:'#422006', text2:'rgba(66,32,6,0.78)', accent:'#1e3a8a', btn:'rgba(0,0,0,0.1)', btnHover:'rgba(0,0,0,0.16)', border:'rgba(0,0,0,0.18)', radius:16, font:'"DM Sans",system-ui,sans-serif' },
  dourado_luz: { bg:'linear-gradient(145deg,#fbbf24 0%,#f59e0b 40%,#d97706 100%)', text:'#422006', text2:'rgba(66,32,6,0.8)', accent:'#7c2d12', btn:'rgba(0,0,0,0.1)', btnHover:'rgba(0,0,0,0.17)', border:'rgba(120,53,15,0.25)', radius:14, font:'"Georgia",serif' },
  roxo:        { bg:'linear-gradient(155deg,#a855f7 0%,#9333ea 45%,#7e22ce 100%)', text:'#faf5ff', text2:'rgba(237,233,254,0.9)', accent:'#fde047', btn:'rgba(255,255,255,0.2)', btnHover:'rgba(255,255,255,0.3)', border:'rgba(255,255,255,0.28)', radius:18, font:'system-ui', aurora:true, auroraSoft:true },
  vermelho:    { bg:'linear-gradient(160deg,#f87171 0%,#ef4444 40%,#dc2626 100%)', text:'#fff7ed', text2:'rgba(255,247,237,0.88)', accent:'#fef08a', btn:'rgba(0,0,0,0.12)', btnHover:'rgba(0,0,0,0.2)', border:'rgba(0,0,0,0.15)', radius:12, font:'system-ui', aurora:true, auroraSoft:true },
  vinho:       { bg:'linear-gradient(165deg,#be123c 0%,#9f1239 50%,#881337 100%)', text:'#ffe4e6', text2:'rgba(255,228,230,0.88)', accent:'#fcd34d', btn:'rgba(255,255,255,0.15)', btnHover:'rgba(255,255,255,0.25)', border:'rgba(255,255,255,0.22)', radius:16, font:'"Georgia",serif', aurora:true, auroraSoft:true },
  verde_nativo:{ bg:'linear-gradient(160deg,#22c55e 0%,#16a34a 45%,#15803d 100%)', text:'#f0fdf4', text2:'rgba(220,252,231,0.9)', accent:'#fef9c3', btn:'rgba(255,255,255,0.18)', btnHover:'rgba(255,255,255,0.28)', border:'rgba(255,255,255,0.22)', radius:14, font:'system-ui', aurora:true, auroraSoft:true },
  lima:        { bg:'linear-gradient(165deg,#d9f99d 0%,#bef264 35%,#a3e635 100%)', text:'#1a2e05', text2:'rgba(26,46,5,0.78)', accent:'#15803d', btn:'rgba(0,0,0,0.08)', btnHover:'rgba(0,0,0,0.14)', border:'rgba(21,128,61,0.28)', radius:16, font:'system-ui' },
  prata:       { bg:'linear-gradient(140deg,#38bdf8 0%,#22d3ee 35%,#0ea5e9 70%,#0284c7 100%)', text:'#f0f9ff', text2:'rgba(224,242,254,0.9)', accent:'#fef08a', btn:'rgba(255,255,255,0.2)', btnHover:'rgba(255,255,255,0.32)', border:'rgba(255,255,255,0.3)', radius:12, font:'system-ui', aurora:true, auroraSoft:true },
  aco_escovado:{ bg:'linear-gradient(110deg,#0e7490 0%,#155e75 25%,#0891b2 50%,#0c4a6e 75%,#155e75 100%)', text:'#ecfeff', text2:'rgba(207,250,254,0.88)', accent:'#fbbf24', btn:'rgba(255,255,255,0.16)', btnHover:'rgba(255,255,255,0.26)', border:'rgba(255,255,255,0.22)', radius:8, font:'"IBM Plex Sans",sans-serif', aurora:true, auroraSoft:true },
  neon_mix:    { bg:'linear-gradient(125deg,#ec4899 0%,#a855f7 35%,#6366f1 65%,#06b6d4 100%)', text:'#ffffff', text2:'rgba(255,255,255,0.9)', accent:'#fef08a', btn:'rgba(255,255,255,0.22)', btnHover:'rgba(255,255,255,0.35)', border:'rgba(255,255,255,0.35)', radius:20, font:'"Space Grotesk",sans-serif', aurora:true, auroraSoft:true },
  lilas:       { bg:'linear-gradient(180deg,#ddd6fe 0%,#c4b5fd 50%,#a78bfa 100%)', text:'#3b0764', text2:'rgba(59,7,100,0.82)', accent:'#6d28d9', btn:'rgba(91,33,182,0.12)', btnHover:'rgba(91,33,182,0.2)', border:'rgba(91,33,182,0.28)', radius:18, font:'"DM Sans",sans-serif' },
  banana:      { bg:'linear-gradient(170deg,#fef08a 0%,#fde047 40%,#facc15 100%)', text:'#422006', text2:'rgba(66,32,6,0.78)', accent:'#c2410c', btn:'rgba(0,0,0,0.08)', btnHover:'rgba(0,0,0,0.14)', border:'rgba(194,65,12,0.22)', radius:20, font:'system-ui' },
  abacate:     { bg:'linear-gradient(160deg,#84cc16 0%,#65a30d 45%,#4d7c0f 100%)', text:'#ecfccb', text2:'rgba(236,252,203,0.92)', accent:'#fef08a', btn:'rgba(0,0,0,0.12)', btnHover:'rgba(0,0,0,0.2)', border:'rgba(0,0,0,0.15)', radius:16, font:'system-ui', aurora:true, auroraSoft:true },
  maca:        { bg:'linear-gradient(165deg,#fb7185 0%,#f43f5e 40%,#e11d48 100%)', text:'#fff1f2', text2:'rgba(255,241,242,0.9)', accent:'#fef08a', btn:'rgba(0,0,0,0.1)', btnHover:'rgba(0,0,0,0.18)', border:'rgba(0,0,0,0.12)', radius:14, font:'system-ui', aurora:true, auroraSoft:true },
  royal_blue:  { bg:'linear-gradient(155deg,#1e40af 0%,#1d4ed8 40%,#2563eb 100%)', text:'#eff6ff', text2:'rgba(219,234,254,0.9)', accent:'#fbbf24', btn:'rgba(255,255,255,0.18)', btnHover:'rgba(255,255,255,0.28)', border:'rgba(255,255,255,0.25)', radius:14, font:'system-ui', aurora:true, auroraSoft:true },
  mapa_tesouro:{ bg:'linear-gradient(165deg,#eab308 0%,#d97706 30%,#b45309 55%,#92400e 100%),repeating-linear-gradient(0deg,transparent,transparent 14px,rgba(66,32,6,0.08) 14px,rgba(66,32,6,0.08) 15px),repeating-linear-gradient(90deg,transparent,transparent 14px,rgba(66,32,6,0.06) 14px,rgba(66,32,6,0.06) 15px)', text:'#292524', text2:'rgba(41,37,36,0.85)', accent:'#fef3c7', btn:'rgba(0,0,0,0.12)', btnHover:'rgba(0,0,0,0.2)', border:'rgba(66,32,6,0.22)', radius:8, font:'"Georgia",serif' },
  manchado:    { bg:'radial-gradient(ellipse 90% 65% at 75% 25%,rgba(234,88,12,0.45) 0%,transparent 50%),radial-gradient(ellipse 70% 55% at 20% 80%,rgba(180,83,9,0.35) 0%,transparent 48%),linear-gradient(175deg,#fdba74 0%,#fb923c 38%,#f97316 100%)', text:'#431407', text2:'rgba(67,20,7,0.82)', accent:'#fef3c7', btn:'rgba(0,0,0,0.1)', btnHover:'rgba(0,0,0,0.16)', border:'rgba(124,45,18,0.28)', radius:10, font:'"Georgia",serif' },
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

export default function SitePageClient({
  slug,
  ssrSite,
}: {
  slug: string;
  /** Linha publicada vinda do servidor (HTML inicial + SEO); null = sem publicado no SSR. */
  ssrSite: MiniSite | null;
}) {
  const safeSlug = slug || '';
  const { site, loading, notFound } = usePublicSite(safeSlug, { ssrSite });
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
  const trackPublicAnalytics = Boolean(site?.published && user?.id !== site?.user_id);
  const T = useT();
  const feedCols: 1|2|3 = (site as any)?.feed_cols || 1;
  const pageMaxWidth = Math.min(1010, Math.max(320, Number((site as any)?.page_width || 600)));
  const photoSizeRaw = String((site as any)?.photo_size || 'md');
  /** Legado `site` → XL; só 4 tamanhos fixos, alinhados à coluna da página (não largura do banner). */
  const photoSizeKey = photoSizeRaw === 'site' ? 'xl' : photoSizeRaw;
  const photoSizeMap: Record<string, number> = { sm: 72, md: 96, lg: 128, xl: 192 };
  const avatarSize = photoSizeMap[photoSizeKey] || 96;
  /** Faixa do topo: altura fluida até 250px — não força strip gigante em todos os ecrãs. */
  const BANNER_STRIP_MAX_PX = 250;
  const rawTextColor = (site as any)?.text_color;
  const textColorOverride = rawTextColor && rawTextColor !== '' && rawTextColor !== 'auto' ? rawTextColor : null;
  const textMain  = textColorOverride || t.text;
  const textSub   = textColorOverride ? textColorOverride + 'bb' : t.text2;
  const bannerZoom = Math.max(50, Math.min(150, Number((site as any)?.banner_zoom ?? 100)));
  const bannerFit: 'cover'|'contain' = (site as any)?.banner_fit === 'contain' ? 'contain' : 'cover';
  const bannerPlaceholderEnabled = (site as any)?.banner_placeholder_enabled !== false;
  const bannerPlaceholderColor = (site as any)?.banner_placeholder_color || '#1f2937';
  const moduleOrder: string[] = (() => {
    try { return JSON.parse((site as any)?.module_order || '["pages","links","feed","videos","cv","ads","booking"]'); }
    catch { return ['pages', 'links', 'feed', 'videos', 'cv', 'ads', 'booking']; }
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
            pages: [1,2,3].includes(Number(raw?.moduleColumns?.pages)) ? Number(raw.moduleColumns.pages) as 1|2|3 : 1,
            links: [1,2,3].includes(Number(raw?.moduleColumns?.links)) ? Number(raw.moduleColumns.links) as 1|2|3 : 1,
            videos: [1,2,3].includes(Number(raw?.moduleColumns?.videos)) ? Number(raw.moduleColumns.videos) as 1|2|3 : 1,
            cv: [1,2,3].includes(Number(raw?.moduleColumns?.cv)) ? Number(raw.moduleColumns.cv) as 1|2|3 : 1,
            feed: [1,2,3].includes(Number(raw?.moduleColumns?.feed)) ? Number(raw.moduleColumns.feed) as 1|2|3 : 1,
            ads: [1,2,3].includes(Number(raw?.moduleColumns?.ads)) ? Number(raw.moduleColumns.ads) as 1|2|3 : 1,
            mystic: [1,2,3].includes(Number(raw?.moduleColumns?.mystic)) ? Number(raw.moduleColumns.mystic) as 1|2|3 : 1,
            slug_market: [1,2,3].includes(Number(raw?.moduleColumns?.slug_market)) ? Number(raw.moduleColumns.slug_market) as 1|2|3 : 1,
            classified: [1,2,3].includes(Number(raw?.moduleColumns?.classified)) ? Number(raw.moduleColumns.classified) as 1|2|3 : 1,
            booking: [1,2,3].includes(Number(raw?.moduleColumns?.booking)) ? Number(raw.moduleColumns.booking) as 1|2|3 : 1,
          };
        });
        return out;
      }
    } catch {}
    return { home: { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 } };
  })();
  const sitePages: {id:string;label:string;template?:'default'|'videos_3'|'videos_4'}[] = (() => {
    try { return JSON.parse((site as any)?.site_pages || '[{"id":"home","label":"Home","template":"default"}]'); }
    catch { return [{id:'home',label:'Home',template:'default'}]; }
  })();
  const [activePage, setActivePage] = useState('home');
  const [pageContents, setPageContents] = useState<Record<string,string>>({});
  const activeModules = (pageModulesMap[activePage] || (activePage === 'home' ? moduleOrder : [])).filter(
    (m) => m !== 'mystic',
  );
  const activeColumns = pageColumnsMap[activePage] || 1;
  const activeModuleCols = pageModuleColumnsMap[activePage] || { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 };
  const pageTabsNav =
    sitePages.length > 1 ? (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {sitePages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setActivePage(page.id)}
            style={{
              padding: '8px 20px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              border: `1.5px solid ${activePage === page.id ? accent : t.border}`,
              background: activePage === page.id ? accent : t.btn,
              color: activePage === page.id ? '#fff' : t.text,
              cursor: 'pointer',
              transition: 'all .2s',
            }}
          >
            {page.label}
          </button>
        ))}
      </div>
    ) : null;
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '' });
  const [subActive, setSubActive] = useState(false);
  const [trialCountdown, setTrialCountdown] = useState('');
  const [warningHours, setWarningHours] = useState(1);
  const [testRibbonText, setTestRibbonText] = useState('TEST MODE');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  /** Abre o painel Lively (chat IA) a partir do botão no perfil. */
  const [livelyAssistKick, setLivelyAssistKick] = useState(0);
  /** Visitante liga a IA explicitamente (default off; persistido por slug). */
  const [livelyAssistVisitorOn, setLivelyAssistVisitorOn] = useState(false);
  const warnedOneHour = useRef(false);
  const hostRedirectDone = useRef(false);
  useEffect(() => {
    if (!site) return;
    try { setPageContents(JSON.parse((site as any)?.page_contents || '{}')); }
    catch { setPageContents({}); }
  }, [site]);
  useEffect(() => {
    if (typeof window === 'undefined' || !safeSlug) return;
    try {
      setLivelyAssistVisitorOn(localStorage.getItem(`tb_lively_assist_${safeSlug}`) === '1');
    } catch {
      setLivelyAssistVisitorOn(false);
    }
  }, [safeSlug]);

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
      addToCart({ id:`cv_${site.id}`, label:`CV: ${site.site_name}`, price: site?.cv_price ?? PLATFORM_USD.cvUnlockDefault, type:'cv' });
      openCart();
      // Remove param from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user, site]);

  useEffect(() => {
    if (!site?.id || !site.published || authLoading) return;
    if (user?.id === site.user_id) return;
    if (typeof window === 'undefined') return;
    const k = `tb_visit_${site.id}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
    const params = new URLSearchParams(window.location.search);
    const utmNow = {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
    };
    const ref = document.referrer || '';
    const device = navigator.userAgent || '';
    trackSiteVisit({
      site_id: site.id,
      slug: site.slug,
      referrer: ref ? ref.slice(0, 500) : null,
      device: device ? device.slice(0, 200) : null,
      utm: utmNow,
    });
  }, [site?.id, site?.published, site?.slug, site?.user_id, user?.id, authLoading]);

  useEffect(() => {
    if (!site?.id || !site.published || authLoading) return;
    if (user?.id === site.user_id) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const utmNow = {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
    };
    const ref = document.referrer || '';
    const device = navigator.userAgent || '';
    trackPageView({
      site_id: site.id,
      page_id: activePage,
      slug: site.slug,
      referrer: ref ? ref.slice(0, 500) : null,
      device: device ? device.slice(0, 200) : null,
      utm: utmNow,
    });
  }, [activePage, site?.id, site?.published, site?.slug, site?.user_id, user?.id, authLoading]);

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
      (supabase as any).from('cv_unlocks').select('id').eq('unlocker_id', user.id).eq('site_id', site.id).maybeSingle()
        .then(({ data }: any) => { if (data) setCvUnlocked(true); });
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
      const noticeSentAt = (site as any)?.trial_notice_sent_at;
      if (noticeSentAt) warnedOneHour.current = true;
      if (diff <= warningHours * 3600000 && !warnedOneHour.current) {
        warnedOneHour.current = true;
        toast.error(T('toast_trial_hours_warning').replace('{hours}', String(warningHours)));
        if ((site as any)?.id) {
          // Persist this warning to avoid repeating it on reload/navigation.
          supabase
            .from('mini_sites')
            .update({ trial_notice_sent_at: new Date().toISOString() } as any)
            .eq('id', (site as any).id);
        }
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOwner, subActive, (site as any)?.id, (site as any)?.trial_publish_until, (site as any)?.trial_notice_sent_at, warningHours, T]);

  const handleCvUnlock = () => {
    if (!user) { 
      // Save current page so we come back after login
      const returnUrl = window.location.pathname + '?unlock=cv';
      window.location.href = '/auth?redirect=' + encodeURIComponent(returnUrl);
      return; 
    }
    addToCart({ id:`cv_${site!.id}`, label:`CV: ${site!.site_name}`, price: site?.cv_price ?? PLATFORM_USD.cvUnlockDefault, type:'cv' });
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
        <h1 style={{ color: '#e6edf3', fontSize: 22, fontWeight: 900, margin: 0, textAlign: 'center' }}>{T('site_offline_title')}</h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, maxWidth: 360, textAlign: 'center', margin: 0 }}>
          {T('site_offline_desc')}
        </p>
        <Link href="/planos" style={{ padding: '12px 24px', borderRadius: 14, background: '#818cf8', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
          {T('site_offline_plans')}
        </Link>
        <Link href="/" style={{ color: '#818cf8', fontSize: 13 }}>{T('site_offline_home')}</Link>
      </div>
    );
  }

  // Background
  const pageBg = t.bg;
  const r = Number(t.radius) || 16;

  const activePageTemplate = sitePages.find(p => p.id === activePage)?.template || 'default';

  const livelyOpenBeta = process.env.NEXT_PUBLIC_LIVELY_AVATAR_OPEN_BETA === 'true';
  const livelyNftOk = !!(site as any)?.lively_avatar_nft_verified_at;
  const livelyFeatureUnlocked =
    !!(site as any)?.lively_avatar_enabled && (livelyNftOk || livelyOpenBeta || isOwner);
  const [livelyApiEligible, setLivelyApiEligible] = useState(false);
  const [livelyEligibilityReady, setLivelyEligibilityReady] = useState(false);

  useEffect(() => {
    if (!safeSlug || !livelyFeatureUnlocked) {
      setLivelyApiEligible(false);
      setLivelyEligibilityReady(true);
      return;
    }
    setLivelyEligibilityReady(false);
    const ac = new AbortController();
    void fetch(`/api/lively-avatar/eligibility?slug=${encodeURIComponent(safeSlug)}`, { signal: ac.signal })
      .then((r) => r.json().catch(() => ({})))
      .then((d: { eligible?: boolean }) => setLivelyApiEligible(d.eligible === true))
      .catch(() => setLivelyApiEligible(false))
      .finally(() => setLivelyEligibilityReady(true));
    return () => ac.abort();
  }, [safeSlug, livelyFeatureUnlocked]);

  /** Sem API/orçamento: não manter interruptor “ligado” no armazenamento local. */
  useEffect(() => {
    if (typeof window === 'undefined' || !safeSlug || !livelyEligibilityReady) return;
    if (!livelyApiEligible) {
      try {
        localStorage.setItem(`tb_lively_assist_${safeSlug}`, '0');
      } catch {
        /* ignore */
      }
      setLivelyAssistVisitorOn(false);
    }
  }, [safeSlug, livelyEligibilityReady, livelyApiEligible]);

  const showLivelyAvatar = livelyFeatureUnlocked && livelyApiEligible;
  const floatingLivelyActive = showLivelyAvatar && livelyAssistVisitorOn;

  const livelyCentralMagic = (site as any)?.lively_central_magic === true;
  const magicPortraitEnabled = (site as any)?.magic_portrait_enabled === true;
  const livelyProfileAsAvatar = (site as any)?.lively_profile_as_avatar === true;
  const livelyProfileSpeakOnEntry = (site as any)?.lively_profile_speak_on_entry !== false;
  const livelySpeechTap = typeof (site as any)?.lively_profile_speech_tap === 'string' ? (site as any).lively_profile_speech_tap : '';
  const livelySpeechBeforeReply =
    typeof (site as any)?.lively_profile_speech_before_reply === 'string' ? (site as any).lively_profile_speech_before_reply : '';
  const showProfileSpeakingAvatar = floatingLivelyActive && livelyProfileAsAvatar;
  /** Sempre a foto de perfil real no círculo do topo — nunca o retrato IA (evita “duas caras”). */
  const centerProfilePhotoUrl =
    typeof site?.avatar_url === 'string' && site.avatar_url.trim() ? site.avatar_url.trim() : null;
  const floatingAgentImageUrl = site
    ? resolvePublicSiteFaceUrl({
        avatarUrl: site.avatar_url,
        identityPortraitUrl: (site as any)?.identity_portrait_url,
        magicPortraitEnabled,
      })
    : null;
  /** Avatar falante = só foto de perfil do utilizador. */
  const speakingProfilePhotoUrl = centerProfilePhotoUrl;
  const livelyTtsProvider = normalizeLivelyTtsProvider((site as any)?.lively_tts_provider);
  const profilePhotoRadiusCss =
    site?.photo_shape === 'round'
      ? '50%'
      : site?.photo_shape === 'square'
        ? `${Math.round(avatarSize * 0.16)}px`
        : `${Math.round(avatarSize * 0.28)}px`;

  const shareAvatarUrl = centerProfilePhotoUrl || floatingAgentImageUrl || null;
  const ownerWhatsappDigits = String((site as any).contact_phone || '').replace(/\D/g, '');

  /** Aurora: fundos escuros usam brilho moderado; temas vivid (`auroraSoft`) quase só sugerem luz sem lavar a cor. */
  const auroraOverlayCss =
    t.aurora
      ? (() => {
          const soft = t.auroraSoft === true;
          const a1 = soft ? `${accent}08` : `${accent}18`;
          const a2 = soft ? `${accent}05` : `${accent}0c`;
          return `radial-gradient(ellipse at 32% 22%,${a1} 0%,transparent 48%),radial-gradient(ellipse at 68% 78%,${a2} 0%,transparent 48%)`;
        })()
      : null;

  return (
    <div style={{minHeight:'100vh',background:pageBg,fontFamily:t.font,position:'relative',overflowX:'hidden'}}>
      {t.aurora && auroraOverlayCss ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: auroraOverlayCss,
          }}
        />
      ) : null}

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

      {/* Banner: only uploaded image or color strip — never profile photo; max 250px tall */}
      {site.banner_url ? (
        <div
          style={{
            width: '100%',
            maxHeight: BANNER_STRIP_MAX_PX,
            height: `clamp(80px, 22vw, ${BANNER_STRIP_MAX_PX}px)`,
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
            background: '#07070a',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${site.banner_url})`,
              backgroundSize: bannerFit === 'contain' ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#07070a',
              backgroundPosition: `${(site as any).banner_focus_x ?? 50}% ${(site as any).banner_focus_y ?? 50}%`,
              transform: `scale(${bannerZoom / 100})`,
              transformOrigin: `${(site as any).banner_focus_x ?? 50}% ${(site as any).banner_focus_y ?? 50}%`,
            }}
          />
        </div>
      ) : bannerPlaceholderEnabled ? (
        <div
          style={{
            width: '100%',
            height: 56,
            maxHeight: BANNER_STRIP_MAX_PX,
            background: bannerPlaceholderColor,
            zIndex: 1,
            position: 'relative',
          }}
        />
      ) : null}

      {/* Profile block — theme background; avatar independent from banner */}
      <div
        style={{
          width: '100%',
          position: 'relative',
          zIndex: 2,
          background: pageBg,
          padding: 'clamp(16px, 4vw, 28px) clamp(16px, 4vw, 24px) 8px',
        }}
      >
        <div
          style={{
            maxWidth: pageMaxWidth,
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <CentralProfileMagicAvatar
            enabled={
              floatingLivelyActive && livelyCentralMagic && magicPortraitEnabled && !livelyProfileAsAvatar
            }
            accent={accent}
          >
            <AvatarTiltShell enabled={floatingLivelyActive}>
              <div
                style={{
                  display: 'inline-block',
                  padding: 3,
                  borderRadius:
                    site.photo_shape === 'round'
                      ? '50%'
                      : site.photo_shape === 'square'
                        ? Math.max(12, Math.round(avatarSize * 0.06))
                        : Math.max(16, Math.round(avatarSize * 0.12)),
                  background: `linear-gradient(135deg,${accent},${accent}60,rgba(255,255,255,0.12))`,
                  marginBottom: 12,
                  boxShadow: `0 8px 28px rgba(0,0,0,0.2)`,
                }}
              >
                {showProfileSpeakingAvatar ? (
                  <CentralProfileSpeakingAvatar
                    slug={slug}
                    siteName={site.site_name}
                    welcome={typeof (site as any).lively_avatar_welcome === 'string' ? (site as any).lively_avatar_welcome : ''}
                    speakOnEntry={livelyProfileSpeakOnEntry}
                    speechTap={livelySpeechTap}
                    modelId={(site as any).lively_avatar_model}
                    accent={accent}
                    voiceAgent={typeof (site as any).lively_elevenlabs_voice_agent === 'string' ? (site as any).lively_elevenlabs_voice_agent : ''}
                    ttsProvider={livelyTtsProvider}
                    photoSrc={speakingProfilePhotoUrl}
                    size={avatarSize}
                    borderRadius={profilePhotoRadiusCss}
                    border={`2px solid ${t.border}`}
                    pageBg={pageBg}
                  />
                ) : centerProfilePhotoUrl ? (
                  <img
                    src={centerProfilePhotoUrl}
                    alt={site.site_name}
                    style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius:
                        site.photo_shape === 'round'
                          ? '50%'
                          : site.photo_shape === 'square'
                            ? Math.round(avatarSize * 0.16)
                            : Math.round(avatarSize * 0.28),
                      objectFit: 'cover',
                      objectPosition: '50% 35%',
                      display: 'block',
                      border: `2px solid ${t.border}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg,${accent},${accent}80)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: Math.round(avatarSize * 0.42),
                      fontWeight: 900,
                      color: '#fff',
                      border: `2px solid ${t.border}`,
                    }}
                  >
                    {site.site_name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </AvatarTiltShell>
          </CentralProfileMagicAvatar>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.35rem, 4.2vw, 1.75rem)',
                fontWeight: 900,
                color: textMain,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              {site.site_name}
            </h1>
            {site.is_verified && <CheckCircle style={{ width: 22, height: 22, color: accent, flexShrink: 0 }} />}
          </div>
          {site.cv_headline && (
            <p style={{ margin: '0 0 8px', fontSize: 15, color: textSub, fontWeight: 700, maxWidth: 420 }}>
              {site.cv_headline}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: pageMaxWidth, margin: '0 auto', padding: '28px 20px 80px', position: 'relative', zIndex: 3 }}>

        {/* ── Profile (bio + ações) ── */}
        <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 6 }}>

          {site.bio && <p style={{margin:'0 0 16px',fontSize:15,color:textSub,lineHeight:1.7,maxWidth:440,marginLeft:'auto',marginRight:'auto'}}>{site.bio}</p>}

          {isOwner && <div style={{marginBottom:14}}><EarningsWidget userId={site.user_id} accentColor={accent} compact/></div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
            <SiteFollowButton
              siteId={site.id}
              siteSlug={slug}
              accentColor={accent}
              textColor={t.text}
              borderColor={t.border}
            />
            <TrustBankShareModal
              slug={slug}
              siteName={site.site_name}
              accentColor={accent}
              avatarUrl={shareAvatarUrl}
              isDarkSurface={isDark}
            />
            {ownerWhatsappDigits.length >= 8 ? (
              <a
                href={`https://wa.me/${ownerWhatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: '#25D366',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {T('site_whatsapp_cta')}
              </a>
            ) : null}
          </div>
          <div style={{marginTop:8, display:'flex', justifyContent:'center', alignItems:'center', gap:6, color:t.text2, fontSize:12, fontWeight:700}}>
            <Users style={{width:14, height:14}} />
            <span>{T('site_followers_count').replace('{n}', String(Number((site as any).follower_count) || 0))}</span>
          </div>

          {showLivelyAvatar && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: textMain, textAlign: 'center' }}>
                  {T('lively_assist_toggle_label')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={livelyAssistVisitorOn}
                  aria-label={livelyAssistVisitorOn ? T('lively_assist_on') : T('lively_assist_off')}
                  onClick={() => {
                    const next = !livelyAssistVisitorOn;
                    setLivelyAssistVisitorOn(next);
                    try {
                      localStorage.setItem(`tb_lively_assist_${safeSlug}`, next ? '1' : '0');
                    } catch {
                      /* ignore */
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: 52,
                    height: 28,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: livelyAssistVisitorOn ? accent : t.btn,
                    flexShrink: 0,
                    transition: 'background 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: livelyAssistVisitorOn ? 26 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      transition: 'left 0.2s ease',
                    }}
                  />
                </button>
                <span style={{ fontSize: 11, fontWeight: 800, color: textSub }}>
                  {livelyAssistVisitorOn ? T('lively_assist_on') : T('lively_assist_off')}
                </span>
              </div>
              {livelyAssistVisitorOn ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLivelyAssistKick((k) => k + 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 18px',
                      borderRadius: 999,
                      border: 'none',
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: 'pointer',
                      color: '#fff',
                      background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                      boxShadow: `0 8px 24px ${accent}44`,
                    }}
                  >
                    <MessageCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
                    {T('lively_profile_cta')}
                  </button>
                  <p style={{ margin: 0, fontSize: 11, color: textSub, lineHeight: 1.45, textAlign: 'center' }}>
                    {T('lively_profile_hint')}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 11, color: textSub, lineHeight: 1.45, textAlign: 'center' }}>
                  {T('lively_assist_hint_off')}
                </p>
              )}
            </div>
          )}

          {!livelyProfileAsAvatar ? (
            <MagicPortraitOutOfFrame
              slug={slug}
              isOwner={isOwner}
              accentColor={accent}
              nftOk={livelyNftOk}
              openBeta={livelyOpenBeta}
            />
          ) : null}
        </div>

        {/* ── Separadores de páginas: legado se ainda não usas o módulo "pages" na ordem ── */}
        {pageTabsNav && !activeModules.includes('pages') && (
          <div style={{ marginBottom: 24 }}>{pageTabsNav}</div>
        )}

        {/* ── DYNAMIC MODULE ORDER ── */}
        {(() => {
          const renderModule = (mod: string) => {
          if (mod === 'pages') {
            if (!pageTabsNav) return null;
            return (
              <div key="pages" style={{ marginBottom: 24 }}>
                {pageTabsNav}
              </div>
            );
          }
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
                      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                      const utmNow = {
                        source: params.get('utm_source') || '',
                        medium: params.get('utm_medium') || '',
                        campaign: params.get('utm_campaign') || '',
                      };
                      const ref = typeof document !== 'undefined' ? document.referrer : '';
                      trackLinkClick({
                        site_id: site.id,
                        link_id: link.id,
                        slug: site.slug,
                        destination_url: link.url,
                        referrer: ref ? ref.slice(0, 500) : null,
                        utm: utmNow,
                      });
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
          if (mod === 'cv' && site.show_cv) {
            const cvContactLocked = (site as any).cv_contact_locked === true;
            const cvFree = (site as any).cv_free === true;
            const hasCvContact = Boolean((site as any).contact_email || (site as any).cv_contact_whatsapp);
            const cvUnlockedOrOwner = cvUnlocked || isOwner;
            const contactGated =
              hasCvContact &&
              !cvUnlockedOrOwner &&
              !cvFree &&
              (site.cv_locked || cvContactLocked);
            const contactLockOnlyInBody =
              !site.cv_locked &&
              cvContactLocked &&
              !cvUnlockedOrOwner &&
              !cvFree &&
              hasCvContact;

            return (
            <div key="cv" style={{marginBottom:32}}>
              {(site.cv_locked && !cvUnlocked && !cvFree) ? (
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
                      🔓 ${site.cv_price ?? PLATFORM_USD.cvUnlockDefault} USD (unlock contacts · Stripe)
                    </button>
                  </div>
                </div>
              ) : null}
              <div style={{padding:20,borderRadius:r,border:`1.5px solid ${t.border}`,background:t.btn,marginTop:(site.cv_locked && !cvUnlocked && !cvFree) ? 10 : 0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <Unlock style={{width:16,height:16,color:'#22c55e'}}/>
                  <span style={{fontWeight:800,color:t.text,fontSize:16}}>CV / Resume</span>
                </div>
                <CVView
                  data={{
                    show_cv: !!site.show_cv,
                    cv_free: cvFree,
                    cv_contact_locked: cvContactLocked,
                    cv_price: Number(site.cv_price ?? PLATFORM_USD.cvUnlockDefault),
                    cv_headline: site.cv_headline || '',
                    cv_location: (site as any).cv_location || '',
                    cv_content: site.cv_content || '',
                    cv_skills: site.cv_skills || [],
                    cv_experience: (site as any).cv_experience || [],
                    cv_education: (site as any).cv_education || [],
                    cv_projects: (site as any).cv_projects || [],
                    cv_languages: (site as any).cv_languages || [],
                    cv_certificates: (site as any).cv_certificates || [],
                    contact_email: contactGated ? '' : ((site as any).contact_email || ''),
                    cv_contact_whatsapp: contactGated ? '' : ((site as any).cv_contact_whatsapp || ''),
                    cv_hire_price: Number((site as any).cv_hire_price || 0),
                    cv_hire_currency: (site as any).cv_hire_currency || 'USD',
                    cv_hire_type: (site as any).cv_hire_type || 'hour',
                    section_order: (site as any).section_order || ['summary','experience','education','skills','projects','languages','certificates','contact'],
                  }}
                  accentColor={accent}
                  contactLockActive={contactLockOnlyInBody}
                  onUnlockContact={contactLockOnlyInBody ? handleCvUnlock : undefined}
                />
              </div>
            </div>
            );
          }
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
                    <SecureVideoPlayer
                      videoId={v.id}
                      title={v.title}
                      paywallEnabled={v.paywall_enabled}
                      paywallPrice={v.paywall_price}
                      accentColor={accent}
                      siteSlug={slug}
                      previewImageUrl={v.preview_image_url}
                      previewEmbedUrl={v.preview_embed_url}
                    />
                    {v.title && <div style={{padding:'8px 12px',background:t.btn}}><p style={{margin:0,fontWeight:700,fontSize:13,color:t.text}}>{v.title}</p></div>}
                  </div>
                ))}
              </div>
            </div>
          );
          if (mod === 'feed' && (site as any).show_feed !== false) return (
            <div key="feed" style={{marginBottom:32}}>
              {/* Owner composer */}
              {canManageFeed && site.id && activeModules.includes('feed') && (
                <FeedSection siteId={site.id} canPost={canManageFeed} accentColor={accent} isDark={isDark} textColor={textMain} onPost={() => {
                  const now = new Date().toISOString();
                  (supabase as any).from('feed_posts').select('*').eq('site_id', site.id)
                    .or(`pinned.eq.true,expires_at.gt.${now}`)
                    .order('pinned',{ascending:false}).order('created_at',{ascending:false}).limit(20)
                    .then((r:any) => setPosts(r.data||[]));
                }}/>
              )}
              {/* Pinned posts — outside window, highlighted */}
              {posts.filter((p:any) => p.pinned).map((p:any) => (
                <FeedPostImpression key={p.id} postId={p.id} siteId={site.id} track={trackPublicAnalytics}>
                <div style={{padding:'14px 16px',borderRadius:r,border:`2px solid ${accent}`,background:`${accent}10`,marginBottom:10}}>
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
                      <iframe src={youtubeWatchUrlToEmbedUrl(p.video_embed_url)} width="100%" height="215" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" style={{border:'none',display:'block'}} />
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
                </FeedPostImpression>
              ))}
              {/* Feed window (Instagram-like) */}
              {posts.filter((p:any) => !p.pinned).length > 0 && (
                <div style={{ width: '100%', maxWidth: 580, minWidth: Math.min(580, pageMaxWidth), margin: '0 auto' }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <h2 style={{color:t.text,fontSize:14,fontWeight:800,margin:0}}>{T('site_posts')}</h2>
                    <span style={{fontSize:11,color:t.text2}}>{posts.filter((p:any)=>!p.pinned).length} posts</span>
                  </div>
                  <div style={{
                    width:'100%',
                    minHeight: 200,
                    maxHeight: 'min(70vh, 520px)',
                    overflowY:'auto',
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
                      <FeedPostImpression key={p.id} postId={p.id} siteId={site.id} track={trackPublicAnalytics}>
                      <div style={{
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
                            <iframe src={youtubeWatchUrlToEmbedUrl(p.video_embed_url)} width="100%" height="215" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" style={{border:'none',display:'block'}} />
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
                      </FeedPostImpression>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
          if (mod === 'booking') {
            if ((site as any).booking_enabled !== true) return null;
            return (
              <div key="booking" style={{ marginBottom: 32 }}>
                <SiteBookingWidget
                  slug={slug}
                  accentColor={accent}
                  textColor={t.text}
                  borderColor={t.border}
                  bgCard={t.btn}
                  ownerWhatsappDigits={ownerWhatsappDigits.length >= 8 ? ownerWhatsappDigits : undefined}
                  servicesJson={
                    typeof (site as any).booking_services === 'string'
                      ? (site as any).booking_services
                      : JSON.stringify((site as any).booking_services || [])
                  }
                />
              </div>
            );
          }
          if (mod === 'ads') {
            const ps = (site as any).directory_profile_slug as string | undefined;
            const profileLabel = ps
              ? DIRECTORY_PROFILE_I18N_KEYS[ps]
                ? T(DIRECTORY_PROFILE_I18N_KEYS[ps])
                : ps
              : null;
            return (
              <MiniSiteAdsPanel
                key="ads"
                siteSlug={slug}
                siteName={site.site_name || ''}
                accentColor={accent}
                askingPriceUsdc={(site as any).ad_asking_price_usdc}
                showPricePublic={(site as any).ad_show_price_public !== false}
                profileLabel={profileLabel}
                followerCount={Number((site as any).follower_count) || 0}
                benchmarkHint={null}
                textColor={t.text}
                textMuted={t.text2}
                borderColor={t.border}
                bgCard={t.btn}
                radius={r}
              />
            );
          }
          if (mod === 'slug_market') {
            return (
              <SiteSlugMarketPanel
                key="slug_market"
                ownerUserId={site.user_id}
                accentColor={accent}
                textColor={t.text}
                textMuted={t.text2}
                borderColor={t.border}
                bgCard={t.btn}
                radius={r}
                maxContentWidth={Math.min(640, pageMaxWidth)}
                isDark={isDark}
              />
            );
          }
          if (mod === 'classified') {
            return (
              <SiteClassifiedsPanel
                key="classified"
                siteId={site.id}
                accentColor={accent}
                textColor={t.text}
                textMuted={t.text2}
                borderColor={t.border}
                bgCard={t.btn}
                radius={r}
                maxContentWidth={Math.min(640, pageMaxWidth)}
              />
            );
          }
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
                  <SecureVideoPlayer
                    videoId={v.id}
                    title={v.title}
                    paywallEnabled={v.paywall_enabled}
                    paywallPrice={v.paywall_price}
                    accentColor={accent}
                    siteSlug={slug}
                    previewImageUrl={v.preview_image_url}
                    previewEmbedUrl={v.preview_embed_url}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current page rich content */}
        {hasDisplayableRichHtml(pageContents[activePage]) && (
          <div style={{paddingBottom:24}}>
            <div
              onClick={(ev) => {
                const el = ev.target as HTMLElement;
                if (el.tagName !== 'IMG') return;
                const img = el as HTMLImageElement;
                if (!img.closest('.rich-content')) return;
                const src = img.currentSrc || img.getAttribute('src');
                if (src) setLightboxImage(src);
              }}
              dangerouslySetInnerHTML={{ __html: normalizeRichEmbeds(pageContents[activePage]) }}
              style={{ fontSize:15, lineHeight:1.8, color:textMain, padding:'4px 0', maxWidth:(site as any)?.page_width||600, margin:'0 auto', width:'100%' }}
              className="rich-content"
            />
          </div>
        )}

        {/* Empty state for custom pages */}
        {activePage !== 'home' && !hasDisplayableRichHtml(pageContents[activePage]) && (
          <div style={{paddingBottom:32}}>
            {isOwner ? (
              <div style={{textAlign:'center',padding:'40px 0',border:`1.5px dashed ${t.border}`,borderRadius:16}}>
                <p style={{fontSize:32,marginBottom:8}}>✏️</p>
                <p style={{fontSize:14,color:t.text2,marginBottom:12}}>{T('page_no_content')}</p>
                <a href="/editor" style={{color:accent,fontSize:13,fontWeight:700}}>{T('open_editor')} →</a>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:'40px 0',color:t.text2}}>
                <p style={{fontSize:32,marginBottom:8}}>📝</p>
                <p style={{fontSize:14}}>{T('coming_soon')}</p>
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
              {T('site_trial_offline_banner').replace('{time}', trialCountdown || '--:--:--')}
            </span>
            <a href="/planos" style={{ color:'#fbbf24', fontSize:12, fontWeight:800, textDecoration:'underline' }}>
              {T('site_trial_offline_cta')}
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
        {floatingLivelyActive && (
          <LivelyAvatarWidget
            slug={slug}
            siteName={site.site_name}
            welcome={(site as any).lively_avatar_welcome}
            modelId={(site as any).lively_avatar_model}
            floatingImageUrl={floatingAgentImageUrl}
            dualAgent={(site as any).lively_dual_agent === true}
            isOwner={isOwner}
            openBeta={livelyOpenBeta}
            nftVerified={livelyNftOk}
            accent={accent}
            pageBg={pageBg}
            textColor={t.text}
            speechBeforeReply={livelySpeechBeforeReply || null}
            elevenAgentVoiceId={(site as any).lively_elevenlabs_voice_agent || null}
            floatingExpressiveGestures={(site as any).lively_floating_expressive === true}
            identityPortraitUrl={(site as any).identity_portrait_url ?? null}
            magicPortraitEnabled={magicPortraitEnabled}
            requestOpen={livelyAssistKick}
            ttsProvider={livelyTtsProvider}
          />
        )}
      </div>
      <style>{`*{box-sizing:border-box}body{margin:0}@keyframes spin{to{transform:rotate(360deg)}}
      .rich-content img{max-width:100%;height:auto;border-radius:10px;display:block;margin:10px 0;cursor:zoom-in}
      .rich-content .tb-page-media{margin-top:12px}
      .rich-content .tb-page-media-grid img,.rich-content .tb-page-media-img{max-width:100%;width:100%;height:auto!important;object-fit:contain!important;max-height:none!important;border-radius:12px;cursor:zoom-in}
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
