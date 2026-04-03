'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Zap, ExternalLink, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

interface StripeCheckoutProps {
  itemId: string;
  label: string;
  price: number;
  type: 'video' | 'cv' | 'slug' | 'plan' | 'boost' | 'classified' | 'credits' | 'brand_ad' | 'directory_company';
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

  const handlePay = async () => {
    if (!user) {
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          items: [{ id: itemId, label, price, type }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCheckoutUrl(data.url);
      setStep('pending');
      window.open(data.url, '_blank', 'width=500,height=700');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : T('toast_checkout_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setStep('done');
    onSuccess?.();
    toast.success(T('toast_payment_confirming'));
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
        <button onClick={handleConfirm}
          className="btn-primary flex-1 justify-center text-sm py-2 gap-2"
          style={{ background: accentColor }}>
          <CheckCircle className="w-4 h-4" /> {T('stripe_co_i_paid')}
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
