'use client';
import { HelioCheckout } from '@/components/ui/HelioCheckout';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { Play, Lock, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SecureVideoPlayerProps {
  videoId: string;           // DB id of mini_site_video
  title?: string;
  paywallEnabled?: boolean;
  paywallPrice?: number;
  creatorName?: string;
  siteSlug?: string;
  accentColor?: string;
}

export function SecureVideoPlayer({
  videoId, title, paywallEnabled, paywallPrice,
  creatorName, siteSlug, accentColor = '#818cf8',
}: SecureVideoPlayerProps) {
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'login' | 'pay' | 'error'>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [ytId, setYtId] = useState<string | null>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);

  // Request a signed token from the server
  const requestToken = async () => {
    setState('loading');
    try {
      const res = await fetch('/api/video-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, siteSlug }),
      });
      const data = await res.json();

      if (res.status === 401) { setState('login'); return; }
      if (res.status === 402) { setState('pay'); return; }
      if (!res.ok) throw new Error(data.error);

      setToken(data.token);
      // Verify and get ytId
      const verify = await fetch(`/api/video-token?t=${encodeURIComponent(data.token)}`);
      const vdata = await verify.json();
      if (!vdata.valid) throw new Error('Token invalid');
      setYtId(vdata.ytId);
      setState('playing');
    } catch (err: any) {
      console.error(err);
      setState('error');
      toast.error('Erro ao carregar vídeo');
    }
  };

  const handleUnlock = () => {
    if (!user) { setState('login'); return; }
    // handled by HelioCheckout component inline
  };

  // ── States ──────────────────────────────────────────────────────────────────
  if (state === 'playing' && ytId) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        {/* No direct video ID in DOM — loaded via token */}
        <iframe
          ref={playerRef}
          src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=0`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={title}
          // Prevent right-click context menu on iframe
          onContextMenu={e => e.preventDefault()}
        />
        {/* Invisible overlay to block right-click/inspect on the video area */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 1, userSelect: 'none' }}
          onContextMenu={e => e.preventDefault()}
        />
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="w-full rounded-2xl bg-black flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  if (state === 'login') {
    return (
      <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#0a0015' }}>
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
          <LogIn className="w-10 h-10" style={{ color: accentColor }} />
          <div>
            <p className="text-white font-black text-lg">Login necessário</p>
            <p className="text-white/50 text-sm mt-1">Entre com sua conta Google para assistir</p>
          </div>
          <a href={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: accentColor }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </a>
        </div>
      </div>
    );
  }

  if (state === 'pay') {
    return (
      <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#0d0d0d' }}>
        {/* Fully blurred — no thumbnail visible */}
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #1a0030 0%, #050510 100%)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: accentColor + '20', border: `2px solid ${accentColor}50` }}>
            <Lock className="w-7 h-7" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-white font-black text-xl">Conteúdo Exclusivo</p>
            {title && <p className="text-white/50 text-sm mt-1 max-w-xs">"{title}"</p>}
            {creatorName && <p className="text-white/30 text-xs mt-1">por {creatorName}</p>}
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="px-4 py-2 rounded-full font-bold text-sm" style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}40` }}>
              ${paywallPrice} USDC · 24h de acesso
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button onClick={handleUnlock}
              className="w-full py-3 rounded-xl font-black text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
              Desbloquear agora
            </button>
            {!user && (
              <a href={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-center" style={{ color: accentColor, border: `1px solid ${accentColor}30` }}>
                Já paguei? Entrar
              </a>
            )}
          </div>
          <p className="text-white/20 text-xs">Pagamento via USDC · Polygon · Sem exposição do vídeo</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full rounded-2xl bg-black flex flex-col items-center justify-center gap-3" style={{ aspectRatio: '16/9' }}>
        <p className="text-white/50 text-sm">Erro ao carregar vídeo</p>
        <button onClick={() => setState('idle')} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    );
  }

  // Idle — show play button, thumbnail is a gradient (no real thumb for paywalled content)
  const showThumb = !paywallEnabled;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden cursor-pointer group" style={{ aspectRatio: '16/9', background: '#000' }}
      onClick={requestToken}>
      {showThumb && (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }} />
      )}
      {paywallEnabled && (
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, ${accentColor}10 0%, #050510 100%)` }} />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: paywallEnabled ? accentColor + '30' : 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: `2px solid ${paywallEnabled ? accentColor + '60' : 'rgba(255,255,255,0.2)'}` }}>
          {paywallEnabled
            ? <Lock className="w-6 h-6" style={{ color: accentColor }} />
            : <Play className="w-6 h-6 fill-white text-white ml-1" />
          }
        </div>
        {title && <p className="text-white/70 text-sm font-semibold max-w-xs text-center px-4">{title}</p>}
        {paywallEnabled && paywallPrice && (
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}40` }}>
            ${paywallPrice} USDC
          </span>
        )}
      </div>
    </div>
  );
}
