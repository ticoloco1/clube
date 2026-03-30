'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ShoppingCart, User, TrendingUp } from 'lucide-react';
import { useT } from '@/lib/i18n';

export function Header() {
  const { user } = useAuth();
  const { items, open } = useCart();
  const T = useT();

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(13,17,23,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      height: 64,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 20px',
        height: '100%', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>TrustBank</p>
            <p style={{ fontSize: 9, color: 'var(--text2)', margin: 0, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>MINI SITES · USDC</p>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { href: '/slugs', label: T('nav_slugs') },
            { href: '/slugs?tab=market', label: T('nav_market') },
            { href: '/vault', label: T('nav_vault') },
            { href: '/sites', label: T('nav_sites') },
            { href: '/videos', label: T('nav_videos') },
            { href: '/cv', label: T('nav_cvs') },
            { href: '/planos', label: T('nav_planos') },
            { href: '/jackpot', label: 'Jackpot' },
          ].map(nav => (
            <Link key={`${nav.href}-${nav.label}`} href={nav.href} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: 'var(--text2)', textDecoration: 'none', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--text)'; (e.target as HTMLElement).style.background = 'var(--bg2)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text2)'; (e.target as HTMLElement).style.background = 'transparent'; }}>
              {nav.label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <LanguageSwitcher />

          <button onClick={open} style={{
            position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text2)', padding: 8, borderRadius: 8,
          }}>
            <ShoppingCart size={18} />
            {items.length > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2, width: 16, height: 16,
                background: 'var(--accent)', color: '#fff', borderRadius: '50%',
                fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{items.length}</span>
            )}
          </button>

          {user ? (
            <Link href="/dashboard" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              color: 'var(--text)', textDecoration: 'none', fontSize: 13, fontWeight: 700,
            }}>
              <User size={14} />
              {user.email?.split('@')[0]}
            </Link>
          ) : (
            <Link href="/auth" style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
            }}>
              {T('nav_signin')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
