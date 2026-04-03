'use client';

import { useRef, useState, type ReactNode } from 'react';

/** Efeito “quase 3D”: inclina o retrato com o rato (perfil + Lively). */
export function AvatarTiltShell({
  children,
  enabled,
  intensity = 7,
}: {
  children: ReactNode;
  enabled: boolean;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [r, setR] = useState({ x: 0, y: 0 });

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const b = el.getBoundingClientRect();
        const px = (e.clientX - b.left) / Math.max(b.width, 1) - 0.5;
        const py = (e.clientY - b.top) / Math.max(b.height, 1) - 0.5;
        setR({ x: -py * intensity, y: px * intensity });
      }}
      onMouseLeave={() => setR({ x: 0, y: 0 })}
      style={{
        display: 'inline-block',
        perspective: 720,
      }}
    >
      <div
        style={{
          transform: `rotateX(${r.x}deg) rotateY(${r.y}deg)`,
          transformStyle: 'preserve-3d' as const,
          transition: 'transform 0.12s ease-out',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
