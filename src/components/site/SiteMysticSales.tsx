'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FileDown, Sparkles, ShoppingCart } from 'lucide-react';
import type { MiniSite } from '@/hooks/useSite';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { PLATFORM_USD } from '@/lib/platformPricing';

type Props = {
  site: MiniSite;
  isOwner: boolean;
  accentColor: string;
  textColor: string;
  textMuted: string;
};

export function SiteMysticSales({ site, isOwner, accentColor, textColor, textMuted }: Props) {
  const T = useT();
  const { user } = useAuth();
  const { add, open } = useCart();
  const [tarotLeft, setTarotLeft] = useState(0);
  const [lotteryLeft, setLotteryLeft] = useState(0);
  const [busy, setBusy] = useState<'tarot' | 'lottery' | null>(null);
  const [tarotCtx, setTarotCtx] = useState('');
  const [lotteryCtx, setLotteryCtx] = useState('');
  const [tarotOut, setTarotOut] = useState('');
  const [lotteryOut, setLotteryOut] = useState('');
  const [lastPendingId, setLastPendingId] = useState<string | null>(null);
  const [paidLotteryNums, setPaidLotteryNums] = useState<{ main: number[]; stars: number[] } | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const mysticPaidHandled = useRef<string | null>(null);

  const enabled = (site as any).mystic_public_enabled === true;
  const tarotPrice = Math.max(0.5, Number((site as any).mystic_tarot_price_usd) || PLATFORM_USD.mysticTarotDefault);
  const lotteryPrice = Math.max(
    0.5,
    Number((site as any).mystic_lottery_premium_price_usd) || PLATFORM_USD.mysticLotteryPremiumDefault,
  );
  const stripeOk = !!(site as any).stripe_connect_charges_enabled && !!(site as any).stripe_connect_account_id;

  const refreshEntitlements = useCallback(async () => {
    if (!user?.id || !site.id) {
      setTarotLeft(0);
      setLotteryLeft(0);
      return;
    }
    const { data, error } = await supabase
      .from('mystic_entitlements' as any)
      .select('service, uses_remaining')
      .eq('buyer_id', user.id)
      .eq('site_id', site.id);
    if (error) {
      setTarotLeft(0);
      setLotteryLeft(0);
      return;
    }
    let t = 0;
    let l = 0;
    for (const row of data || []) {
      const s = (row as { service?: string; uses_remaining?: number }).service;
      const u = Number((row as { uses_remaining?: number }).uses_remaining) || 0;
      if (s === 'tarot') t += u;
      if (s === 'lottery_premium') l += u;
    }
    setTarotLeft(t);
    setLotteryLeft(l);
  }, [user?.id, site.id]);

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  useEffect(() => {
    if (typeof window === 'undefined' || !site?.id) return;
    const sp = new URLSearchParams(window.location.search);
    const cancel = sp.get('mystic_cancel');
    if (cancel === '1') {
      toast.message(T('mystic_sales_pay_cancel'));
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const paid = sp.get('mystic_paid');
    if (!paid || !user?.id) return;
    if (mysticPaidHandled.current === paid) return;
    mysticPaidHandled.current = paid;

    const run = async () => {
      setCompleteBusy(true);
      try {
        const res = await fetch('/api/mystic/complete-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingId: paid }),
        });
        const data = await res.json();
        const pathOnly = window.location.pathname;
        window.history.replaceState({}, '', pathOnly);
        if (!res.ok) {
          mysticPaidHandled.current = null;
          toast.error(typeof data.error === 'string' ? data.error : T('mystic_sales_pay_fail'));
          return;
        }
        if (data.siteId && data.siteId !== site.id) {
          mysticPaidHandled.current = null;
          toast.message(T('mystic_sales_pay_wrong_site'));
          return;
        }
        setLastPendingId(paid);
        if (data.tarot?.text) setTarotOut(String(data.tarot.text));
        if (data.lottery?.main?.length) {
          setPaidLotteryNums({
            main: data.lottery.main as number[],
            stars: (data.lottery.stars || []) as number[],
          });
          if (data.lottery.text) setLotteryOut(String(data.lottery.text));
        }
        toast.success(T('mystic_sales_pay_ok'));
        await refreshEntitlements();
      } catch {
        mysticPaidHandled.current = null;
        toast.error(T('mystic_sales_net_complete'));
      } finally {
        setCompleteBusy(false);
      }
    };
    void run();
  }, [user?.id, site?.id, refreshEntitlements]);

  const downloadLotteryPdf = async () => {
    if (!lastPendingId) {
      toast.message(T('mystic_sales_no_receipt'));
      return;
    }
    try {
      const res = await fetch('/api/mystic/receipt-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId: lastPendingId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === 'string' ? j.error : T('mystic_sales_pdf_fail'));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lottery-${site.slug || 'receipt'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(T('mystic_sales_pdf_ok'));
    } catch {
      toast.error(T('mystic_sales_pdf_err'));
    }
  };

  if (!enabled) return null;

  const addTarot = () => {
    if (!user) {
      toast.message(T('mystic_sales_login_cart'));
      return;
    }
    if (isOwner) {
      toast.message(T('mystic_sales_owner_preview'));
      return;
    }
    if (!stripeOk) {
      toast.error(T('mystic_sales_stripe_visitor'));
      return;
    }
    add({
      id: `mystic_tarot_${site.id}`,
      label: T('mystic_cart_tarot_label').replace('{name}', site.site_name || ''),
      price: tarotPrice,
      type: 'mystic_tarot',
    });
  };

  const addLottery = () => {
    if (!user) {
      toast.message(T('mystic_sales_login_cart'));
      return;
    }
    if (isOwner) {
      toast.message(T('mystic_sales_owner_preview'));
      return;
    }
    if (!stripeOk) {
      toast.error(T('mystic_sales_stripe_visitor'));
      return;
    }
    add({
      id: `mystic_lottery_${site.id}`,
      label: T('mystic_cart_lottery_label').replace('{name}', site.site_name || ''),
      price: lotteryPrice,
      type: 'mystic_lottery',
    });
  };

  const runRead = async (service: 'tarot' | 'lottery_premium') => {
    if (!user) {
      toast.message(T('mystic_sales_login_use'));
      return;
    }
    setBusy(service === 'tarot' ? 'tarot' : 'lottery');
    try {
      const res = await fetch('/api/mystic/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: site.id,
          service,
          context: service === 'tarot' ? tarotCtx : lotteryCtx,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('mystic_sales_request_fail'));
        return;
      }
      if (service === 'tarot') setTarotOut(String(data.text || ''));
      else setLotteryOut(String(data.text || ''));
      await refreshEntitlements();
    } catch {
      toast.error(T('mystic_sales_net'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        marginTop: 20,
        marginBottom: 8,
        padding: '16px 18px',
        borderRadius: 16,
        border: `1.5px solid ${accentColor}55`,
        background: `${accentColor}12`,
        maxWidth: 440,
        marginLeft: 'auto',
        marginRight: 'auto',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Sparkles style={{ width: 20, height: 20, color: accentColor }} />
        <span style={{ fontWeight: 900, fontSize: 15, color: textColor }}>{T('mystic_sales_title')}</span>
      </div>
      <p style={{ fontSize: 12, color: textMuted, lineHeight: 1.5, margin: '0 0 14px' }}>{T('mystic_sales_intro')}</p>

      {completeBusy && (
        <p style={{ fontSize: 12, color: accentColor, fontWeight: 700, marginBottom: 10 }}>{T('mystic_sales_confirming')}</p>
      )}

      {!stripeOk && (
        <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 12 }}>
          {isOwner ? T('mystic_sales_stripe_owner') : T('mystic_sales_stripe_visitor')}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${accentColor}33`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: textColor, fontSize: 14 }}>{T('mystic_sales_tarot_heading')}</span>
            <span style={{ fontWeight: 900, color: accentColor }}>US$ {tarotPrice.toFixed(2)}</span>
          </div>
          {user && tarotLeft > 0 && (
            <p style={{ fontSize: 11, color: '#86efac', marginTop: 6 }}>{T('mystic_sales_reads_left').replace('{n}', String(tarotLeft))}</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                addTarot();
                open();
              }}
              disabled={isOwner || !stripeOk}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: isOwner || !stripeOk ? 'not-allowed' : 'pointer',
                opacity: isOwner || !stripeOk ? 0.55 : 1,
                background: accentColor,
                color: '#fff',
              }}
            >
              <ShoppingCart style={{ width: 15, height: 15 }} /> {T('mystic_sales_cart')}
            </button>
          </div>
          {user && !isOwner && (
            <>
              <textarea
                value={tarotCtx}
                onChange={(e) => setTarotCtx(e.target.value.slice(0, 400))}
                placeholder={T('mystic_sales_tarot_ph')}
                rows={2}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 8,
                  borderRadius: 10,
                  border: `1px solid ${accentColor}44`,
                  background: 'rgba(0,0,0,0.25)',
                  color: textColor,
                  fontSize: 13,
                  resize: 'none',
                }}
              />
              <button
                type="button"
                disabled={busy !== null || tarotLeft < 1}
                onClick={() => runRead('tarot')}
                style={{
                  marginTop: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${accentColor}`,
                  background: 'transparent',
                  color: accentColor,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: busy !== null || tarotLeft < 1 ? 'not-allowed' : 'pointer',
                  opacity: tarotLeft < 1 ? 0.5 : 1,
                }}
              >
                {busy === 'tarot' ? T('mystic_sales_generating') : T('mystic_sales_use_reading')}
              </button>
            </>
          )}
          {tarotOut ? (
            <pre
              style={{
                marginTop: 12,
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                lineHeight: 1.55,
                color: textColor,
                fontFamily: 'inherit',
              }}
            >
              {tarotOut}
            </pre>
          ) : null}
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${accentColor}33`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: textColor, fontSize: 14 }}>{T('mystic_sales_lottery_heading')}</span>
            <span style={{ fontWeight: 900, color: accentColor }}>US$ {lotteryPrice.toFixed(2)}</span>
          </div>
          {user && lotteryLeft > 0 && (
            <p style={{ fontSize: 11, color: '#86efac', marginTop: 6 }}>{T('mystic_sales_uses_left').replace('{n}', String(lotteryLeft))}</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                addLottery();
                open();
              }}
              disabled={isOwner || !stripeOk}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: isOwner || !stripeOk ? 'not-allowed' : 'pointer',
                opacity: isOwner || !stripeOk ? 0.55 : 1,
                background: accentColor,
                color: '#fff',
              }}
            >
              <ShoppingCart style={{ width: 15, height: 15 }} /> {T('mystic_sales_cart')}
            </button>
          </div>
          {user && !isOwner && (
            <>
              <textarea
                value={lotteryCtx}
                onChange={(e) => setLotteryCtx(e.target.value.slice(0, 400))}
                placeholder={T('mystic_sales_lottery_ph')}
                rows={2}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 8,
                  borderRadius: 10,
                  border: `1px solid ${accentColor}44`,
                  background: 'rgba(0,0,0,0.25)',
                  color: textColor,
                  fontSize: 13,
                  resize: 'none',
                }}
              />
              <button
                type="button"
                disabled={busy !== null || lotteryLeft < 1}
                onClick={() => runRead('lottery_premium')}
                style={{
                  marginTop: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${accentColor}`,
                  background: 'transparent',
                  color: accentColor,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: busy !== null || lotteryLeft < 1 ? 'not-allowed' : 'pointer',
                  opacity: lotteryLeft < 1 ? 0.5 : 1,
                }}
              >
                {busy === 'lottery' ? T('mystic_sales_generating') : T('mystic_sales_use_credit')}
              </button>
            </>
          )}
          {paidLotteryNums && paidLotteryNums.main.length > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${accentColor}22, transparent)`,
                border: `1px solid ${accentColor}44`,
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: accentColor, textTransform: 'uppercase' }}>
                {T('mystic_sales_combo_title')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                {paidLotteryNums.main.map((n, i) => (
                  <span
                    key={`${i}-${n}`}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 16,
                      background: accentColor,
                      color: '#fff',
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
              {paidLotteryNums.stars.length > 0 && (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: textColor }}>
                  {T('mystic_sales_stars')} {paidLotteryNums.stars.join(' · ')}
                </p>
              )}
              {lastPendingId && (
                <button
                  type="button"
                  onClick={() => void downloadLotteryPdf()}
                  style={{
                    marginTop: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: `1.5px solid ${accentColor}`,
                    background: 'transparent',
                    color: accentColor,
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <FileDown style={{ width: 16, height: 16 }} /> {T('mystic_sales_pdf')}
                </button>
              )}
            </div>
          )}
          {lotteryOut ? (
            <pre
              style={{
                marginTop: 12,
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                lineHeight: 1.55,
                color: textColor,
                fontFamily: 'inherit',
              }}
            >
              {lotteryOut}
            </pre>
          ) : null}
        </div>
      </div>

      {user && (
        <p style={{ fontSize: 11, color: textMuted, marginTop: 14, marginBottom: 0 }}>
          {T('mystic_sales_footer')}{' '}
          <Link href="/dashboard" style={{ color: accentColor, fontWeight: 700 }}>
            {T('mystic_sales_footer_dashboard')}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
