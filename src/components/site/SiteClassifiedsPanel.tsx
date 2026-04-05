'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, Home, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

type Row = {
  id: string;
  type: string;
  title: string;
  price: number;
  currency?: string | null;
  images?: string[] | null;
  state_city?: string | null;
  region?: string | null;
};

/**
 * Anúncios ativos (carros / imóveis) ligados a este mini-site — só leitura pública.
 */
export function SiteClassifiedsPanel({
  siteId,
  accentColor,
  textColor,
  textMuted,
  borderColor,
  bgCard,
  radius,
  maxContentWidth = 640,
}: {
  siteId: string;
  accentColor: string;
  textColor: string;
  textMuted: string;
  borderColor: string;
  bgCard: string;
  radius: number;
  maxContentWidth?: number;
}) {
  const T = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (supabase as any)
      .from('classified_listings')
      .select('id, type, title, price, currency, images, state_city, region, boost_score, created_at')
      .eq('site_id', siteId)
      .eq('status', 'active')
      .order('boost_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(36)
      .then(({ data, error }: { data: Row[] | null; error: Error | null }) => {
        if (cancelled) return;
        if (error) {
          setRows([]);
          return;
        }
        setRows(data || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const hubCar = '/carros';
  const hubImovel = '/imoveis';

  return (
    <div
      style={{
        marginBottom: 32,
        width: '100%',
        maxWidth: maxContentWidth,
        minWidth: Math.min(maxContentWidth, 280),
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            color: textColor,
            fontSize: 16,
            fontWeight: 800,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🏷️</span>
          {T('site_classified_title')}
        </h2>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0', color: textMuted }}>
          <Loader2 className="w-7 h-7 animate-spin" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: '20px 16px',
            borderRadius: radius,
            border: `1.5px solid ${borderColor}`,
            background: bgCard,
            color: textMuted,
            fontSize: 13,
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0 }}>{T('site_classified_empty')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 14 }}>
            <Link
              href={hubCar}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {T('site_classified_hub_cars')} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={hubImovel}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {T('site_classified_hub_props')} <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(152px, 1fr))',
              gap: 10,
              maxHeight: 'min(58vh, 520px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '4px 2px 8px 0',
              scrollbarWidth: 'thin',
            }}
          >
            {rows.map((item) => {
              const isCar = item.type === 'carro';
              const thumb = Array.isArray(item.images) && item.images[0] ? item.images[0] : null;
              const loc = [item.state_city, item.region].filter(Boolean).join(' · ');
              const href = isCar ? hubCar : hubImovel;
              const cur = item.currency || 'USD';
              return (
                <Link
                  key={item.id}
                  href={href}
                  style={{
                    display: 'block',
                    borderRadius: Math.max(radius - 4, 8),
                    border: `1.5px solid ${borderColor}`,
                    background: bgCard,
                    overflow: 'hidden',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'border-color 0.15s, transform 0.15s',
                  }}
                >
                  <div
                    style={{
                      aspectRatio: '4 / 3',
                      background: 'rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : isCar ? (
                      <Car className="w-8 h-8" style={{ color: textMuted, opacity: 0.45 }} aria-hidden />
                    ) : (
                      <Home className="w-8 h-8" style={{ color: textMuted, opacity: 0.45 }} aria-hidden />
                    )}
                  </div>
                  <div style={{ padding: '10px 10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: `${accentColor}22`,
                          color: accentColor,
                        }}
                      >
                        {isCar ? T('site_classified_type_car') : T('site_classified_type_property')}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 700,
                        color: textColor,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 800, color: accentColor }}>
                      {cur} {Number(item.price || 0).toLocaleString()}
                    </p>
                    {loc ? (
                      <p style={{ margin: '4px 0 0', fontSize: 10, color: textMuted, lineHeight: 1.3 }}>{loc}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: textMuted, textAlign: 'center' }}>
            {T('site_classified_footer_hint')}
          </p>
        </>
      )}
    </div>
  );
}
