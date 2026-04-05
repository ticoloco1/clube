'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';
import { useT } from '@/lib/i18n';
import Link from 'next/link';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Row = { slug?: string; sale_price?: unknown; status?: string | null; for_sale?: boolean | null };

/**
 * Lista os slugs à venda (preço fixo) do dono do mini-site, num painel com scroll interno
 * (altura limitada, estilo feed) para não esticar a página inteira.
 */
export function SiteSlugMarketPanel({
  ownerUserId,
  accentColor,
  textColor,
  textMuted,
  borderColor,
  bgCard,
  radius,
  /** Largura máxima alinhada ao módulo feed (opcional). */
  maxContentWidth = 640,
  isDark = true,
}: {
  ownerUserId: string;
  accentColor: string;
  textColor: string;
  textMuted: string;
  borderColor: string;
  bgCard: string;
  radius: number;
  maxContentWidth?: number;
  isDark?: boolean;
}) {
  const T = useT();
  const { add, open } = useCart();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerUserId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (supabase as any)
      .from('slug_registrations')
      .select('slug, sale_price, status, for_sale')
      .eq('user_id', ownerUserId)
      .eq('for_sale', true)
      .order('created_at', { ascending: false })
      .limit(400)
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
  }, [ownerUserId]);

  const forSale = rows.filter(
    (r) =>
      r?.slug &&
      String(r.slug).length > 0 &&
      (r.status ?? '') !== 'auction' &&
      Number(r.sale_price || 0) > 0,
  );

  return (
    <div style={{ marginBottom: 32, width: '100%', maxWidth: maxContentWidth, minWidth: Math.min(maxContentWidth, 280), marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
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
          <span style={{ fontSize: 20 }}>🏷️</span>
          {T('site_slug_market_title')}
        </h2>
        {!loading && forSale.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: textMuted }}>
            {T('site_slug_market_listed_count').replace('{n}', String(forSale.length))}
          </span>
        )}
      </div>
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
              width: '100%',
              minHeight: 120,
              maxHeight: 'min(70vh, 520px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '10px 10px 10px 8px',
              border: `1.5px solid ${borderColor}`,
              borderRadius: radius,
              background: bgCard,
              scrollbarWidth: 'thin',
              scrollbarColor: `${accentColor}40 transparent`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(152px, 1fr))',
                gap: 10,
              }}
            >
              {forSale.map((row) => {
                const slug = String(row.slug);
                const price = Number(row.sale_price || 0);
                return (
                  <div
                    key={slug}
                    style={{
                      padding: 14,
                      borderRadius: Math.max(radius - 4, 8),
                      border: `1.5px solid ${borderColor}`,
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: textColor,
                        wordBreak: 'break-word',
                        lineHeight: 1.25,
                      }}
                    >
                      {slug}.trustbank.xyz
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: accentColor }}>${price.toFixed(2)} USD</div>
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
