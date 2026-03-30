'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Zap, ChevronRight, Sparkles } from 'lucide-react';

interface JackpotBannerProps {
  compact?: boolean;    // small widget for mini-site embedding
  showInSite?: boolean; // user opted in to show on their mini-site
  accentColor?: string;
}

export function JackpotBanner({ compact = false, showInSite = false, accentColor = '#818cf8' }: JackpotBannerProps) {
  const [pool, setPool] = useState<{ balance_usdc: number; total_entries: number; enabled: boolean } | null>(null);
  const [prev, setPrev] = useState(0);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('jackpot_pool')
      .select('balance_usdc, total_entries, enabled')
      .maybeSingle();
    if (data) {
      setPool(data);
      if (data.balance_usdc !== prev && prev > 0) {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      }
      setPrev(data.balance_usdc);
    }
  };

  useEffect(() => {
    load();
    // Poll every 30s for live updates
    intervalRef.current = setInterval(load, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (!pool?.enabled) return null;

  const amount = pool.balance_usdc || 0;
  const entries = pool.total_entries || 0;

  // ── Compact widget (for mini-site) ────────────────────────────────────────
  if (compact || showInSite) {
    return (
      <a href="/jackpot" target="_blank" rel="noopener"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 999, textDecoration: 'none',
          background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`,
          border: `1px solid ${accentColor}40`,
          transition: 'all .3s',
          boxShadow: flash ? `0 0 20px ${accentColor}60` : 'none',
        }}>
        <Trophy style={{ width: 16, height: 16, color: '#fbbf24', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1 }}>JACKPOT</div>
          <div style={{
            fontSize: 18, fontWeight: 900, fontFamily: '"Courier New",monospace',
            color: flash ? '#fbbf24' : accentColor,
            textShadow: flash ? `0 0 12px #fbbf24` : 'none',
            transition: 'all .3s', lineHeight: 1.2,
          }}>
            ${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <Sparkles style={{ width: 14, height: 14, color: '#fbbf24', animation: 'spin 3s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </a>
    );
  }

  // ── Full banner (homepage) ────────────────────────────────────────────────
  return (
    <div style={{
      background: 'linear-gradient(135deg,#1a0a00,#261200,#1a0a00)',
      border: '1px solid rgba(251,191,36,.2)',
      borderRadius: 16, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: flash ? '0 0 40px rgba(251,191,36,.3)' : '0 0 0 1px rgba(251,191,36,.1)',
      transition: 'box-shadow .3s',
    }}>
      {/* Trophy */}
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(251,191,36,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(251,191,36,.3)' }}>
        <Trophy style={{ width: 24, height: 24, color: '#fbbf24' }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(251,191,36,.7)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            🎰 Jackpot Acumulado
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{entries.toLocaleString()} tickets</span>
        </div>
        <div style={{
          fontSize: 32, fontWeight: 900,
          fontFamily: '"Courier New", "Courier", monospace',
          color: flash ? '#fef08a' : '#fbbf24',
          textShadow: flash ? '0 0 20px #fbbf24, 0 0 40px #f59e0b80' : '0 0 8px #fbbf2440',
          transition: 'all .3s', lineHeight: 1.1, letterSpacing: '-0.02em',
        }}>
          ${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 16, color: 'rgba(251,191,36,.6)' }}>USDC</span>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: '4px 0 0' }}>
          20% de cada boost vai para o jackpot · Admin sorteia quando quiser
        </p>
      </div>

      {/* CTA */}
      <a href="/jackpot" style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12,
        background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
        fontWeight: 700, fontSize: 13, textDecoration: 'none', flexShrink: 0,
        boxShadow: '0 4px 16px rgba(245,158,11,.4)',
      }}>
        <Zap style={{ width: 14, height: 14 }} />
        Participar
        <ChevronRight style={{ width: 14, height: 14 }} />
      </a>
    </div>
  );
}
