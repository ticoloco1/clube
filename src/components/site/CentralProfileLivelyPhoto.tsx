'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Foto de perfil com inclinação ao rato e olhos que seguem (presets PNG). */
export function CentralProfileLivelyPhoto({
  src,
  alt,
  width,
  height,
  borderRadius,
  border,
  pupilOverlay,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  borderRadius: string | number;
  border: string;
  pupilOverlay: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const nx = (e.clientX - cx) / Math.max(r.width * 0.5, 1);
    const ny = (e.clientY - cy) / Math.max(r.height * 0.5, 1);
    setTilt({
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    });
    const dx = (e.clientX - cx) / Math.max(r.width, 1);
    const dy = (e.clientY - cy) / Math.max(r.height, 1);
    setLook({
      x: Math.max(-1, Math.min(1, dx * 2.6)),
      y: Math.max(-1, Math.min(1, dy * 2.2)),
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [onMove]);

  const pupil = { transform: `translate(${look.x * 4}px, ${look.y * 3}px)` };

  const br = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;

  return (
    <div
      ref={wrapRef}
      className="relative inline-block overflow-hidden"
      style={{
        width,
        height,
        borderRadius: br,
        border,
        transform: `perspective(420px) rotateY(${tilt.x * 11}deg) rotateX(${-tilt.y * 9}deg)`,
        transition: 'transform 0.14s ease-out',
        animation: 'tb-prof-breathe 4s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes tb-prof-breathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.04); }
          50% { box-shadow: 0 0 20px 2px rgba(255,255,255,0.07); }
        }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-cover object-top block" draggable={false} />
      {pupilOverlay ? (
        <>
          <div
            className="pointer-events-none absolute left-[30%] top-[36%] w-[11%] h-[11%] rounded-full bg-white/88 flex items-center justify-center overflow-hidden"
            style={{ boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' }}
          >
            <span className="w-[45%] h-[45%] rounded-full bg-black block" style={pupil} />
          </div>
          <div
            className="pointer-events-none absolute right-[26%] top-[36%] w-[11%] h-[11%] rounded-full bg-white/88 flex items-center justify-center overflow-hidden"
            style={{ boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' }}
          >
            <span className="w-[45%] h-[45%] rounded-full bg-black block" style={pupil} />
          </div>
        </>
      ) : null}
    </div>
  );
}
