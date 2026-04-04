'use client';

import { useEffect, useRef, useState } from 'react';
import { ThumbsUp } from 'lucide-react';

type Anim = 'idle' | 'thinking' | 'interaction';

export function FloatingAgentCharacter({
  imageUrl,
  animState,
  accent,
  visible,
  nudgeKey = 0,
  speechEndKey = 0,
  expressiveGestures = false,
  speaking = false,
}: {
  /** Foto de perfil ou retrato; se null, ícone genérico. */
  imageUrl: string | null;
  animState: Anim;
  accent: string;
  visible: boolean;
  nudgeKey?: number;
  speechEndKey?: number;
  expressiveGestures?: boolean;
  speaking?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [peek, setPeek] = useState(false);
  const [showThumb, setShowThumb] = useState(false);
  const [settling, setSettling] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReduceMotion(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (!nudgeKey) return;
    setPeek(true);
    setShowThumb(true);
    const thumbTimer = window.setTimeout(() => setShowThumb(false), expressiveGestures ? 1200 : 880);
    const peekMs = expressiveGestures ? 1100 : 900;
    const peekTimer = window.setTimeout(() => setPeek(false), peekMs);
    return () => {
      window.clearTimeout(peekTimer);
      window.clearTimeout(thumbTimer);
    };
  }, [nudgeKey, expressiveGestures]);

  useEffect(() => {
    if (!speechEndKey) return;
    setSettling(true);
    const t = window.setTimeout(() => setSettling(false), 500);
    return () => clearTimeout(t);
  }, [speechEndKey]);

  useEffect(() => {
    if (!visible || imageUrl || reduceMotion) return;
    const id = window.setInterval(() => {
      if (Math.random() > 0.9) {
        setPeek(true);
        window.setTimeout(() => setPeek(false), 720);
      }
    }, 5200);
    return () => clearInterval(id);
  }, [visible, imageUrl, reduceMotion]);

  useEffect(() => {
    if (!visible) return;
    const onMove = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / Math.max(r.width, 1);
      const dy = (e.clientY - cy) / Math.max(r.height, 1);
      setLook({
        x: Math.max(-1, Math.min(1, dx * 2.85)),
        y: Math.max(-1, Math.min(1, dy * 2.85)),
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [visible]);

  if (!visible) return null;

  const tiltX = reduceMotion ? 0 : -look.y * 16;
  const tiltY = reduceMotion ? 0 : look.x * 18;
  const tiltZ = reduceMotion ? 0 : look.x * -2.5 + look.y * 1.2;

  const bounce = animState === 'interaction' ? 'tb-agent-bounce 0.55s ease-out' : undefined;
  const settleAnim = settling && !reduceMotion ? 'tb-agent-settle 0.5s ease-out' : undefined;
  const breatheSpeak = !reduceMotion && speaking ? 'tb-agent-speak-breath 2.1s ease-in-out infinite' : undefined;
  const breatheThink =
    !reduceMotion && animState === 'thinking' && !speaking ? 'tb-agent-think-breath 2.85s ease-in-out infinite' : undefined;
  const breatheIdle = !reduceMotion && animState === 'idle' && !speaking ? 'tb-agent-idle 3.5s ease-in-out infinite' : undefined;
  const breathe = breatheSpeak || breatheThink || breatheIdle;
  const rootMotion = bounce || settleAnim || breathe;

  const peekAnim = peek
    ? `${expressiveGestures ? 'tb-agent-peek-strong' : 'tb-agent-peek'} 0.95s ease-out`
    : undefined;

  const card3d = reduceMotion
    ? undefined
    : `rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${tiltZ}deg) translateZ(8px)`;

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none select-none fixed z-[92] bottom-[5.5rem] right-6 w-[88px] h-[88px] md:bottom-[6rem] md:right-8 md:w-[100px] md:h-[100px]"
      style={{
        animation: rootMotion,
        perspective: reduceMotion ? undefined : 520,
        transformStyle: 'preserve-3d',
      }}
    >
      <style>{`
        @keyframes tb-agent-idle {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.024); }
        }
        @keyframes tb-agent-speak-breath {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.038); }
        }
        @keyframes tb-agent-think-breath {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.022); }
        }
        @keyframes tb-agent-bounce {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-14px) scale(1.06) rotate(-3deg); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes tb-agent-settle {
          0% { transform: translateY(0) scale(1) rotate(0deg); }
          40% { transform: translateY(5px) scale(1.035) rotate(2.5deg); }
          100% { transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes tb-agent-peek {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          22% { transform: translate(-16px, -12px) scale(1.12) rotate(-7deg); }
          48% { transform: translate(6px, 14px) scale(1.06) rotate(10deg); }
          72% { transform: translate(10px, -6px) scale(1.08) rotate(5deg); }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); }
        }
        @keyframes tb-agent-peek-strong {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          20% { transform: translate(-22px, -18px) scale(1.18) rotate(-10deg); }
          42% { transform: translate(8px, 18px) scale(1.1) rotate(12deg); }
          68% { transform: translate(14px, -8px) scale(1.12) rotate(7deg); }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); }
        }
        @keyframes tb-thumb-rise {
          0% { transform: translateY(18px) scale(0.35) rotate(-25deg); opacity: 0; }
          45% { opacity: 1; }
          70% { transform: translateY(-4px) scale(1.08) rotate(8deg); }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes tb-thumb-wiggle {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-14deg); }
          60% { transform: rotate(10deg); }
        }
      `}</style>
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: card3d,
          transition: reduceMotion ? undefined : 'transform 0.12s ease-out',
        }}
      >
        <div className="w-full h-full relative" style={{ animation: peekAnim, transformStyle: 'preserve-3d' }}>
          {imageUrl ? (
            <div
              className="relative w-full h-full rounded-2xl overflow-hidden border-2 shadow-2xl"
              style={{
                borderColor: accent,
                boxShadow: `0 18px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12) inset, 0 -6px 20px ${accent}33`,
                transform: 'translateZ(4px)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <AgentFallbackIcon accent={accent} />
          )}
        </div>
        {showThumb ? (
          <div
            className={`absolute z-[5] flex items-center justify-center rounded-full bg-black/55 shadow-lg border border-white/25 ${
              expressiveGestures ? '-right-1 bottom-1 p-1.5' : 'right-0 bottom-0.5 p-1'
            }`}
            style={{ animation: 'tb-thumb-rise 0.55s ease-out forwards' }}
            aria-hidden
          >
            <span
              className="inline-flex origin-bottom"
              style={{
                animation: expressiveGestures ? 'tb-thumb-wiggle 0.32s ease-in-out 0.52s 4' : 'tb-thumb-wiggle 0.28s ease-in-out 0.48s 2',
              }}
            >
              <ThumbsUp
                className={expressiveGestures ? 'w-[22px] h-[22px] md:w-[26px] md:h-[26px]' : 'w-[18px] h-[18px] md:w-[22px] md:h-[22px]'}
                strokeWidth={2.4}
                style={{ color: accent }}
              />
            </span>
          </div>
        ) : null}
      </div>
      {animState === 'thinking' && !speaking && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 h-4 items-end">
          <style>{`
            @keyframes tb-sine-bar {
              0%, 100% { height: 4px; opacity: 0.45; }
              50% { height: 14px; opacity: 1; }
            }
          `}</style>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full"
              style={{
                background: accent,
                height: 4,
                animation: 'tb-sine-bar 0.85s ease-in-out infinite',
                animationDelay: `${i * 0.11}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentFallbackIcon({ accent }: { accent: string }) {
  return (
    <div
      className="w-full h-full rounded-2xl flex items-center justify-center text-3xl border-2 shadow-xl"
      style={{
        borderColor: accent,
        background: 'linear-gradient(145deg, rgba(30,30,40,0.95), rgba(15,15,22,0.98))',
        boxShadow: `0 12px 28px rgba(0,0,0,0.4), 0 0 0 1px ${accent}44`,
      }}
    >
      <span aria-hidden>✨</span>
    </div>
  );
}
