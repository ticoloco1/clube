'use client';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import { X, Coins, Check, Loader2, ShoppingCart, ExternalLink, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { normalizePublicSiteUrl } from '@/lib/publicSiteUrl';

const POLYGON_WALLET_LS = 'tb_checkout_polygon_wallet';

function cartHasSlugNftEligibleItem(items: { id: string; type: string }[]): boolean {
  return items.some((i) => {
    if (i.type === 'slug') return true;
    if (i.id.startsWith('slug_bid_')) return false;
    return (
      i.id.startsWith('slug_market_') ||
      i.id.startsWith('slug_auction_pay_') ||
      /^slug_prem_/i.test(i.id) ||
      /^slug_[a-z0-9]/i.test(i.id)
    );
  });
}

export function CartModal() {
  const T = useT();
  const { items, isOpen, close, remove, clear, total } = useCart();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'cart' | 'paying' | 'done'>('cart');
  const [polygonWallet, setPolygonWallet] = useState('');

  useEffect(() => {
    try {
      const s = localStorage.getItem(POLYGON_WALLET_LS);
      if (s) setPolygonWallet(s);
    } catch {
      /* ignore */
    }
  }, []);

  const slugNftCart = cartHasSlugNftEligibleItem(items);
  const CHECKOUT_FALLBACK_BASE = normalizePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const isAdminBypass = (user?.email || '').toLowerCase() === 'arytcf@gmail.com';

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) { 
      window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
      return; 
    }
    if (items.length === 0) return;
    if (isAdminBypass) {
      clear();
      setStep('done');
      toast.success(T('toast_admin_bypass_checkout'));
      return;
    }
    setProcessing(true);
    try {
      const pw = polygonWallet.trim();
      if (slugNftCart && pw && !/^0x[a-fA-F0-9]{40}$/i.test(pw)) {
        toast.error('Polygon: use um endereço 0x com 40 caracteres hexadecimais.');
        setProcessing(false);
        return;
      }
      if (slugNftCart && pw) {
        try {
          localStorage.setItem(POLYGON_WALLET_LS, pw.toLowerCase());
        } catch {
          /* ignore */
        }
      }
      const payload = JSON.stringify({
        userId: user.id,
        items,
        ...(slugNftCart && pw ? { polygonWallet: pw } : {}),
      });
      const urls = ['/api/checkout', CHECKOUT_FALLBACK_BASE ? `${CHECKOUT_FALLBACK_BASE}/api/checkout` : ''].filter(Boolean);
      let data: any = {};
      let lastErr: any = null;

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: payload,
          });
          const raw = await res.text();
          try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw || '' }; }
          if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
        }
      }
      if (lastErr) throw lastErr;
      if (data.url) {
        window.open(data.url, '_blank');
        setStep('paying');
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
        toast.error(T('toast_checkout_failed'));
      } else {
        toast.error(msg || T('toast_checkout_error'));
      }
    } finally {
      setProcessing(false);
    }
  };

  // Called after user returns from Stripe Checkout
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
            <h2 className="font-black text-[var(--text)]">{T('cart_title')}</h2>
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
                        <p className="text-xs text-[var(--text2)]">${item.price.toFixed(2)} USD</p>
                      </div>
                      <button onClick={() => remove(item.id)} className="text-red-400 hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between py-3 border-t border-[var(--border)] mb-4">
                  <span className="font-black text-[var(--text)]">{T('cart_total')}</span>
                  <span className="font-black text-2xl text-brand">${total().toFixed(2)} USD</span>
                </div>

                <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 mb-4 text-xs text-[var(--text2)]">
                  <p className="flex items-center gap-1.5 font-semibold text-[var(--text)] mb-1">
                    <Coins className="w-3.5 h-3.5 text-brand" /> {T('cart_secure_title')}
                  </p>
                  <p>{T('cart_secure_body')}</p>
                </div>

                {slugNftCart ? (
                  <div className="mb-4 space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--text)]" htmlFor="tb-cart-polygon-wallet">
                      {T('cart_polygon_wallet_label')}
                    </label>
                    <input
                      id="tb-cart-polygon-wallet"
                      value={polygonWallet}
                      onChange={(e) => setPolygonWallet(e.target.value)}
                      className="input w-full text-sm font-mono"
                      placeholder={T('cart_polygon_wallet_ph')}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="text-[10px] text-[var(--text2)] leading-relaxed">{T('cart_polygon_wallet_hint')}</p>
                  </div>
                ) : null}

                <button onClick={handleCheckout} disabled={processing}
                  className="btn-primary w-full justify-center py-3.5 text-base gap-2">
                  {processing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {T('cart_creating')}</>
                    : <><Zap className="w-4 h-4" /> {T('cart_pay').replace('${amount}', total().toFixed(2))}</>}
                </button>
                <p className="text-[10px] text-center text-[var(--text2)] mt-2">
                  {T('cart_powered')}
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
            <p className="font-black text-[var(--text)] text-lg">{T('cart_pay_tab_title')}</p>
            <p className="text-sm text-[var(--text2)]">
              {T('cart_pay_tab_body').split('\n').map((line, i) => (
                <span key={i}>{i > 0 && <br />}{line}</span>
              ))}
            </p>
            <div className="space-y-2">
              <button onClick={handleConfirmPaid} disabled={processing}
                className="btn-primary w-full justify-center py-3 gap-2">
                {processing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {T('cart_processing')}</>
                  : T('cart_i_completed')}
              </button>
              <button onClick={() => setStep('cart')} className="w-full text-xs text-[var(--text2)] py-2 hover:text-[var(--text)]">
                {T('cart_back')}
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
            <p className="font-black text-[var(--text)] text-xl mb-2">{T('cart_done_title')}</p>
            <p className="text-sm text-[var(--text2)] mb-6">
              {T('cart_done_body')}
            </p>
            <button onClick={reset} className="btn-primary px-8 py-3">{T('cart_close')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
