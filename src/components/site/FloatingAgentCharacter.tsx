'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ThumbsUp } from 'lucide-react';
import { resolveFloatingPresetImage } from '@/lib/floatingAgentPresets';

type Anim = 'idle' | 'thinking' | 'interaction';

export function FloatingAgentCharacter({
  preset,
  animState,
  accent,
  visible,
  nudgeKey = 0,
  speechEndKey = 0,
  expressiveGestures = false,
  speaking = false,
}: {
  preset: string;
  animState: Anim;
  accent: string;
  visible: boolean;
  /** Incrementa após uma resposta do assistente — animação “sai do quadro / aponta”. */
  nudgeKey?: number;
  /** Incrementa quando o áudio da resposta termina — aceno / assentir suave. */
  speechEndKey?: number;
  /** Polegar + “sair do quadro” mais acentuado após cada resposta (opção no editor). */
  expressiveGestures?: boolean;
  /** Enquanto o TTS fala — respiração um pouco mais acentuada e menos piscar aleatório. */
  speaking?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [peek, setPeek] = useState(false);
  const [showThumb, setShowThumb] = useState(false);
  const [blink, setBlink] = useState(false);
  const [laughing, setLaughing] = useState(false);
  const [settling, setSettling] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const img = resolveFloatingPresetImage(preset);

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
    setLaughing(true);
    setShowThumb(true);
    const laughTimer = window.setTimeout(() => setLaughing(false), expressiveGestures ? 820 : 640);
    const thumbTimer = window.setTimeout(() => setShowThumb(false), expressiveGestures ? 1200 : 880);
    const peekMs = expressiveGestures ? 1100 : 900;
    const peekTimer = window.setTimeout(() => setPeek(false), peekMs);
    return () => {
      window.clearTimeout(peekTimer);
      window.clearTimeout(thumbTimer);
      window.clearTimeout(laughTimer);
    };
  }, [nudgeKey, expressiveGestures]);

  useEffect(() => {
    if (!speechEndKey) return;
    setSettling(true);
    const t = window.setTimeout(() => setSettling(false), 500);
    return () => clearTimeout(t);
  }, [speechEndKey]);

  useEffect(() => {
    if (!visible || img || reduceMotion) return;
    const id = window.setInterval(() => {
      if (Math.random() > 0.9) {
        setPeek(true);
        window.setTimeout(() => setPeek(false), 720);
      }
    }, 5200);
    return () => clearInterval(id);
  }, [visible, img, reduceMotion]);

  useEffect(() => {
    if (!visible || reduceMotion) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    const tick = () => {
      const thinkingNow = animState === 'thinking' && !speaking;
      let delay: number;
      let allowDouble: boolean;
      if (speaking) {
        delay = 3200 + Math.random() * 3600;
        allowDouble = false;
      } else if (thinkingNow) {
        delay = 2500 + Math.random() * 2600;
        allowDouble = false;
      } else {
        delay = 1900 + Math.random() * 2100;
        allowDouble = true;
      }
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        window.setTimeout(() => setBlink(false), 108);
        if (allowDouble && Math.random() > 0.76) {
          window.setTimeout(() => {
            if (cancelled) return;
            setBlink(true);
            window.setTimeout(() => setBlink(false), 96);
          }, 145);
        }
        tick();
      }, delay);
    };
    tick();
    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [visible, speaking, reduceMotion, animState]);

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

  const thinkingEyes = animState === 'thinking' && !speaking;
  const pupil = {
    transform: `translate(${look.x * 5}px, ${look.y * 4 + (thinkingEyes ? -2.2 : 0)}px)`,
  };
  const bodyNudge = reduceMotion
    ? undefined
    : `translate(${look.x * 3.5}px, ${look.y * 2.5}px) rotate(${look.x * 5.5}deg)`;

  const bounce =
    animState === 'interaction' ? 'tb-agent-bounce 0.55s ease-out' : undefined;
  const settleAnim = settling && !reduceMotion ? 'tb-agent-settle 0.5s ease-out' : undefined;
  const breatheSpeak = !reduceMotion && speaking ? 'tb-agent-speak-breath 2.1s ease-in-out infinite' : undefined;
  const breatheThink =
    !reduceMotion && animState === 'thinking' && !speaking ? 'tb-agent-think-breath 2.85s ease-in-out infinite' : undefined;
  const breatheIdle = !reduceMotion && animState === 'idle' && !speaking ? 'tb-agent-idle 3.5s ease-in-out infinite' : undefined;
  const breathe = breatheSpeak || breatheThink || breatheIdle;
  const rootMotion = bounce || settleAnim || breathe;

  const innerLaugh = laughing && !reduceMotion ? 'tb-agent-laugh 0.34s ease-in-out infinite' : undefined;
  const peekAnim = peek
    ? `${expressiveGestures ? 'tb-agent-peek-strong' : 'tb-agent-peek'} 0.95s ease-out`
    : undefined;

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none select-none fixed z-[75] bottom-[5.5rem] right-6 w-[88px] h-[88px] md:bottom-[6rem] md:right-8 md:w-[100px] md:h-[100px]"
      style={{
        animation: rootMotion,
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
        @keyframes tb-agent-settle {
          0% { transform: translateY(0) scale(1) rotate(0deg); }
          40% { transform: translateY(5px) scale(1.035) rotate(2.5deg); }
          100% { transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes tb-agent-bounce {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-14px) scale(1.06) rotate(-3deg); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes tb-agent-laugh {
          0%, 100% { transform: translate(0, 0) scale(1); }
          45% { transform: translate(0, -2px) scale(1.05, 0.98); }
          70% { transform: translate(0, -1px) scale(1.03, 1.01); }
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
      <div className="w-full h-full relative" style={{ transform: bodyNudge }}>
        <div className="w-full h-full relative" style={{ animation: peekAnim }}>
          <div className="w-full h-full relative" style={{ animation: innerLaugh }}>
            {img ? (
              <div className="relative w-full h-full rounded-2xl overflow-visible border-2 shadow-xl" style={{ borderColor: accent }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover object-top" />
                <FloatingPhotoEye className="absolute left-[32%] top-[38%]" pupil={pupil} blink={blink} />
                <FloatingPhotoEye className="absolute right-[28%] top-[38%]" pupil={pupil} blink={blink} />
              </div>
            ) : (
              <AgentSvgFallback preset={preset} accent={accent} pupilStyle={pupil} blinkClosed={blink} />
            )}
          </div>
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

function FloatingPhotoEye({
  className,
  pupil,
  blink,
}: {
  className?: string;
  pupil: CSSProperties;
  blink: boolean;
}) {
  return (
    <div
      className={`${className} w-[10px] h-[10px] rounded-full bg-white/90 flex items-center justify-center overflow-hidden`}
      style={{
        boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
        transform: blink ? 'scaleY(0.14)' : 'scaleY(1)',
        transformOrigin: 'center 55%',
        transition: 'transform 0.06s ease-out',
      }}
    >
      <span className="w-[5px] h-[5px] rounded-full bg-black block" style={pupil} />
    </div>
  );
}

function AgentSvgFallback({
  preset,
  accent,
  pupilStyle,
  blinkClosed,
}: {
  preset: string;
  accent: string;
  pupilStyle: CSSProperties;
  blinkClosed: boolean;
}) {
  const pt = pupilStyle.transform as string | undefined;
  const m = pt?.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
  const px = m ? parseFloat(m[1]) : 0;
  const py = m ? parseFloat(m[2]) : 0;

  if (preset === 'shark_lawyer') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        <ellipse cx="50" cy="52" rx="46" ry="38" fill="#64748b" stroke="#334155" strokeWidth="2" />
        <path d="M4 52 L0 42 L12 48 Z" fill="#94a3b8" />
        {!blinkClosed ? (
          <>
            <ellipse cx="38" cy="48" rx="8" ry="7" fill="#fff" />
            <ellipse cx="62" cy="48" rx="8" ry="7" fill="#fff" />
            <g transform={`translate(${px},${py})`}>
              <circle cx="38" cy="48" r="3.5" fill="#0f172a" />
              <circle cx="62" cy="48" r="3.5" fill="#0f172a" />
            </g>
          </>
        ) : (
          <>
            <path d="M31 48 Q38 45.5 45 48" stroke="#0f172a" fill="none" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M55 48 Q62 45.5 69 48" stroke="#0f172a" fill="none" strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
        <ellipse cx="50" cy="62" rx="10" ry="5" fill="#1e293b" />
      </svg>
    );
  }
  if (preset === 'pet_influencer') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        <polygon points="30,22 38,8 46,22" fill={accent} />
        <polygon points="54,22 62,8 70,22" fill={accent} />
        <circle cx="50" cy="55" r="38" fill="#fdba74" stroke="#ea580c" strokeWidth="2" />
        {!blinkClosed ? (
          <>
            <ellipse cx="38" cy="50" rx="9" ry="10" fill="#fff" />
            <ellipse cx="62" cy="50" rx="9" ry="10" fill="#fff" />
            <g transform={`translate(${px},${py})`}>
              <circle cx="38" cy="50" r="4" fill="#1f2937" />
              <circle cx="62" cy="50" r="4" fill="#1f2937" />
            </g>
          </>
        ) : (
          <>
            <path d="M30 50 Q38 47 46 50" stroke="#1f2937" fill="none" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M54 50 Q62 47 70 50" stroke="#1f2937" fill="none" strokeWidth="2.4" strokeLinecap="round" />
          </>
        )}
        <ellipse cx="50" cy="68" rx="12" ry="7" fill="#9a3412" />
      </svg>
    );
  }
  if (preset === 'alien_tech') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        <line x1="50" y1="6" x2="50" y2="22" stroke={accent} strokeWidth="3" />
        <circle cx="50" cy="4" r="4" fill={accent} />
        <ellipse cx="50" cy="58" rx="40" ry="36" fill="#34d399" stroke="#065f46" strokeWidth="2" />
        {!blinkClosed ? (
          <>
            <ellipse cx="36" cy="52" rx="12" ry="14" fill="#ecfdf5" />
            <ellipse cx="64" cy="52" rx="12" ry="14" fill="#ecfdf5" />
            <g transform={`translate(${px},${py})`}>
              <circle cx="36" cy="52" r="5" fill="#064e3b" />
              <circle cx="64" cy="52" r="5" fill="#064e3b" />
            </g>
          </>
        ) : (
          <>
            <path d="M25 52 Q36 48 47 52" stroke="#064e3b" fill="none" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M53 52 Q64 48 75 52" stroke="#064e3b" fill="none" strokeWidth="2.4" strokeLinecap="round" />
          </>
        )}
        <ellipse cx="50" cy="72" rx="8" ry="4" fill="#047857" />
      </svg>
    );
  }
  return (
    <div
      className="w-full h-full rounded-2xl flex items-center justify-center text-4xl border-2 shadow-lg"
      style={{ borderColor: accent, background: 'rgba(0,0,0,0.25)' }}
    >
      🤖
    </div>
  );
}
