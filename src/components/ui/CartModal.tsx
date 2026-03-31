'use client';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import { X, Coins, Check, Loader2, ShoppingCart, ExternalLink, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function CartModal() {
  const { items, isOpen, close, remove, clear, total } = useCart();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'cart' | 'paying' | 'done'>('cart');

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) { 
      window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
      return; 
    }
    if (items.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId: user.id, items }),
      });
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || '' }; }
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      if (data.url) {
        window.open(data.url, '_blank');
        setStep('paying');
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        toast.error('Falha de conexao com checkout. Verifique deploy/env e tente novamente.');
      } else {
        toast.error(msg || 'Checkout error');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Called after user returns from Helio payment
  const handleConfirmPaid = async () => {
    setProcessing(true);
    // Webhook handles activation automatically.
    // Just clear cart and show success.
    clear();
    setStep('done');
    setProcessing(false);
  };

  const reset = () => { close(); setStep('cart'); };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" style={{pointerEvents: isOpen ? 'auto' : 'none'}}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl" style={{pointerEvents: 'auto'}}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand" />
            <h2 className="font-black text-[var(--text)]">Cart</h2>
            {items.length > 0 && (
              <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">
                {items.length}
              </span>
            )}
          </div>
          <button onClick={reset}><X className="w-5 h-5 text-[var(--text2)]" /></button>
        </div>

        {/* Cart step */}
        {step === 'cart' && (
          <div className="p-5">
            {items.length === 0 ? (
              <p className="text-center text-[var(--text2)] py-8 text-sm">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-2 mb-5 max-h-64 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-[var(--bg2)] rounded-xl px-4 py-3 border border-[var(--border)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text)] truncate">{item.label}</p>
                        <p className="text-xs text-[var(--text2)]">${item.price.toFixed(2)} USDC</p>
                      </div>
                      <button onClick={() => remove(item.id)} className="text-red-400 hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between py-3 border-t border-[var(--border)] mb-4">
                  <span className="font-black text-[var(--text)]">Total</span>
                  <span className="font-black text-2xl text-brand">${total().toFixed(2)} USDC</span>
                </div>

                <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 mb-4 text-xs text-[var(--text2)]">
                  <p className="flex items-center gap-1.5 font-semibold text-[var(--text)] mb-1">
                    <Coins className="w-3.5 h-3.5 text-brand" /> Secure USDC Payment · Polygon
                  </p>
                  <p>Pay with MetaMask, Rainbow, or credit card via Helio. Splits happen automatically on-chain.</p>
                </div>

                <button onClick={handleCheckout} disabled={processing}
                  className="btn-primary w-full justify-center py-3.5 text-base gap-2">
                  {processing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating checkout...</>
                    : <><Zap className="w-4 h-4" /> Pay ${total().toFixed(2)} USDC</>}
                </button>
                <p className="text-[10px] text-center text-[var(--text2)] mt-2">
                  Powered by Helio · USDC or Card · Polygon Network
                </p>
              </>
            )}
          </div>
        )}

        {/* Paying step */}
        {step === 'paying' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto">
              <ExternalLink className="w-8 h-8 text-brand" />
            </div>
            <p className="font-black text-[var(--text)] text-lg">Complete payment in the new tab</p>
            <p className="text-sm text-[var(--text2)]">
              Helio checkout is open. Pay with your wallet or credit card.<br />
              Your items activate automatically after payment is confirmed.
            </p>
            <div className="space-y-2">
              <button onClick={handleConfirmPaid} disabled={processing}
                className="btn-primary w-full justify-center py-3 gap-2">
                {processing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  : '✅ I completed payment'}
              </button>
              <button onClick={() => setStep('cart')} className="w-full text-xs text-[var(--text2)] py-2 hover:text-[var(--text)]">
                ← Back to cart
              </button>
            </div>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-black text-[var(--text)] text-xl mb-2">🎉 Payment received!</p>
            <p className="text-sm text-[var(--text2)] mb-6">
              Your items will be activated within a few seconds via webhook.
            </p>
            <button onClick={reset} className="btn-primary px-8 py-3">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
