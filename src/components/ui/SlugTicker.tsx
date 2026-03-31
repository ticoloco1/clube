'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SlugTickerProps {
  // Se passado, mostra os slugs do dono do site
  siteUserId?: string;
  // Se não passado, mostra slugs do marketplace (homepage)
}

export function SlugTicker({ siteUserId }: SlugTickerProps) {
  const [items, setItems] = useState<{ slug: string; url: string; label: string }[]>([]);

  useEffect(() => {
    if (siteUserId) {
      // Mini-site: mostra slugs do dono que estão em venda/leilão
      supabase.from('slug_registrations' as any)
        .select('slug, sale_price, status')
        .eq('user_id', siteUserId)
        .eq('for_sale', true)
        .limit(10)
        .then(r => {
          const slugs = (r.data || []).map((s: any) => ({
            slug: s.slug,
            url: s.status === 'auction' ? '/slugs?tab=auctions' : '/slugs?tab=market',
            label: `${s.slug}.trustbank.xyz · ${s.status === 'auction' ? 'Leilão' : `$${s.sale_price || 0} USDC`}`,
          }));
          setItems(slugs);
        });
    } else {
      // Site principal: mistura vendas diretas e leilões ativos
      Promise.all([
        supabase.from('slug_registrations' as any)
          .select('slug, sale_price, status')
          .eq('for_sale', true)
          .neq('status', 'auction')
          .order('sale_price', { ascending: true })
          .limit(12),
        supabase.from('slug_auctions' as any)
          .select('slug, min_bid, current_bid, status, ends_at')
          .eq('status', 'active')
          .gt('ends_at', new Date().toISOString())
          .order('ends_at', { ascending: true })
          .limit(12),
      ]).then(([sales, auctions]) => {
        const saleItems = (sales.data || []).map((s: any) => ({
          slug: s.slug,
          url: '/slugs?tab=market',
          label: `${s.slug}.trustbank.xyz · $${Number(s.sale_price || 0).toLocaleString()} USDC`,
        }));
        const auctionItems = (auctions.data || []).map((a: any) => ({
          slug: a.slug,
          url: '/slugs?tab=auctions',
          label: `${a.slug}.trustbank.xyz · leilão $${Number(a.current_bid || a.min_bid || 0).toLocaleString()}`,
        }));
        setItems([...saleItems, ...auctionItems]);
      });
    }
  }, [siteUserId]);

  if (items.length === 0) return null;

  // Triple for seamless loop
  const repeated = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden border-b border-[var(--border)]"
      style={{ background: 'linear-gradient(90deg,#0a0a0f,#0f1020,#0a0a0f)', height: 36 }}>
      <div className="flex items-center h-full"
        style={{ animation: 'slugTicker 35s linear infinite', width: 'max-content' }}>
        {repeated.map((item, i) => {
          const len = item.slug.length;
          const color = len <= 3 ? '#f59e0b' : len <= 5 ? '#818cf8' : '#34d399';
          return (
            <a key={i} href={item.url} target={siteUserId ? '_blank' : '_self'}
              rel="noopener"
              className="inline-flex items-center gap-2 mx-5 group hover:opacity-80 transition-opacity"
              style={{ flexShrink: 0, textDecoration: 'none' }}>
              <span className="font-mono font-black text-sm"
                style={{ color, textShadow: `0 0 8px ${color}50` }}>
                {item.label}
              </span>
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
