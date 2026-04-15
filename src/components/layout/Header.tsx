'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ShoppingCart, User, TrendingUp, LogOut, Settings, LayoutDashboard, Menu, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { SlugTicker } from '@/components/ui/SlugTicker';

const MOBILE_MAX = 900;

export function Header() {
  const { user, signOut } = useAuth();
  const { items, open } = useCart();
  const T = useT();
  const [openMenu, setOpenMenu] = useState(false);
  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOwnerEmail = (user?.email || '').toLowerCase() === 'arytcf@gmail.com';
  const [showAdminNav, setShowAdminNav] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setShowAdminNav(false);
      return;
    }
    const email = (user.email || '').toLowerCase();
    if (email === 'arytcf@gmail.com') {
      setShowAdminNav(true);
      return;
    }
    let cancelled = false;
    (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }: { data: unknown }) => {
        if (!cancelled) setShowAdminNav(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(ev.target as Node)) setOpenMenu(false);
    };
    if (openMenu) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenu]);

  useEffect(() => {
    if (!openMobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMobileNav(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [openMobileNav]);

  useEffect(() => {
    if (openMobileNav) setOpenMenu(false);
  }, [openMobileNav]);

  const navItems = [
    { href: '/slugs', label: T('nav_slug_market') },
    { href: '/vault', label: T('nav_vault') },
    { href: '/sites', label: T('nav_sites') },
    { href: '/cv', label: T('nav_cvs') },
    { href: '/planos', label: T('nav_planos') },
    { href: '/mistico', label: T('nav_mistico') },
  ];

  const linkStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text2)',
    textDecoration: 'none',
    transition: 'all 0.15s',
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(13,17,23,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        minHeight: isMobile ? 60 : 72,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: isMobile ? '0 12px' : '0 20px',
          minHeight: isMobile ? 60 : 72,
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 8 : 16,
          flexWrap: 'nowrap',
        }}
      >
        {/* Mobile menu */}
        {isMobile ? (
          <button
            type="button"
            aria-label={openMobileNav ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpenMobileNav((o) => !o)}
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {openMobileNav ? <X size={22} /> : <Menu size={22} />}
          </button>
        ) : null}

        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            flexShrink: 0,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={isMobile ? 18 : 20} color="#fff" />
          </div>
          {!isMobile ? (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>TrustBank</p>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--text2)',
                  margin: 0,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {T('header_tagline')}
              </p>
            </div>
          ) : (
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', whiteSpace: 'nowrap' }}>TrustBank</span>
          )}
        </Link>

        {/* Desktop nav */}
        {!isMobile ? (
          <nav style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {navItems.map((nav) => (
              <Link
                key={`${nav.href}-${nav.label}`}
                href={nav.href}
                style={linkStyle}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = 'var(--text)';
                  (e.target as HTMLElement).style.background = 'var(--bg2)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = 'var(--text2)';
                  (e.target as HTMLElement).style.background = 'transparent';
                }}
              >
                {nav.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexShrink: 0 }}>
          {!isMobile ? <LanguageSwitcher /> : null}

          <button
            onClick={open}
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text2)',
              padding: isMobile ? 6 : 8,
              borderRadius: 8,
            }}
          >
            <ShoppingCart size={isMobile ? 20 : 20} />
            {items.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  background: 'var(--accent)',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {items.length}
              </span>
            )}
          </button>

          {user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setOpenMobileNav(false);
                  setOpenMenu((p) => !p);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: isMobile ? '6px 10px' : '8px 14px',
                  borderRadius: 8,
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                  fontSize: isMobile ? 13 : 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  maxWidth: isMobile ? 120 : undefined,
                }}
              >
                <User size={16} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0]}
                </span>
              </button>

              {openMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    minWidth: 190,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    boxShadow: '0 10px 30px rgba(0,0,0,.35)',
                    padding: 6,
                    zIndex: 70,
                  }}
                >
                  {isMobile ? (
                    <div style={{ padding: '4px 8px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                      <LanguageSwitcher />
                    </div>
                  ) : null}
                  <Link
                    href="/dashboard"
                    onClick={() => setOpenMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      color: 'var(--text)',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <LayoutDashboard size={14} /> {T('header_dashboard')}
                  </Link>
                  <Link
                    href="/editor"
                    onClick={() => setOpenMenu(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      color: 'var(--text)',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <Settings size={14} /> {T('header_editor')}
                  </Link>
                  {showAdminNav && (
                    <Link
                      href="/admin"
                      onClick={() => setOpenMenu(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        color: 'var(--text)',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      <Settings size={14} /> {T('header_admin')}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setOpenMenu(false);
                      signOut();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      color: '#f87171',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    <LogOut size={14} /> {T('header_sign_out')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              style={{
                padding: isMobile ? '8px 12px' : '10px 18px',
                borderRadius: 8,
                background: 'var(--accent)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: isMobile ? 13 : 15,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              {T('nav_signin')}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile slide-down panel */}
      {isMobile && openMobileNav ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpenMobileNav(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              background: 'rgba(0,0,0,0.55)',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <nav
            style={{
              position: 'fixed',
              top: 60,
              left: 0,
              right: 0,
              zIndex: 65,
              maxHeight: 'min(70vh, 420px)',
              overflowY: 'auto',
              background: 'var(--card)',
              borderBottom: '1px solid var(--border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              padding: '12px 16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {navItems.map((nav) => (
              <Link
                key={`m-${nav.href}`}
                href={nav.href}
                onClick={() => setOpenMobileNav(false)}
                style={{
                  ...linkStyle,
                  display: 'block',
                  fontSize: 16,
                  padding: '14px 12px',
                  borderRadius: 12,
                  background: 'var(--bg2)',
                  color: 'var(--text)',
                }}
              >
                {nav.label}
              </Link>
            ))}
          </nav>
        </>
      ) : null}

      <SlugTicker />
    </header>
  );
}
