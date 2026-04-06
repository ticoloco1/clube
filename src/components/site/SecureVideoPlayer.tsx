'use client';
import { StripeCheckout } from '@/components/ui/StripeCheckout';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { Play, Lock, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { isDbPaywallEnabled } from '@/lib/utils';
import { encodeFunctionData, erc20Abi, isAddress } from 'viem';

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
  const T = useT();
  const paywallOn = isDbPaywallEnabled(paywallEnabled);
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'login' | 'pay' | 'error'>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [ytId, setYtId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBusy, setWalletBusy] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  // Request a signed token from the server
  const requestToken = async () => {
    setState('loading');
    try {
      const res = await fetch('/api/video-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, siteSlug, walletAddress }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; token?: string };

      if (res.status === 401) {
        // Para vídeo com paywall, mostra opções de pagamento (wallet/stripe) sem obrigar login.
        setState(paywallOn ? 'pay' : 'login');
        return;
      }
      if (res.status === 402 || data.error === 'Paywall') { setState('pay'); return; }
      if (!res.ok) throw new Error(data.error || res.statusText);

      const tok = data.token;
      if (!tok || typeof tok !== 'string') throw new Error('Token em falta');

      setToken(tok);
      // Verify and get ytId
      const verify = await fetch(`/api/video-token?t=${encodeURIComponent(tok)}`);
      const vdata = await verify.json();
      if (!vdata.valid) throw new Error('Token invalid');
      setYtId(vdata.ytId);
      setState('playing');
    } catch (err: any) {
      console.error(err);
      setState('error');
      toast.error(T('err_video_load'));
    }
  };

  const connectWallet = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth?.request) {
        toast.error('Instala uma wallet EVM (ex: MetaMask)');
        return;
      }
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const addr = typeof accounts?.[0] === 'string' ? String(accounts[0]) : '';
      if (!isAddress(addr)) {
        toast.error('Carteira inválida');
        return;
      }
      setWalletAddress(addr.toLowerCase());
      toast.success('Carteira conectada');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível conectar carteira');
    }
  };

  const payWithUsdcPolygon = async () => {
    if (!siteSlug) {
      toast.error('Site inválido para pagamento');
      return;
    }
    if (!walletAddress || !isAddress(walletAddress)) {
      toast.error('Conecta a wallet primeiro');
      return;
    }
    const eth = (window as any).ethereum;
    if (!eth?.request) {
      toast.error('Wallet não disponível');
      return;
    }

    setWalletBusy(true);
    try {
      const intentRes = await fetch('/api/video-usdc-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, siteSlug, walletAddress }),
      });
      const intentData = await intentRes.json().catch(() => ({} as any));
      if (!intentRes.ok) throw new Error(intentData?.error || 'Falha ao criar intenção');

      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] });

      const usdc = process.env.NEXT_PUBLIC_POLYGON_USDC_CONTRACT;
      if (!usdc || !isAddress(usdc)) throw new Error('USDC contract não configurado');

      const amountUnits = String((intentData as any).amountUnits || '');
      const amount = BigInt(amountUnits);
      if (amount <= BigInt(0)) throw new Error('Valor inválido');

      const txHash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: (usdc as string).toLowerCase(),
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [String((intentData as any).treasuryWallet) as `0x${string}`, amount],
          }),
          value: '0x0',
        }],
      });

      if (!txHash || typeof txHash !== 'string') throw new Error('Transação não enviada');

      const confirmRes = await fetch('/api/video-usdc-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: (intentData as any).intentId, txHash, walletAddress }),
      });
      const confirmData = await confirmRes.json().catch(() => ({} as any));
      if (!confirmRes.ok) throw new Error(confirmData?.error || 'Falha na confirmação');

      toast.success('Pagamento USDC confirmado');
      await requestToken();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao pagar com USDC');
    } finally {
      setWalletBusy(false);
    }
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
              ${paywallPrice} USD · 24h de acesso
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-sm px-2">
            {user && (
              <StripeCheckout
                itemId={videoId}
                label={title ? `Vídeo: ${title}` : 'Desbloqueio de vídeo'}
                price={Number(paywallPrice) || 0}
                type="video"
                accentColor={accentColor}
                buttonText="Desbloquear com cartão (Stripe)"
                onSuccess={() => { void requestToken(); }}
              />
            )}
            {!walletAddress ? (
              <button
                onClick={connectWallet}
                className="w-full py-3 rounded-xl font-black text-white text-sm"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
              >
                Conectar wallet (Polygon)
              </button>
            ) : (
              <>
                <div className="text-xs text-white/50 break-all">Wallet: {walletAddress}</div>
                <button
                  onClick={payWithUsdcPolygon}
                  disabled={walletBusy}
                  className="w-full py-3 rounded-xl font-black text-white text-sm disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, #2563eb, #3b82f6)` }}
                >
                  {walletBusy ? 'Aguarde...' : 'Pagar com USDC (Polygon)'}
                </button>
              </>
            )}
            {!user && (
              <a href={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="w-full py-3 rounded-xl font-black text-white text-sm text-center border border-white/20"
                style={{ background: 'transparent' }}>
                Ou entrar com Google e pagar no Stripe
              </a>
            )}
          </div>
          <p className="text-white/20 text-xs">USDC Polygon (sem cadastro) ou Stripe (com login)</p>
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
  const showThumb = !paywallOn;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden cursor-pointer group" style={{ aspectRatio: '16/9', background: '#000' }}
      onClick={requestToken}>
      {showThumb && (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)' }} />
      )}
      {paywallOn && (
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, ${accentColor}10 0%, #050510 100%)` }} />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: paywallOn ? accentColor + '30' : 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: `2px solid ${paywallOn ? accentColor + '60' : 'rgba(255,255,255,0.2)'}` }}>
          {paywallOn
            ? <Lock className="w-6 h-6" style={{ color: accentColor }} />
            : <Play className="w-6 h-6 fill-white text-white ml-1" />
          }
        </div>
        {title && <p className="text-white/70 text-sm font-semibold max-w-xs text-center px-4">{title}</p>}
        {paywallOn && paywallPrice && (
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}40` }}>
            ${paywallPrice} USD
          </span>
        )}
      </div>
    </div>
  );
}
