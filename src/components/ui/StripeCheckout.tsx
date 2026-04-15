'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Zap, ExternalLink, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { postCheckoutSession } from '@/lib/checkoutClient';
const CHECKOUT_PROVIDER = (process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER || 'stripe').toLowerCase();
const MOONPAY_CHECKOUT_URL = (process.env.NEXT_PUBLIC_MOONPAY_CHECKOUT_URL || '').trim();

interface StripeCheckoutProps {
  itemId: string;
  label: string;
  price: number;
  type: 'video' | 'feed_post' | 'cv' | 'slug' | 'plan' | 'boost' | 'classified' | 'credits' | 'brand_ad' | 'directory_company';
  accentColor?: string;
  onSuccess?: () => void;
  buttonText?: string;
  compact?: boolean;
}

export function StripeCheckout({
  itemId, label, price, type, accentColor = '#818cf8',
  onSuccess, buttonText, compact = false,
}: StripeCheckoutProps) {
  const T = useT();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle'|'pending'|'done'>('idle');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handlePay = async () => {
    if (!user) {
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoading(true);
    try {
      if (CHECKOUT_PROVIDER === 'moonpay') {
        if (type !== 'plan') {
          throw new Error('MoonPay ativo: apenas planos do mini-site neste modo.');
        }
        if (!MOONPAY_CHECKOUT_URL) {
          throw new Error('Falta NEXT_PUBLIC_MOONPAY_CHECKOUT_URL na Vercel.');
        }
        const u = new URL(MOONPAY_CHECKOUT_URL);
        u.searchParams.set('tb_amount_usd', Number(price || 0).toFixed(2));
        u.searchParams.set('tb_item', itemId);
        setCheckoutUrl(u.toString());
        setStep('pending');
        const w = window.open(u.toString(), '_blank', 'width=500,height=700');
        if (!w || w.closed || typeof w.closed === 'undefined') {
          window.location.href = u.toString();
          return;
        }
        return;
      }

      const data = await postCheckoutSession(
        {
          userId: user.id,
          items: [{ id: itemId, label, price, type }],
        },
        '',
      );
      if (!data.url) throw new Error(data.error || 'No checkout URL');

      setCheckoutUrl(data.url);
      setPendingId(data.pendingId || null);
      setStep('pending');
      const w = window.open(data.url, '_blank', 'width=500,height=700');
      // Safari/anti-popup: fallback para mesma aba.
      if (!w || w.closed || typeof w.closed === 'undefined') {
        window.location.href = data.url;
        return;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : T('toast_checkout_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (CHECKOUT_PROVIDER === 'moonpay') {
        setStep('done');
        onSuccess?.();
        toast.success('Pagamento enviado via MoonPay.');
        return;
      }
      if (!pendingId) throw new Error('Sem pendingId para confirmar pagamento');
      const res = await fetch('/api/checkout/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId }),
      });
      const data = (await res.json().catch(() => ({}))) as { fulfilled?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      if (!data.fulfilled) {
        toast.error('Pagamento ainda não confirmado. Finaliza no Stripe e tenta novamente.');
        return;
      }
      setStep('done');
      onSuccess?.();
      toast.success(T('toast_payment_confirming'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : T('toast_checkout_error'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') return (
    <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
      <CheckCircle className="w-4 h-4" /> {T('stripe_co_activated')}
    </div>
  );

  if (step === 'pending') return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-3"
      style={{ borderColor: `${accentColor}40`, background: `${accentColor}08` }}>
      <p className="text-sm font-bold text-[var(--text)]">
        {T('stripe_co_complete_title')}
      </p>
      <p className="text-xs text-[var(--text2)]">
        {T('stripe_co_complete_hint')}
      </p>
      <div className="flex gap-2">
        <button onClick={handleConfirm} disabled={loading}
          className="btn-primary flex-1 justify-center text-sm py-2 gap-2"
          style={{ background: accentColor }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} {T('stripe_co_i_paid')}
        </button>
        <a href={checkoutUrl} target="_blank" rel="noopener"
          className="btn-secondary px-3 py-2">
          <ExternalLink className="w-4 h-4" />
        </a>
        <button onClick={() => setStep('idle')} className="btn-secondary px-3 py-2">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (compact) return (
    <button onClick={handlePay} disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
      style={{ background: accentColor, color: '#fff' }}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
      {T('stripe_co_pay').replace('${amount}', String(price))}
    </button>
  );

  return (
    <button onClick={handlePay} disabled={loading}
      className="btn-primary w-full justify-center gap-2 py-3"
      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
      {loading
        ? <><Loader2 className="w-4 h-4 animate-spin" /> {T('stripe_co_creating')}</>
        : <><Zap className="w-4 h-4" /> {buttonText || T('stripe_co_pay').replace('${amount}', String(price))}</>}
    </button>
  );
}
