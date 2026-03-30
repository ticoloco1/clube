'use client';
import { useState } from 'react';
import { Lock, Play, X, CreditCard, Coins, CheckCircle, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PaywallModalProps {
  video: {
    id: string;
    youtube_video_id: string;
    title?: string;
    paywall_price?: number;
    paywall_enabled?: boolean;
  };
  creatorWallet?: string;
  creatorName?: string;
  onClose?: () => void;
  onUnlocked?: () => void;
}

type PayMethod = 'usdc' | 'card';
type Step = 'gate' | 'select' | 'processing' | 'success';

export function PaywallModal({ video, creatorWallet, creatorName, onClose, onUnlocked }: PaywallModalProps) {
  const [step, setStep] = useState<Step>('gate');
  const [method, setMethod] = useState<PayMethod>('usdc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const price = video.paywall_price ?? 0.99;

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Faça login para continuar.'); setLoading(false); return; }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          items: [{
            id: video.id,
            type: 'video',
            price,
            creatorWallet,
          }],
          paymentMethod: method,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Erro ao gerar pagamento. Tente novamente.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Gate (locked state) ────────────────────────────────────────────────────
  if (step === 'gate') return (
    <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 w-full aspect-video flex flex-col items-center justify-center text-center p-8 select-none">
      {/* Blurred fake thumbnail backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-zinc-900 to-blue-900/30" />
      <div className="absolute inset-0 backdrop-blur-3xl" />

      {/* Lock icon */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-2xl">
          <Lock className="w-9 h-9 text-white/80" />
        </div>

        <h3 className="text-white font-black text-xl mb-1">Conteúdo Exclusivo</h3>
        {video.title && <p className="text-white/60 text-sm mb-5 max-w-xs leading-snug">"{video.title}"</p>}

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-300 font-bold text-sm">${price} USDC</span>
          </div>
          <span className="text-white/30 text-xs">ou cartão de crédito</span>
        </div>

        <button onClick={() => setStep('select')}
          className="flex items-center gap-2 bg-white text-zinc-900 font-black px-7 py-3 rounded-2xl hover:bg-white/90 transition-all shadow-xl hover:shadow-white/10 text-sm">
          <Play className="w-4 h-4 fill-zinc-900" /> Desbloquear vídeo
        </button>

        {creatorName && (
          <p className="text-white/30 text-xs mt-4 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Pagamento seguro via Helio · Creator: {creatorName}
          </p>
        )}
      </div>
    </div>
  );

  // ── Select payment method ─────────────────────────────────────────────────
  if (step === 'select') return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-black text-lg">Escolha o pagamento</h3>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Order summary */}
      <div className="bg-white/5 rounded-xl p-4 mb-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white/60 text-xs mb-0.5">Desbloqueio de vídeo</p>
            <p className="text-white font-semibold text-sm line-clamp-1">{video.title || 'Vídeo premium'}</p>
          </div>
          <p className="text-white font-black text-lg">${price}</p>
        </div>
        <div className="border-t border-white/10 mt-3 pt-3 flex justify-between text-xs text-white/40">
          <span>Acesso por 24h</span>
          <span>USDC · Polygon</span>
        </div>
      </div>

      {/* Payment method selection */}
      <div className="space-y-3 mb-5">
        <button onClick={() => setMethod('usdc')}
          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${method === 'usdc' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">USDC · Polygon</p>
            <p className="text-white/40 text-xs">Carteira cripto · Taxas mínimas</p>
          </div>
          {method === 'usdc' && <CheckCircle className="w-5 h-5 text-yellow-400 ml-auto" />}
        </button>

        <button onClick={() => setMethod('card')}
          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${method === 'card' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">Cartão de crédito</p>
            <p className="text-white/40 text-xs">Visa, Mastercard, Amex</p>
          </div>
          {method === 'card' && <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-4 text-center">{error}</p>}

      <button onClick={handlePayment} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: method === 'usdc' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff' }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {loading ? 'Gerando checkout...' : `Pagar $${price} ${method === 'usdc' ? 'USDC' : 'via cartão'}`}
      </button>

      <p className="text-white/25 text-xs text-center mt-3 flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" /> Pagamento processado com segurança pela Helio
      </p>
    </div>
  );

  // ── Success ───────────────────────────────────────────────────────────────
  if (step === 'success') return (
    <div className="bg-zinc-950 border border-green-500/30 rounded-2xl p-8 w-full max-w-sm mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-400" />
      </div>
      <h3 className="text-white font-black text-lg mb-1">Desbloqueado!</h3>
      <p className="text-white/50 text-sm mb-5">Aproveite seu vídeo exclusivo por 24 horas.</p>
      <button onClick={onUnlocked}
        className="flex items-center gap-2 bg-white text-zinc-900 font-black px-6 py-3 rounded-xl mx-auto hover:bg-white/90 transition-all text-sm">
        <Play className="w-4 h-4 fill-zinc-900" /> Assistir agora
      </button>
    </div>
  );

  return null;
}

// ─── Inline Paywall Video Player (for mini-site) ──────────────────────────────
interface PaywallVideoProps {
  video: {
    id: string;
    youtube_video_id: string;
    title?: string;
    paywall_enabled?: boolean;
    paywall_price?: number;
  };
  creatorWallet?: string;
  creatorName?: string;
  isUnlocked?: boolean; // passed from parent after checking DB
}

export function PaywallVideo({ video, creatorWallet, creatorName, isUnlocked }: PaywallVideoProps) {
  const [unlocked, setUnlocked] = useState(isUnlocked || false);
  const [showModal, setShowModal] = useState(false);

  if (!video.paywall_enabled || unlocked) {
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}?rel=0&modestbranding=1&autoplay=${unlocked ? 1 : 0}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={video.title}
        />
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            <PaywallModal
              video={video}
              creatorWallet={creatorWallet}
              creatorName={creatorName}
              onClose={() => setShowModal(false)}
              onUnlocked={() => { setUnlocked(true); setShowModal(false); }}
            />
          </div>
        </div>
      )}
      <div onClick={() => setShowModal(true)} className="cursor-pointer">
        <PaywallModal
          video={video}
          creatorWallet={creatorWallet}
          creatorName={creatorName}
          onUnlocked={() => setUnlocked(true)}
        />
      </div>
    </>
  );
}
