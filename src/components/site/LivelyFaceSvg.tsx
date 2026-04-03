'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { VisemeShape } from '@/lib/visemesFromText';

const MOUTH: Record<VisemeShape, { ry: number; rx: number; cy: number }> = {
  sil: { ry: 3, rx: 14, cy: 52 },
  neutral: { ry: 5, rx: 18, cy: 51 },
  open: { ry: 14, rx: 16, cy: 54 },
  round: { ry: 11, rx: 12, cy: 53 },
  smile: { ry: 4, rx: 22, cy: 50 },
  fricative: { ry: 5, rx: 20, cy: 51 },
  plosive: { ry: 2, rx: 16, cy: 51 },
  wide: { ry: 7, rx: 20, cy: 52 },
};

type FaceModel = { skin: string; accent: string; mouthStroke: string };

export function LivelyFaceSvg({
  model,
  mouthShape,
  speaking,
  thinking = false,
  interactionKey = 0,
  replyPulse = 0,
  speechDoneKey = 0,
  accent,
}: {
  model: FaceModel;
  mouthShape: VisemeShape;
  speaking: boolean;
  /** À espera da API (sem falar) — olhar “para cima”, sobrancelhas, respiração mais lenta. */
  thinking?: boolean;
  /** Incrementa ao enviar mensagem — soluço visual no rosto. */
  interactionKey?: number;
  /** Nova resposta na conversa — leve animação de “perk” / riso curto. */
  replyPulse?: number;
  /** Incrementa quando o TTS da resposta termina — sorriso de encerramento. */
  speechDoneKey?: number;
  accent: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const gradId = `lg-face-${uid}`;
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [replyLaugh, setReplyLaugh] = useState(false);
  const [satisfied, setSatisfied] = useState(false);
  const [bump, setBump] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const isThinking = thinking && !speaking;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReduceMotion(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (interactionKey <= 0) return;
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 500);
    return () => clearTimeout(t);
  }, [interactionKey]);

  useEffect(() => {
    if (replyPulse <= 0) return;
    setReplyLaugh(true);
    const t = window.setTimeout(() => setReplyLaugh(false), 520);
    return () => clearTimeout(t);
  }, [replyPulse]);

  useEffect(() => {
    if (speechDoneKey <= 0) return;
    setSatisfied(true);
    const t = window.setTimeout(() => setSatisfied(false), 620);
    return () => clearTimeout(t);
  }, [speechDoneKey]);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    const tick = () => {
      let delay: number;
      let allowDouble: boolean;
      if (speaking) {
        delay = 3400 + Math.random() * 3800;
        allowDouble = false;
      } else if (isThinking) {
        delay = 2400 + Math.random() * 2600;
        allowDouble = false;
      } else {
        delay = 2000 + Math.random() * 2200;
        allowDouble = true;
      }
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        window.setTimeout(() => setBlink(false), 112);
        if (allowDouble && Math.random() > 0.74) {
          window.setTimeout(() => {
            if (cancelled) return;
            setBlink(true);
            window.setTimeout(() => setBlink(false), 96);
          }, 155);
        }
        tick();
      }, delay);
    };
    tick();
    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [speaking, isThinking, reduceMotion]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / Math.max(r.width, 1);
      const dy = (e.clientY - cy) / Math.max(r.height, 1);
      setLook({
        x: Math.max(-1, Math.min(1, dx * 2.35)),
        y: Math.max(-1, Math.min(1, dy * 2.35)),
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const base = MOUTH[mouthShape];
  const smile = MOUTH.smile;

  let m = base;
  if (isThinking) {
    const n = MOUTH.neutral;
    m = { ry: n.ry * 0.62, rx: n.rx * 0.75, cy: n.cy + 1.5 };
  } else if (satisfied && !speaking) {
    m = { ry: smile.ry + 1.2, rx: smile.rx + 2, cy: smile.cy };
  } else if (replyLaugh && !speaking && !isThinking) {
    m = {
      ry: Math.max(base.ry, smile.ry + 0.8),
      rx: Math.max(base.rx, smile.rx),
      cy: Math.min(base.cy, smile.cy + 0.8),
    };
  }

  const thinkBiasX = isThinking ? 0.55 : 0;
  const thinkBiasY = isThinking ? -1.75 : 0;
  const px = look.x * 2.6 + thinkBiasX;
  const py = look.y * 2.0 + thinkBiasY;

  const breathAnim = reduceMotion
    ? undefined
    : isThinking
      ? 'livelyFaceBreathThink 4.1s ease-in-out infinite'
      : 'livelyFaceBreath 3.35s ease-in-out infinite';

  const thinkSway = isThinking && !reduceMotion ? 'livelyFaceThinkSway 2.6s ease-in-out infinite' : undefined;
  const wobbleAnim =
    replyLaugh && !reduceMotion && !speaking ? 'livelyFaceLaughWobble 0.3s ease-in-out infinite' : undefined;
  const bumpAnim = bump && !reduceMotion ? 'livelyFaceBump 0.5s ease-out' : undefined;
  const satisfiedAnim = satisfied && !reduceMotion ? 'livelyFaceSatisfied 0.55s ease-out' : undefined;

  const faceShellAnim = [bumpAnim, satisfiedAnim].filter(Boolean).join(', ') || undefined;

  return (
    <div ref={wrapRef} className="relative w-[120px] min-h-[128px] flex flex-col items-center justify-start">
      <style>{`
        @keyframes livelyFaceBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.032); }
        }
        @keyframes livelyFaceBreathThink {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.018); }
        }
        @keyframes livelyFaceThinkSway {
          0%, 100% { transform: rotate(-1.4deg); }
          50% { transform: rotate(1.4deg); }
        }
        @keyframes livelyFaceLaughWobble {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          40% { transform: translateY(-2px) rotate(-1.6deg); }
          70% { transform: translateY(-1px) rotate(1.4deg); }
        }
        @keyframes livelyFaceBump {
          0% { transform: scale(1); }
          35% { transform: scale(1.08) translateY(-3px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes livelyFaceSatisfied {
          0% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-2px) scale(1.04); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes livelyThinkBar {
          0%, 100% { height: 3px; opacity: 0.4; }
          50% { height: 11px; opacity: 1; }
        }
      `}</style>
      <div className="relative z-[1]" style={{ animation: faceShellAnim }}>
        <svg width="120" height="120" viewBox="0 0 100 100" aria-hidden style={{ animation: wobbleAnim }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={model.skin} />
            <stop offset="100%" stopColor={model.accent} />
          </linearGradient>
        </defs>
        <g style={{ transformOrigin: '50px 50px', animation: thinkSway }}>
          <g
            style={{
              transformOrigin: '50px 52px',
              animation: breathAnim,
            }}
          >
            <circle cx="50" cy="50" r="44" fill={`url(#${gradId})`} stroke={model.accent} strokeWidth="2" />
            {isThinking && (
              <>
                <path
                  d="M30 34 Q38 32 46 34"
                  stroke={model.mouthStroke}
                  fill="none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity={0.75}
                />
                <path
                  d="M54 34 Q62 32 70 34"
                  stroke={model.mouthStroke}
                  fill="none"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity={0.75}
                />
              </>
            )}
            {!blink ? (
              <>
                <ellipse cx="38" cy="42" rx="5" ry="7" fill={model.mouthStroke} opacity={0.85} />
                <ellipse cx="62" cy="42" rx="5" ry="7" fill={model.mouthStroke} opacity={0.85} />
                <g transform={`translate(${px},${py})`}>
                  <circle cx="38" cy="42" r="2.35" fill={model.accent} />
                  <circle cx="62" cy="42" r="2.35" fill={model.accent} />
                </g>
              </>
            ) : (
              <>
                <path
                  d="M33 42 Q38 39.5 43 42"
                  stroke={model.mouthStroke}
                  fill="none"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M57 42 Q62 39.5 67 42"
                  stroke={model.mouthStroke}
                  fill="none"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </>
            )}
            <ellipse cx="50" cy={m.cy} rx={m.rx * 0.45} ry={m.ry * 0.45} fill={model.mouthStroke} />
          </g>
        </g>
        </svg>
      </div>
      {isThinking && (
        <div className="flex gap-0.5 h-3.5 items-end mt-0.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full"
              style={{
                background: accent,
                height: 3,
                animation: reduceMotion ? undefined : 'livelyThinkBar 0.85s ease-in-out infinite',
                animationDelay: `${i * 0.11}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
