'use client';

import { useState } from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import { useI18n, useT } from '@/lib/i18n';
import { normalizePublicSiteUrl } from '@/lib/publicSiteUrl';

const TB_ORIGIN = normalizePublicSiteUrl(
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined,
);

interface MiniSiteAdsPanelProps {
  siteSlug: string;
  siteName: string;
  accentColor: string;
  /** Minimum weekly rate in US$ set by the creator */
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
  const T = useT();
  const { lang } = useI18n();
  const numLocale = lang === 'pt' ? 'pt-BR' : 'en-US';
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
            {T('ads_minisite_title')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
            {T('ads_minisite_intro')}
          </p>
          {(profileLabel || followerCount > 0) && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: textMuted }}>
              {profileLabel && <span style={{ fontWeight: 700, color: accentColor }}>{profileLabel}</span>}
              {profileLabel && followerCount > 0 && ' · '}
              {followerCount > 0 && (
                <span>
                  {T('ads_followers').replace('{n}', followerCount.toLocaleString(numLocale))}
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
            title={T('ads_price_title')}
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
            {T('ads_from_weekly').replace(
              '{value}',
              askingPriceUsdc!.toLocaleString(numLocale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
            )}
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
            {T('ads_on_request')}
          </div>
        )}
        {!hasPrice && (
          <span style={{ fontSize: 12, color: textMuted }}>{T('ads_marketline')}</span>
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
          {T('ads_open_trustbank')}
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
              {T('ads_tip_creator')
                .replace('{price}', askingPriceUsdc!.toLocaleString(numLocale, { maximumFractionDigits: 0 }))
                .replace('{name}', siteName || siteSlug)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
