'use client';

import { useState } from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';

const TB_ORIGIN =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    : 'https://trustbank.xyz';

interface MiniSiteAdsPanelProps {
  siteSlug: string;
  siteName: string;
  accentColor: string;
  /** Preço mínimo em US$ que o criador definiu */
  askingPriceUsdc?: number | null;
  showPricePublic?: boolean;
  profileLabel?: string | null;
  followerCount?: number;
  /** Texto curto ex.: “Referência mercado: ~$1.500/sem” */
  benchmarkHint?: string | null;
  textColor: string;
  textMuted: string;
  borderColor: string;
  bgCard: string;
  radius: number;
}

export function MiniSiteAdsPanel({
  siteSlug,
  siteName,
  accentColor,
  askingPriceUsdc,
  showPricePublic = true,
  profileLabel,
  followerCount = 0,
  benchmarkHint,
  textColor,
  textMuted,
  borderColor,
  bgCard,
  radius,
}: MiniSiteAdsPanelProps) {
  const [showTip, setShowTip] = useState(false);

  const marketplaceUrl = `${TB_ORIGIN}/marketplace/ads?slug=${encodeURIComponent(siteSlug)}&ref=minisite`;

  const hasPrice =
    typeof askingPriceUsdc === 'number' && !Number.isNaN(askingPriceUsdc) && askingPriceUsdc > 0;

  return (
    <div
      style={{
        marginBottom: 32,
        padding: 18,
        borderRadius: radius,
        border: `1.5px solid ${borderColor}`,
        background: bgCard,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${accentColor}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Megaphone style={{ width: 22, height: 22, color: accentColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textColor }}>
            Patrocínios & anúncios
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
            Marcas entram pelo TrustBank: proposta, pagamento (Helio) e repasse ao criador. Passe o rato
            para ver valores de referência.
          </p>
          {(profileLabel || followerCount > 0) && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: textMuted }}>
              {profileLabel && <span style={{ fontWeight: 700, color: accentColor }}>{profileLabel}</span>}
              {profileLabel && followerCount > 0 && ' · '}
              {followerCount > 0 && (
                <span>
                  {followerCount.toLocaleString('pt-BR')} seguidores
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {hasPrice && showPricePublic && (
          <div
            title="Valor mínimo semanal para aceitar campanha (definido pelo criador)"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}44`,
              fontSize: 13,
              fontWeight: 800,
              color: accentColor,
              cursor: 'default',
            }}
            onMouseEnter={() => setShowTip(true)}
          >
            A partir de US${askingPriceUsdc!.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/semana
          </div>
        )}
        {hasPrice && !showPricePublic && (
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${borderColor}`,
              fontSize: 12,
              fontWeight: 600,
              color: textMuted,
            }}
          >
            Valor sob consulta — peça orçamento no TrustBank
          </div>
        )}
        {!hasPrice && (
          <span style={{ fontSize: 12, color: textMuted }}>Orçamento via marketplace TrustBank</span>
        )}

        <a
          href={marketplaceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 999,
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: `0 6px 24px ${accentColor}35`,
          }}
        >
          Abrir no TrustBank
          <ExternalLink style={{ width: 14, height: 14 }} />
        </a>
      </div>

      {showTip && (benchmarkHint || hasPrice) && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.25)',
            fontSize: 11,
            color: textMuted,
            lineHeight: 1.5,
          }}
        >
          {benchmarkHint && <p style={{ margin: 0 }}>{benchmarkHint}</p>}
          {hasPrice && (
            <p style={{ margin: benchmarkHint ? '6px 0 0' : 0 }}>
              O criador definiu <strong style={{ color: textColor }}>US${askingPriceUsdc!.toFixed(0)}</strong> como
              mínimo para aceitar. A marca pode propor acima disso para {siteName || siteSlug}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
