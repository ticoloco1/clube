'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { useEffect, useRef, useState } from 'react';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ShoppingCart, User, TrendingUp, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { SlugTicker } from '@/components/ui/SlugTicker';

export function Header() {
  const { user, signOut } = useAuth();
  const { items, open } = useCart();
  const T = useT();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOwnerEmail = (user?.email || '').toLowerCase() === 'arytcf@gmail.com';

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(ev.target as Node)) setOpenMenu(false);
    };
    if (openMenu) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenu]);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(13,17,23,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      minHeight: 72,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 20px',
        height: '100%', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={20} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>TrustBank</p>
            <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{T('header_tagline')}</p>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { href: '/slugs', label: T('nav_slug_market') },
            { href: '/sites', label: T('nav_sites') },
            { href: '/videos', label: T('nav_videos') },
            { href: '/cv', label: T('nav_cvs') },
            { href: '/planos', label: T('nav_planos') },
            { href: '/mistico', label: T('nav_mistico') },
          ].map(nav => (
            <Link key={`${nav.href}-${nav.label}`} href={nav.href} style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 15, fontWeight: 700,
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
            <ShoppingCart size={20} />
            {items.length > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2, width: 16, height: 16,
                background: 'var(--accent)', color: '#fff', borderRadius: '50%',
                fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{items.length}</span>
            )}
          </button>

          {user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenMenu(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  color: 'var(--text)', textDecoration: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                }}
              >
                <User size={16} />
                {user.email?.split('@')[0]}
              </button>

              {openMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 190,
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,.35)', padding: 6, zIndex: 70,
                }}>
                  <Link href="/dashboard" onClick={() => setOpenMenu(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                    color: 'var(--text)', textDecoration: 'none', fontSize: 14, fontWeight: 700,
                  }}>
                    <LayoutDashboard size={14} /> {T('header_dashboard')}
                  </Link>
                  <Link href="/editor" onClick={() => setOpenMenu(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                    color: 'var(--text)', textDecoration: 'none', fontSize: 14, fontWeight: 700,
                  }}>
                    <Settings size={14} /> {T('header_editor')}
                  </Link>
                  {isOwnerEmail && (
                    <Link href="/admin" onClick={() => setOpenMenu(false)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                      color: 'var(--text)', textDecoration: 'none', fontSize: 14, fontWeight: 700,
                    }}>
                      <Settings size={14} /> {T('header_admin')}
                    </Link>
                  )}
                  <button
                    onClick={() => { setOpenMenu(false); signOut(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                      color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800,
                    }}
                  >
                    <LogOut size={14} /> {T('header_sign_out')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" style={{
              padding: '10px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              textDecoration: 'none', fontSize: 15, fontWeight: 800,
            }}>
              {T('nav_signin')}
            </Link>
          )}
        </div>
      </div>
      <SlugTicker />
    </header>
  );
}
