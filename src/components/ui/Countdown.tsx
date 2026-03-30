'use client';
import { useEffect, useState } from 'react';

interface CountdownProps {
  expiresAt: string;
  size?: 'sm' | 'md';
  showDays?: boolean;
}

export function Countdown({ expiresAt, size = 'sm', showDays = false }: CountdownProps) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [expired, setExpired] = useState(false);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setParts({ d, h, m, s });
      setUrgent(diff < 3600000); // red when < 1 hour
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (expired) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-black"
      style={{ background: '#1a0000', color: '#ff4444', border: '1px solid #ff444430' }}>
      EXPIRADO
    </span>
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const color = urgent ? '#ff4444' : '#00ff41';
  const glow = urgent ? '#ff444480' : '#00ff4180';

  if (size === 'md') {
    return (
      <div className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5"
        style={{ background: '#000', border: `1px solid ${color}30` }}>
        {showDays && parts.d > 0 && (
          <>
            <Digit val={pad(parts.d)} color={color} glow={glow} />
            <Sep color={color} />
          </>
        )}
        <Digit val={pad(parts.h)} color={color} glow={glow} />
        <Sep color={color} />
        <Digit val={pad(parts.m)} color={color} glow={glow} />
        <Sep color={color} />
        <Digit val={pad(parts.s)} color={color} glow={glow} />
      </div>
    );
  }

  // sm — compact inline
  const display = parts.d > 0
    ? `${parts.d}d ${pad(parts.h)}:${pad(parts.m)}:${pad(parts.s)}`
    : `${pad(parts.h)}:${pad(parts.m)}:${pad(parts.s)}`;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-black"
      style={{
        background: '#000',
        color,
        textShadow: `0 0 6px ${glow}`,
        border: `1px solid ${color}25`,
        letterSpacing: '0.05em',
      }}>
      ⏱ {display}
    </span>
  );
}

function Digit({ val, color, glow }: { val: string; color: string; glow: string }) {
  return (
    <span style={{
      fontFamily: '"Courier New", monospace',
      fontSize: 18,
      fontWeight: 900,
      color,
      textShadow: `0 0 10px ${glow}, 0 0 20px ${glow}40`,
      lineHeight: 1,
      letterSpacing: '0.1em',
    }}>{val}</span>
  );
}

function Sep({ color }: { color: string }) {
  return <span style={{ color, opacity: 0.6, fontSize: 16, fontWeight: 900, animation: 'blink 1s step-end infinite' }}>:</span>;
}
