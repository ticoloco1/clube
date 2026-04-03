'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface SlugTickerProps {
  siteUserId?: string;
  customItems?: { label: string; url: string }[];
  enabled?: boolean;
}

type Row =
  | { kind: 'custom'; slug: string; url: string; label: string }
  | { kind: 'owner_sale'; slug: string; url: string; price: number }
  | { kind: 'owner_auc'; slug: string; url: string }
  | { kind: 'pub_sale'; slug: string; url: string; price: number }
  | { kind: 'pub_auc'; slug: string; url: string; price: number };

function formatTickerAmount(n: number, locale: string) {
  return n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
}

export function SlugTicker({ siteUserId, customItems = [], enabled = true }: SlugTickerProps) {
  const { t, lang } = useI18n();
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      return;
    }
    const normalizedCustom = (customItems || [])
      .filter((it) => it?.label && it?.url)
      .map((it, idx) => ({
        kind: 'custom' as const,
        slug: `custom_${idx}`,
        label: it.label,
        url: it.url,
      }));
    if (normalizedCustom.length > 0) {
      setRows(normalizedCustom);
      return;
    }
    if (siteUserId) {
      supabase
        .from('slug_registrations' as any)
        .select('slug, sale_price, status')
        .eq('user_id', siteUserId)
        .eq('for_sale', true)
        .limit(10)
        .then((r) => {
          const next: Row[] = (r.data || [])
            .filter((s: any) => s?.slug && String(s.slug).length > 0)
            .map((s: any) =>
              s.status === 'auction'
                ? {
                    kind: 'owner_auc' as const,
                    slug: String(s.slug),
                    url: '/slugs?tab=auctions',
                  }
                : {
                    kind: 'owner_sale' as const,
                    slug: String(s.slug),
                    url: '/slugs?tab=market',
                    price: Number(s.sale_price || 0),
                  },
            );
          setRows(next);
        });
    } else {
      Promise.all([
        fetch('/api/public/slug-market-list?offset=0&limit=24', { cache: 'no-store' })
          .then(async (r) => {
            const j = (await r.json().catch(() => ({}))) as { rows?: unknown };
            if (!r.ok || !Array.isArray(j.rows)) return [] as { slug: string; sale_price: unknown; status?: string | null }[];
            return j.rows as { slug: string; sale_price: unknown; status?: string | null }[];
          })
          .catch(() => []),
        supabase
          .from('slug_auctions' as any)
          .select('slug, min_bid, current_bid, status, ends_at')
          .eq('status', 'active')
          .gt('ends_at', new Date().toISOString())
          .order('ends_at', { ascending: true })
          .limit(12),
      ]).then(([saleRowsRaw, auctions]) => {
        const saleRows: Row[] = saleRowsRaw
          .filter((s) => s?.slug && String(s.slug).length > 0)
          .filter((s) => (s.status ?? '') !== 'auction')
          .slice(0, 12)
          .map((s) => ({
            kind: 'pub_sale' as const,
            slug: String(s.slug),
            url: '/slugs?tab=market',
            price: Number(s.sale_price || 0),
          }));
        const aucRows: Row[] = (auctions.data || [])
          .filter((a: any) => a?.slug && String(a.slug).length > 0)
          .map((a: any) => ({
            kind: 'pub_auc' as const,
            slug: String(a.slug),
            url: '/slugs?tab=auctions',
            price: Number(a.current_bid || a.min_bid || 0),
          }));
        setRows([...saleRows, ...aucRows]);
      });
    }
  }, [siteUserId, customItems, enabled]);

  const items = useMemo(() => {
    return rows.map((r) => {
      if (r.kind === 'custom') {
        return { slug: r.slug || 'custom', url: r.url, label: r.label, parts: null as null };
      }
      const slugPart = r.slug && String(r.slug).length ? String(r.slug) : '—';
      const slugHost = `${slugPart}.trustbank.xyz`;
      if (r.kind === 'owner_auc') {
        return {
          slug: r.slug,
          url: r.url,
          label: t('ticker_owner_auction').replace('{slug}', slugHost),
          parts: null as null,
        };
      }
      if (r.kind === 'owner_sale') {
        const priceFmt = formatTickerAmount(r.price, locale);
        return {
          slug: r.slug,
          url: r.url,
          label: t('ticker_owner_sale').replace('{slug}', slugHost).replace('{price}', priceFmt),
          parts: { host: slugHost, sep: '·', price: priceFmt, suffix: 'USD' } as const,
        };
      }
      if (r.kind === 'pub_sale') {
        const priceFmt = formatTickerAmount(r.price, locale);
        return {
          slug: r.slug,
          url: r.url,
          label: t('ticker_public_sale').replace('{slug}', slugHost).replace('{price}', priceFmt),
          parts: { host: slugHost, sep: '·', price: priceFmt, suffix: 'USD' } as const,
        };
      }
      const priceFmt = formatTickerAmount(r.price, locale);
      return {
        slug: r.slug,
        url: r.url,
        label: t('ticker_public_auction').replace('{slug}', slugHost).replace('{price}', priceFmt),
        parts: null as null,
      };
    });
  }, [rows, t, locale]);

  if (items.length === 0) return null;

  const repeated = [...items, ...items, ...items];

  return (
    <div
      className="overflow-hidden border-b border-[var(--border)]"
      style={{ background: 'linear-gradient(90deg,#0a0a0f,#0f1020,#0a0a0f)', height: 42 }}
    >
      <div
        className="flex items-center h-full"
        style={{ animation: 'slugTicker 35s linear infinite', width: 'max-content' }}
      >
        {repeated.map((item, i) => {
          const slugSafe = item.slug && typeof item.slug === 'string' ? item.slug : 'x';
          const len = slugSafe.length;
          const color = len <= 3 ? '#f59e0b' : len <= 5 ? '#818cf8' : '#34d399';
          return (
            <a
              key={i}
              href={item.url}
              target={siteUserId ? '_blank' : '_self'}
              rel="noopener"
              className="inline-flex items-center gap-3 mx-5 group hover:opacity-80 transition-opacity"
              style={{ flexShrink: 0, textDecoration: 'none' }}
            >
              {item.parts ? (
                <>
                  <span className="font-mono font-black text-base" style={{ color, textShadow: `0 0 8px ${color}50` }}>
                    {item.parts.host}
                  </span>
                  <span className="text-white/25 text-sm font-bold px-0.5" aria-hidden>
                    {item.parts.sep}
                  </span>
                  <span className="font-mono font-black text-base tabular-nums" style={{ color, textShadow: `0 0 8px ${color}50` }}>
                    $ {item.parts.price}
                    {item.parts.suffix ? (
                      <span className="text-white/70 font-bold text-sm ml-1.5">{item.parts.suffix}</span>
                    ) : null}
                  </span>
                </>
              ) : (
                <span className="font-mono font-black text-base" style={{ color, textShadow: `0 0 8px ${color}50` }}>
                  {item.label}
                </span>
              )}
              {siteUserId && (
                <span className="text-white/30 text-xs group-hover:text-white/60 transition-colors">↗</span>
              )}
              <span className="text-white/10 text-xs">·</span>
            </a>
          );
        })}
      </div>
      <style>{`
        @keyframes slugTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
