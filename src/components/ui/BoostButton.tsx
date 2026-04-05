'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { PLATFORM_USD } from '@/lib/platformPricing';

type BoostTarget = 'site' | 'classified' | 'video';

interface Props {
  /** Mini-site UUID (boost no diretório de sites) */
  siteId?: string;
  slug?: string;
  targetType?: BoostTarget;
  /** UUID do classificado ou do vídeo quando não for site */
  targetId?: string;
  targetName?: string;
  accentColor?: string;
  compact?: boolean;
}

export function BoostButton({
  siteId,
  slug,
  targetType = 'site',
  targetId,
  targetName,
  accentColor = '#818cf8',
  compact = false,
}: Props) {
  const T = useT();
  const { user } = useAuth();
  const { add, open } = useCart();
  const [openModal, setOpenModal] = useState(false);
  const [score, setScore] = useState(0);
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);

  const usdPerUnit = PLATFORM_USD.boostUsdPerSliderUnit;
  const posPerUnit = PLATFORM_USD.boostPositionsPerSliderUnit;
  const sliderMax = PLATFORM_USD.boostSliderMax;

  useEffect(() => {
    if (targetType === 'site' && siteId) {
      (supabase as any).from('site_boosts').select('amount').eq('site_id', siteId)
        .then(({ data }: any) => {
          if (data) setScore(data.reduce((a: number, b: any) => a + (b.amount || 0), 0));
        });
    } else {
      setScore(0);
    }
  }, [siteId, targetType]);

  const positions = amount * posPerUnit;
  const price = (amount * usdPerUnit).toFixed(2);
  const unitStr = usdPerUnit.toFixed(2);
  const maxTotal = (sliderMax * usdPerUnit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const maxPos = sliderMax * posPerUnit;

  const displayLabel =
    targetType === 'site' && slug
      ? `${slug}.trustbank.xyz`
      : targetName || targetId || 'item';

  const handleBoost = async () => {
    if (!user) { toast.error(T('toast_login_boost')); return; }
    if (targetType === 'site' && !siteId) {
      toast.error(T('toast_boost_error'));
      return;
    }
    if (targetType !== 'site' && !targetId) {
      toast.error(T('toast_boost_error'));
      return;
    }
    setLoading(true);
    try {
      const cartId =
        targetType === 'classified'
          ? `boost_classified_${targetId}_${amount}`
          : targetType === 'video'
            ? `boost_video_${targetId}_${amount}`
            : `boost_${siteId}_${amount}`;
      const label =
        targetType === 'site'
          ? `Boost ${displayLabel} (+${positions} pos.)`
          : `Boost ${targetType} "${displayLabel}" (+${positions})`;
      add({
        id: cartId,
        label,
        price: parseFloat(price),
        type: 'boost',
      });
      open();
      toast.success(T('toast_boost_cart'));
      setOpenModal(false);
    } catch {
      toast.error(T('toast_boost_error'));
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpenModal(true)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '5px 10px' : '7px 14px', borderRadius: 10,
        background: 'transparent', border: '1px solid var(--border)',
        color: 'var(--text2)', cursor: 'pointer', fontSize: compact ? 12 : 13, fontWeight: 700,
        transition: 'all 0.15s',
      }}>
        <Zap size={compact ? 12 : 14} /> Boost
      </button>

      {openModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setOpenModal(false); }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 28, width: '100%', maxWidth: 400,
            position: 'relative',
          }}>
            <button onClick={() => setOpenModal(false)} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)',
            }}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Zap size={20} color={accentColor} />
              <div>
                <p style={{ fontWeight: 900, color: 'var(--text)', fontSize: 18, margin: 0 }}>Boost</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{displayLabel}</p>
              </div>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 4px' }}>Pontuação atual (após pagamentos)</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: accentColor, margin: 0 }}>{score}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  Positions: <span style={{ color: accentColor }}>+{positions}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>${price} USD</span>
              </div>
              <input type="range" min={1} max={sliderMax} value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                style={{ width: '100%', accentColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                <span>+{posPerUnit} (${unitStr})</span>
                <span>+{maxPos.toLocaleString('en-US')} (${maxTotal})</span>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.45 }}>
              <p style={{ margin: '0 0 4px' }}>
                • <span style={{ color: accentColor, fontWeight: 700 }}>${unitStr}</span> = +{posPerUnit} ranking positions (up to ${maxTotal} total for homepage race)
              </p>
              <p style={{ margin: '0 0 4px' }}>
                • <span style={{ fontWeight: 700 }}>{PLATFORM_USD.boostHighlightDays} days</span> highlighted; on day 8 drops <span style={{ fontWeight: 700 }}>{PLATFORM_USD.boostDropPositionsAfterHighlight}</span> positions
              </p>
              <p style={{ margin: '0 0 4px' }}>
                • From day 8, stay in top spots: <span style={{ fontWeight: 700 }}>${PLATFORM_USD.boostTopExtensionUsdPerDay}/day</span> (optional — contact support or future in-app pay)
              </p>
              <p style={{ margin: 0 }}>• Boost applies after Stripe confirms payment</p>
            </div>

            <button onClick={handleBoost} disabled={loading} style={{
              width: '100%', padding: 14,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
              border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
              color: '#fff', fontWeight: 800, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1,
            }}>
              <Zap size={18} />
              Pay · ${price} USD
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text2)', marginTop: 8, marginBottom: 0 }}>
              USD · Stripe
            </p>
          </div>
        </div>
      )}
    </>
  );
}
