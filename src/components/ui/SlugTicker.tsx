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
      // Mini-site: mostra os slugs que o dono possui
      supabase.from('slug_registrations' as any)
        .select('slug, mini_sites(site_name)')
        .eq('user_id', siteUserId)
        .eq('status', 'active')
        .limit(10)
        .then(r => {
          const slugs = (r.data || []).map((s: any) => ({
            slug: s.slug,
            url: `https://${s.slug}.trustbank.xyz`,
            label: s.mini_sites?.site_name || `\${slug}.trustbank.xyz`,
          }));
          setItems(slugs);
        });
    } else {
      // Homepage: mostra slugs do marketplace à venda
      supabase.from('premium_slugs' as any)
        .select('slug, keyword, price')
        .eq('active', true)
        .is('sold_to', null)
        .order('price', { ascending: false })
        .limit(20)
        .then(r => {
          const slugs = (r.data || []).map((s: any) => ({
            slug: s.slug || s.keyword,
            url: `/slugs`,
            label: `${(s.slug || s.keyword)}.trustbank.xyz — $${s.price?.toLocaleString()} USDC`,
          }));
          setItems(slugs);
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
                {siteUserId ? `${item.slug}.trustbank.xyz` : item.label}
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
