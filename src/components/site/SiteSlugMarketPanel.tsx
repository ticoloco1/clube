'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { useT } from '@/lib/i18n';
import Link from 'next/link';
import { ShoppingCart, ExternalLink } from 'lucide-react';

type Row = { slug?: string; sale_price?: unknown; status?: string | null };

export function SiteSlugMarketPanel({
  accentColor,
  textColor,
  textMuted,
  borderColor,
  bgCard,
  radius,
}: {
  accentColor: string;
  textColor: string;
  textMuted: string;
  borderColor: string;
  bgCard: string;
  radius: number;
}) {
  const T = useT();
  const { add, open } = useCart();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/slug-market-list?offset=0&limit=24', { cache: 'no-store' })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { rows?: unknown };
        if (!r.ok || !Array.isArray(j.rows)) return [];
        return j.rows as Row[];
      })
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const forSale = rows.filter(
    (r) =>
      r?.slug &&
      String(r.slug).length > 0 &&
      (r.status ?? '') !== 'auction' &&
      Number(r.sale_price || 0) > 0,
  );

  return (
    <div style={{ marginBottom: 32 }}>
      <h2
        style={{
          color: textColor,
          fontSize: 16,
          fontWeight: 800,
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>🏷️</span>
        {T('site_slug_market_title')}
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: textMuted, lineHeight: 1.5 }}>{T('site_slug_market_sub')}</p>

      {loading ? (
        <p style={{ fontSize: 13, color: textMuted }}>{T('site_slug_market_loading')}</p>
      ) : forSale.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: radius,
            border: `1.5px solid ${borderColor}`,
            background: bgCard,
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: textColor }}>{T('site_slug_market_empty')}</p>
          <Link
            href="/slugs?tab=market"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              fontSize: 13,
              fontWeight: 700,
              color: accentColor,
              textDecoration: 'none',
            }}
          >
            {T('site_slug_market_see_all')} <ExternalLink style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            {forSale.slice(0, 12).map((row) => {
              const slug = String(row.slug);
              const price = Number(row.sale_price || 0);
              return (
                <div
                  key={slug}
                  style={{
                    padding: 14,
                    borderRadius: radius,
                    border: `1.5px solid ${borderColor}`,
                    background: bgCard,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: textColor,
                      wordBreak: 'break-word',
                      lineHeight: 1.25,
                    }}
                  >
                    .{slug}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: accentColor }}>
                    ${price.toFixed(2)} USD
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      add({
                        id: `slug_market_${slug}`,
                        label: T('slug_cart_market_label').replace('{slug}', slug),
                        price,
                        type: 'slug',
                      });
                      open();
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: 'none',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      color: '#fff',
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    }}
                  >
                    <ShoppingCart style={{ width: 14, height: 14 }} />
                    {T('site_slug_market_buy')}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Link
              href="/slugs?tab=market"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentColor,
                textDecoration: 'underline',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {T('site_slug_market_see_all')} <ExternalLink style={{ width: 12, height: 12 }} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
