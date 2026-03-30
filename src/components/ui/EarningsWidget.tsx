'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Coins, Zap, Eye, Lock } from 'lucide-react';

interface EarningsWidgetProps {
  userId: string;
  accentColor?: string;
  compact?: boolean;
}

interface Stats {
  totalEarned: number;
  videoUnlocks: number;
  cvUnlocks: number;
  boostReceived: number;
  credits: number;
  jackpotTickets: number;
}

function AnimatedNumber({ value, prefix = '', decimals = 2 }: { value: number; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const duration = 1200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else { setDisplay(to); prevRef.current = to; }
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <span>{prefix}{display.toFixed(decimals)}</span>;
}

export function EarningsWidget({ userId, accentColor = '#818cf8', compact = false }: EarningsWidgetProps) {
  const [stats, setStats] = useState<Stats>({ totalEarned: 0, videoUnlocks: 0, cvUnlocks: 0, boostReceived: 0, credits: 0, jackpotTickets: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [unlocksRes, creditsRes, boostsRes, ticketsRes] = await Promise.all([
        (supabase as any).from('paywall_unlocks').select('amount_paid').eq('creator_id', userId),
        (supabase as any).from('credit_wallets').select('balance').eq('user_id', userId).maybeSingle(),
        (supabase as any).from('boosts').select('amount').eq('target_id', userId),
        (supabase as any).from('jackpot_entries').select('tickets').eq('user_id', userId).is('draw_id', null),
      ]);

      const videoEarnings = (unlocksRes.data || []).filter((u: any) => u.source !== 'cv').reduce((s: number, u: any) => s + (u.amount_paid || 0), 0);
      const cvEarnings    = (unlocksRes.data || []).filter((u: any) => u.source === 'cv').reduce((s: number, u: any) => s + (u.amount_paid || 0), 0);
      const boostTotal    = (boostsRes.data || []).reduce((s: number, b: any) => s + (b.amount || 0), 0);
      const tickets       = (ticketsRes.data || []).reduce((s: number, t: any) => s + (t.tickets || 0), 0);

      setStats({
        totalEarned: videoEarnings + cvEarnings,
        videoUnlocks: (unlocksRes.data || []).filter((u: any) => u.source !== 'cv').length,
        cvUnlocks: (unlocksRes.data || []).filter((u: any) => u.source === 'cv').length,
        boostReceived: boostTotal,
        credits: creditsRes.data?.balance || 0,
        jackpotTickets: tickets,
      });
      setLoading(false);
    };
    load();
    // Refresh every 60s
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading) return null;

  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: accentColor + '15', border: `1px solid ${accentColor}30` }}>
        <TrendingUp style={{ width: 13, height: 13, color: accentColor }} />
        <span style={{ fontSize: 13, fontWeight: 900, color: accentColor }}>
          $<AnimatedNumber value={stats.totalEarned} prefix="" />
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>earned</span>
      </div>
    );
  }

  return (
    <div className="card p-4" style={{ borderColor: accentColor + '30' }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4" style={{ color: accentColor }} />
        <span className="font-black text-sm text-[var(--text)]">Earnings</span>
        <span className="ml-auto text-xs text-[var(--text2)]">live</span>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      </div>

      {/* Main number */}
      <div className="text-center py-3 mb-4 rounded-xl" style={{ background: accentColor + '10' }}>
        <p className="text-3xl font-black" style={{ color: accentColor }}>
          $<AnimatedNumber value={stats.totalEarned} />
        </p>
        <p className="text-xs text-[var(--text2)] mt-1">Total earned in USDC</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        {[
          { icon: <Eye className="w-3.5 h-3.5" />, label: 'Video unlocks', value: `${stats.videoUnlocks} sales` },
          { icon: <Lock className="w-3.5 h-3.5" />, label: 'CV unlocks', value: `${stats.cvUnlocks} views` },
          { icon: <Zap className="w-3.5 h-3.5" />, label: 'Boost received', value: `$${stats.boostReceived.toFixed(2)}` },
          { icon: <Coins className="w-3.5 h-3.5" />, label: 'Credits balance', value: `${stats.credits.toLocaleString()} cr` },
        ].map(row => (
          <div key={row.label} className="flex items-center gap-2.5 text-xs">
            <span style={{ color: accentColor }}>{row.icon}</span>
            <span className="flex-1 text-[var(--text2)]">{row.label}</span>
            <span className="font-bold text-[var(--text)]">{row.value}</span>
          </div>
        ))}
        {stats.jackpotTickets > 0 && (
          <div className="flex items-center gap-2.5 text-xs pt-1 border-t border-[var(--border)]">
            <span className="text-amber-400">🎰</span>
            <span className="flex-1 text-[var(--text2)]">Jackpot tickets</span>
            <span className="font-bold text-amber-400">{stats.jackpotTickets}</span>
          </div>
        )}
      </div>
    </div>
  );
}
