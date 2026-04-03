'use client';

import type { CSSProperties, ReactNode } from 'react';

/** Moldura estilo “retrato mágico” (CSS): brilho, respiração leve, sem vídeo no servidor. */
export function CentralProfileMagicAvatar({
  enabled,
  accent,
  children,
}: {
  enabled: boolean;
  accent: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <div
      className="tb-magic-portrait inline-block rounded-[inherit]"
      style={
        {
          padding: 4,
          borderRadius: 'inherit',
          background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.35), ${accent})`,
          boxShadow: `0 0 24px ${accent}66, 0 0 48px ${accent}33`,
          animation: 'tb-magic-breathe 4.2s ease-in-out infinite',
        } as CSSProperties
      }
    >
      <style>{`
        @keyframes tb-magic-breathe {
          0%, 100% { filter: brightness(1); transform: translateY(0); }
          50% { filter: brightness(1.08); transform: translateY(-2px); }
        }
      `}</style>
      {children}
    </div>
  );
}
