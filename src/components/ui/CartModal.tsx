'use client';
import { useCart } from '@/store/cart';
import { useAuth } from '@/hooks/useAuth';
import { X, Coins, Check, Loader2, ShoppingCart, ExternalLink, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { publicSiteUrlFromEnv } from '@/lib/publicSiteUrl';
import { postCheckoutSession } from '@/lib/checkoutClient';

const POLYGON_WALLET_LS = 'tb_checkout_polygon_wallet';
const CHECKOUT_PROVIDER = 'stripe';
const MOONPAY_CHECKOUT_URL = (process.env.NEXT_PUBLIC_MOONPAY_CHECKOUT_URL || '').trim();
const HELIO_PAYLINK_ID = (process.env.NEXT_PUBLIC_HELIO_PAYLINK_ID || '').trim();
const HELIO_PAYLINK_URL = (process.env.NEXT_PUBLIC_HELIO_PAYLINK_URL || '').trim();
const HELIO_EMBED_SRC = 'https://embed.hel.io/assets/index-v1.js';
const HELIO_EMBED_INLINE = (process.env.NEXT_PUBLIC_HELIO_EMBED_INLINE || '').trim() === '1';

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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [helioBootError, setHelioBootError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(POLYGON_WALLET_LS);
      if (s) setPolygonWallet(s);
    } catch {
      /* ignore */
    }
  }, []);

  const slugNftCart = cartHasSlugNftEligibleItem(items);
  const CHECKOUT_FALLBACK_BASE = publicSiteUrlFromEnv();
  const isAdminBypass =
    (user?.email || '').toLowerCase() === 'arytcf@gmail.com' &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isOpen) return null;

  useEffect(() => {
    if (step !== 'paying' || CHECKOUT_PROVIDER !== 'helio' || !HELIO_EMBED_INLINE) return;
    const mount = document.getElementById('tb-helio-checkout-container');
    if (!mount) return;
    setHelioBootError(null);

    const startHelio = () => {
      try {
        const fn = (window as any).helioCheckout;
        if (typeof fn !== 'function') {
          setHelioBootError('Helio embed indisponivel no navegador.');
          return;
        }
        mount.innerHTML = '';
        fn(mount, {
          paylinkId: HELIO_PAYLINK_ID,
          theme: { themeMode: 'dark' },
          primaryColor: '#818cf8',
          neutralColor: '#5A6578',
          amount: total().toFixed(2),
          display: 'inline',
          onSuccess: () => {
            clear();
            setStep('done');
            toast.success('Pagamento confirmado via Helio.');
          },
          onError: () => setHelioBootError('Falha no checkout Helio. Tenta novamente.'),
          onPending: () => toast.message('Pagamento pendente na rede. Aguarda confirmacao.'),
          onCancel: () => toast.message('Pagamento cancelado.'),
        });
      } catch {
        setHelioBootError('Nao foi possivel iniciar o Helio checkout.');
      }
    };

    const existing = document.querySelector(`script[src="${HELIO_EMBED_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).helioCheckout) startHelio();
      else existing.addEventListener('load', startHelio, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = HELIO_EMBED_SRC;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', startHelio, { once: true });
    script.addEventListener('error', () => setHelioBootError('Falha ao carregar script do Helio.'), { once: true });
    document.head.appendChild(script);
  }, [step, clear, total]);

  useEffect(() => {
    if (step !== 'paying' || !pendingId || CHECKOUT_PROVIDER !== 'stripe') return;
    let cancelled = false;
    let tries = 0;
    const maxTries = 45; // ~90s
    const timer = setInterval(async () => {
      if (cancelled) return;
      tries += 1;
      try {
        const res = await fetch('/api/checkout/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingId }),
        });
        const data = (await res.json().catch(() => ({}))) as { fulfilled?: boolean };
        if (res.ok && data.fulfilled) {
          clearInterval(timer);
          clear();
          setStep('done');
          toast.success('Pagamento confirmado.');
        } else if (tries >= maxTries) {
          clearInterval(timer);
        }
      } catch {
        if (tries >= maxTries) clearInterval(timer);
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [step, pendingId, clear]);

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
      if (CHECKOUT_PROVIDER === 'moonpay') {
        const onlyPlan = items.every((i) => i.type === 'plan');
        if (!onlyPlan) {
          toast.error('MoonPay ativo: por agora só plano mensal/anual. Slugs e marketplace ficam desativados.');
          return;
        }
        if (!MOONPAY_CHECKOUT_URL) {
          toast.error('Falta NEXT_PUBLIC_MOONPAY_CHECKOUT_URL na Vercel.');
          return;
        }
        const u = new URL(MOONPAY_CHECKOUT_URL);
        // Campos auxiliares para rastreio interno no retorno.
        u.searchParams.set('tb_amount_usd', total().toFixed(2));
        u.searchParams.set('tb_user', user.id);
        const w = window.open(u.toString(), '_blank');
        if (!w || w.closed || typeof w.closed === 'undefined') {
          window.location.href = u.toString();
          return;
        }
        setStep('paying');
        return;
      }
      if (CHECKOUT_PROVIDER === 'helio') {
        const onlyPlan = items.every((i) => i.type === 'plan');
        if (!onlyPlan) {
          toast.error('Helio ativo: por agora so plano mensal/anual. Slugs e marketplace ficam desativados.');
          return;
        }
        if (!HELIO_PAYLINK_URL && !HELIO_PAYLINK_ID) {
          toast.error('Falta NEXT_PUBLIC_HELIO_PAYLINK_URL (ou NEXT_PUBLIC_HELIO_PAYLINK_ID) na Vercel.');
          return;
        }
        const hostedUrl = HELIO_PAYLINK_URL || `https://app.hel.io/pay/${HELIO_PAYLINK_ID}`;
        const u = new URL(hostedUrl);
        u.searchParams.set('tb_amount_usd', total().toFixed(2));
        u.searchParams.set('tb_user', user.id);
        const w = window.open(u.toString(), '_blank');
        if (!w || w.closed || typeof w.closed === 'undefined') {
          window.location.href = u.toString();
          return;
        }
        setStep('paying');
        return;
      }

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
      const data = await postCheckoutSession(
        {
          userId: user.id,
          items,
          ...(slugNftCart && pw ? { polygonWallet: pw } : {}),
        },
        CHECKOUT_FALLBACK_BASE || '',
      );
      if (data.url) {
        setPendingId(data.pendingId || null);
        const w = window.open(data.url, '_blank');
        // Safari/anti-popup: se bloquear nova aba, navega na mesma aba para não perder o pagamento.
        if (!w || w.closed || typeof w.closed === 'undefined') {
          window.location.href = data.url;
          return;
        }
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

  const handleConfirmPaid = async () => {
    setProcessing(true);
    try {
      if (CHECKOUT_PROVIDER === 'moonpay') {
        clear();
        setStep('done');
        toast.success('Pagamento enviado via MoonPay. Se não ativar em instantes, valida no painel MoonPay.');
        return;
      }
      if (CHECKOUT_PROVIDER === 'helio') {
        clear();
        setStep('done');
        toast.success('Pagamento enviado via Helio.');
        return;
      }
      if (!pendingId) {
        toast.error('Ainda sem identificador de pagamento. Reabre o checkout.');
        return;
      }
      const res = await fetch('/api/checkout/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId }),
      });
      const data = (await res.json().catch(() => ({}))) as { fulfilled?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }
      if (!data.fulfilled) {
        toast.error('Pagamento ainda não confirmado. Termina no Stripe e tenta novamente em alguns segundos.');
        return;
      }
      clear();
      setStep('done');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao confirmar pagamento';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { close(); setStep('cart'); setPendingId(null); };

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
              {CHECKOUT_PROVIDER !== 'helio' ? (
                <button onClick={handleConfirmPaid} disabled={processing || CHECKOUT_PROVIDER === 'stripe'}
                  className="btn-primary w-full justify-center py-3 gap-2">
                  {processing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {T('cart_processing')}</>
                    : CHECKOUT_PROVIDER === 'stripe' ? 'Aguardar confirmação automática' : T('cart_i_completed')}
                </button>
              ) : null}
              {CHECKOUT_PROVIDER === 'helio' ? (
                <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg2)]">
                  <p className="text-xs text-[var(--text2)]">
                    Checkout Helio aberto em outra aba. Se nao abriu, desbloqueia pop-up e tenta novamente.
                  </p>
                  <div id="tb-helio-checkout-container" />
                  {helioBootError ? (
                    <p className="text-xs text-red-400 mt-2">{helioBootError}</p>
                  ) : null}
                </div>
              ) : null}
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
