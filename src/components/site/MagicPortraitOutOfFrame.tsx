'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Volume2, Loader2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCart } from '@/store/cart';
import { useT } from '@/lib/i18n';

const TRIAL_MS = 40 * 60 * 1000;
const TRIAL_KEY = (slug: string) => `tb_magic_trial_${slug}`;

type BoostPayload = {
  campaignId: string;
  brandColor: string | null;
  productLabel: string | null;
  tone: string;
  scriptRaw: string;
  polishedScript: string | null;
  ttsPublicUrl: string | null;
  title: string | null;
};

type PublicMagicResponse = {
  enabled: boolean;
  boost: BoostPayload | null;
  portraitUrl: string | null;
  voiceEffect: string;
  siteName: string;
  audioReady: boolean;
};

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement>, active: boolean) {
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !active) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      a: 0.15 + Math.random() * 0.5,
    }));
    const tick = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (w < 10 || h < 10) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = Date.now() * 0.001;
      particles.forEach((p) => {
        p.x += p.vx * 16;
        p.y += p.vy * 16;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        const px = p.x * w;
        const py = p.y * h + Math.sin(t + p.r * 3) * 2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(180,200,255,${p.a})`;
        ctx.arc(px, py, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, active]);
}

export function MagicPortraitOutOfFrame({
  slug,
  isOwner,
  accentColor,
  nftOk,
  openBeta,
}: {
  slug: string;
  isOwner: boolean;
  accentColor: string;
  nftOk: boolean;
  openBeta: boolean;
}) {
  const T = useT();
  const { add: addToCart, open: openCart } = useCart();
  const gradId = `mf-gold-${slug.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'x'}`;
  const [data, setData] = useState<PublicMagicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [boostAnim, setBoostAnim] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [prepBusy, setPrepBusy] = useState(false);
  const [trialBlocked, setTrialBlocked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const portraitImgRef = useRef<HTMLImageElement>(null);
  const portraitMotionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  useParticles(canvasRef, !!data?.enabled);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/site-magic-boost?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j as PublicMagicResponse);
      })
      .catch(() => {
        if (!cancelled) setData({ enabled: false } as PublicMagicResponse);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || isOwner || openBeta || nftOk) {
      setTrialBlocked(false);
      return;
    }
    try {
      const k = TRIAL_KEY(slug);
      let start = localStorage.getItem(k);
      if (!start) {
        start = String(Date.now());
        localStorage.setItem(k, start);
      }
      const elapsed = Date.now() - Number(start);
      setTrialBlocked(elapsed > TRIAL_MS);
    } catch {
      setTrialBlocked(false);
    }
  }, [slug, isOwner, openBeta, nftOk]);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      setMouse({ x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) });
    },
    [],
  );

  const stopAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (portraitImgRef.current) {
      portraitImgRef.current.style.transform = '';
      portraitImgRef.current.style.transition = '';
    }
    if (portraitMotionRef.current) {
      portraitMotionRef.current.style.transform = '';
      portraitMotionRef.current.style.transition = '';
    }
    setPlaying(false);
  }, []);

  const playBoost = useCallback(async () => {
    const direct = data?.boost?.ttsPublicUrl?.trim();
    if (!data?.audioReady || !direct) {
      toast.error(T('magic_audio_pending'));
      return;
    }
    stopAudio();
    const a = new Audio();
    audioRef.current = a;
    a.crossOrigin = 'anonymous';
    a.src = direct;
    setPlaying(true);
    setBoostAnim(true);
    try {
      await a.play();
    } catch {
      toast.error(T('magic_audio_play_fail'));
      setPlaying(false);
      return;
    }

    try {
      const ctx = new AudioContext();
      await ctx.resume();
      const src = ctx.createMediaElementSource(a);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      an.connect(ctx.destination);
      analyserRef.current = an;
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        let s = 0;
        for (let i = 0; i < 24; i++) s += buf[i];
        const n = Math.min(1, (s / (24 * 255)) * 2.2);
        const scale = 1 + Math.min(0.08, n * 0.14);
        const el = portraitImgRef.current;
        if (el) {
          el.style.transition = 'transform 0.045s ease-out';
          el.style.transform = `scale(${scale})`;
        }
        const mot = portraitMotionRef.current;
        if (mot) {
          const ry = Math.min(5, n * 5.5);
          const rx = Math.min(3.2, n * 3.6);
          mot.style.transition = 'transform 0.055s ease-out';
          mot.style.transform = `rotateY(${ry}deg) rotateX(${-rx * 0.5}deg)`;
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      /* mantém só movimento do rato + partículas */
    }

    a.onended = () => {
      stopAudio();
      setBoostAnim(false);
    };
  }, [data?.audioReady, data?.boost?.ttsPublicUrl, stopAudio, T]);

  const runPrepare = useCallback(async () => {
    if (!slug || !isOwner) return;
    setPrepBusy(true);
    try {
      const res = await fetch('/api/magic-portrait/prepare-boost-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 402) {
        toast.error(typeof j.error === 'string' ? j.error : T('magic_need_credits'));
        addToCart({
          id: `credits_1000_${Date.now()}`,
          label: '1.000 créditos IA',
          price: 10,
          type: 'credits',
        });
        openCart();
        return;
      }
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : T('magic_prep_fail'));
        return;
      }
      toast.success(T('magic_prep_ok'));
      const r = await fetch(`/api/public/site-magic-boost?slug=${encodeURIComponent(slug)}`);
      const fresh = await r.json();
      setData(fresh as PublicMagicResponse);
    } catch {
      toast.error(T('magic_prep_fail'));
    } finally {
      setPrepBusy(false);
    }
  }, [slug, isOwner, addToCart, openCart, T]);

  if (loading || !data?.enabled || !data.portraitUrl) return null;
  if (!data.boost && !isOwner) return null;

  const b = data.boost;
  const brand =
    b?.brandColor && /^#[0-9a-fA-F]{3,8}$/.test(b.brandColor) ? b.brandColor : accentColor;
  const displayLine = b ? b.polishedScript || b.scriptRaw || b.productLabel || '' : '';
  const showPaywall = trialBlocked && !isOwner;

  return (
    <div
      className="magic-portrait-root relative mx-auto mb-10 max-w-md px-2"
      style={{ zIndex: 8 }}
      onMouseMove={onMove}
      onMouseLeave={() => setMouse({ x: 0, y: 0 })}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes magic-lean { from{ transform:rotate(-8deg) translateY(12px); opacity:0.5 } to{ transform:rotate(-18deg) translateY(-8px); opacity:1 } }
          @keyframes magic-portrait-breathe {
            0%, 100% { transform: scale(1) translateY(0); }
            50% { transform: scale(1.02) translateY(-3px); }
          }
          .magic-portrait-img-idle {
            animation: magic-portrait-breathe 3.8s ease-in-out infinite;
          }
          @keyframes magic-portrait-inner-sway {
            0%, 100% { transform: rotateY(-2.5deg) rotateX(0.7deg) translateY(0); }
            25% { transform: rotateY(3.2deg) rotateX(-0.9deg) translateY(-1px); }
            55% { transform: rotateY(-1.5deg) rotateX(1.1deg) translateY(0); }
            78% { transform: rotateY(3.8deg) rotateX(0.3deg) translateY(-1px); }
          }
          .magic-portrait-inner-sway {
            animation: magic-portrait-inner-sway 6s ease-in-out infinite;
            transform-origin: 50% 38%;
          }
        `,
        }}
      />
      <div className="flex items-center justify-center gap-2 mb-3">
        <Sparkles className="w-5 h-5" style={{ color: brand }} />
        <span className="text-sm font-black tracking-tight" style={{ color: accentColor }}>
          {T('magic_title')}
        </span>
      </div>

      <div
        ref={wrapRef}
        className="relative mx-auto rounded-2xl overflow-visible"
        style={{
          width: '100%',
          maxWidth: 320,
          aspectRatio: '3/4',
          filter: showPaywall ? 'blur(14px) saturate(0.5)' : undefined,
          transition: 'filter 0.4s ease',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ zIndex: 0 }}
          aria-hidden
        />

        <div
          className="absolute inset-0 rounded-2xl opacity-90"
          style={{
            zIndex: 1,
            background: `radial-gradient(ellipse at 50% 30%, ${brand}33 0%, transparent 55%), linear-gradient(180deg, rgba(15,23,42,0.5), rgba(15,23,42,0.85))`,
          }}
        />

        {/* Moldura vintage (SVG) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 2, overflow: 'visible' }}
          viewBox="0 0 100 133"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="40%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="96" height="129" rx="4" fill="none" stroke={`url(#${gradId})`} strokeWidth="3" />
          <rect x="6" y="6" width="88" height="121" rx="2" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        </svg>

        <div
          className="absolute rounded-xl overflow-hidden"
          style={{
            zIndex: 3,
            left: '10%',
            right: '10%',
            top: '10%',
            bottom: '18%',
            transform: `perspective(420px) rotateY(${mouse.x * 11}deg) rotateX(${-mouse.y * 9}deg)`,
            transition: 'transform 0.14s ease-out',
          }}
        >
          <div
            ref={portraitMotionRef}
            className={`h-full w-full overflow-hidden rounded-[10px] ${playing ? '' : 'magic-portrait-inner-sway'}`}
          >
            {/* Só a foto: balanço idle + voz (escala/rotação) — sem desenhar rosto por cima */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={portraitImgRef}
              src={data.portraitUrl}
              alt=""
              className={`h-full w-full object-cover object-top ${playing ? '' : 'magic-portrait-img-idle'}`}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        {/* Braço + produto fora da moldura */}
        {boostAnim && b?.productLabel && (
          <div
            className="absolute flex items-end gap-1 pointer-events-none"
            style={{
              zIndex: 20,
              right: '-4%',
              bottom: '6%',
              transform: 'rotate(-18deg) translateY(-8px)',
              animation: 'magic-lean 0.6s ease-out forwards',
            }}
          >
            <div
              className="w-10 h-24 rounded-full opacity-95"
              style={{
                background: `linear-gradient(90deg, #fdba74, #ea580c)`,
                boxShadow: `0 8px 24px ${brand}55`,
              }}
            />
            <div
              className="flex flex-col items-center justify-center rounded-xl px-2 py-3 text-[10px] font-black text-white shadow-lg -ml-2 mb-1"
              style={{ background: brand, maxWidth: 72 }}
            >
              <ShoppingBag className="w-5 h-5 mb-1 opacity-90" />
              <span className="leading-tight text-center line-clamp-3">{b.productLabel}</span>
            </div>
          </div>
        )}
      </div>

      {b ? (
        <p className="text-center text-xs mt-3 px-2 leading-relaxed opacity-90" style={{ maxWidth: 360, margin: '12px auto 0' }}>
          {displayLine}
        </p>
      ) : isOwner ? (
        <p className="text-center text-xs mt-3 px-2 opacity-60">{T('magic_owner_wait_campaign')}</p>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {data.audioReady ? (
          <button
            type="button"
            onClick={() => void playBoost()}
            disabled={playing || showPaywall}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${brand}, ${accentColor})` }}
          >
            {playing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            {T('magic_play_spot')}
          </button>
        ) : (
          <span className="text-xs opacity-70">{T('magic_audio_pending')}</span>
        )}
        {isOwner && b && !data.audioReady ? (
          <button
            type="button"
            disabled={prepBusy}
            onClick={() => void runPrepare()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-white/20 bg-white/5 hover:bg-white/10"
          >
            {prepBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {T('magic_owner_prepare')}
          </button>
        ) : null}
      </div>

      {showPaywall && (
        <div
          className="absolute left-0 right-0 top-10 bottom-auto flex flex-col items-center justify-center text-center p-6 rounded-2xl mx-1"
          style={{
            background: 'rgba(15,23,42,0.88)',
            zIndex: 30,
            minHeight: 220,
            backdropFilter: 'blur(4px)',
          }}
        >
          <p className="text-sm font-bold text-white mb-2">{T('magic_trial_end')}</p>
          <p className="text-xs text-white/70 mb-4">{T('magic_trial_hint')}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/planos" className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black">
              {T('lively_paywall_cta')}
            </Link>
            <Link href="/creditos" className="px-4 py-2 rounded-xl border border-white/30 text-white text-xs font-bold">
              {T('ed_identity_credits_link')}
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
