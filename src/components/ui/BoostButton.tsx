'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { Zap, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  siteId: string;
  slug: string;
  accentColor?: string;
}

export function BoostButton({ siteId, slug, accentColor = '#818cf8' }: Props) {
  const { user } = useAuth();
  const { add, open } = useCart();
  const [openModal, setOpenModal] = useState(false);
  const [score, setScore] = useState(0);
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    (supabase as any).from('site_boosts').select('amount').eq('site_id', siteId)
      .then(({ data }: any) => {
        if (data) setScore(data.reduce((a: number, b: any) => a + (b.amount || 0), 0));
      });
  }, [siteId]);

  const positions = amount * 2;
  const price = (amount * 0.5).toFixed(2);

  const handleBoost = async () => {
    if (!user) { toast.error('Faça login para dar boost'); return; }
    setLoading(true);
    try {
      add({
        id: `boost_${siteId}_${amount}`,
        label: `Boost ${slug}.trustbank.xyz (+${positions} posições)`,
        price: parseFloat(price),
        type: 'boost',
      });
      open();
      toast.success('Abra o carrinho e pague com USDC para ativar o boost.');
      setOpenModal(false);
    } catch {
      toast.error('Erro');
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpenModal(true)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 10,
        background: 'transparent', border: '1px solid var(--border)',
        color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
        transition: 'all 0.15s',
      }}>
        <Zap size={14} /> Boost
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
            borderRadius: 20, padding: 28, width: '100%', maxWidth: 380,
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
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{slug}.trustbank.xyz</p>
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
                <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>${price} USDC</span>
              </div>
              <input type="range" min={1} max={2000} value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                style={{ width: '100%', accentColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                <span>+1 ($0.50)</span>
                <span>+2,000 ($1,000)</span>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
              <p style={{ margin: '0 0 4px' }}>• <span style={{ color: accentColor, fontWeight: 700 }}>$0.50</span> = +1 ranking position</p>
              <p style={{ margin: '0 0 4px' }}>• Stays in top for <span style={{ fontWeight: 700 }}>7 days</span>, then drops 150 positions</p>
              <p style={{ margin: 0 }}>• O boost só conta após confirmação do pagamento (Helio)</p>
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
              Ir para pagamento · ${price} USDC
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text2)', marginTop: 8, marginBottom: 0 }}>
              USDC · Polygon · Helio
            </p>
          </div>
        </div>
      )}
    </>
  );
}
