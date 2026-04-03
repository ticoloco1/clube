'use client';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { LANGS, getLang, setLang, DEFAULT_LANG, type Lang } from '@/lib/i18n';
import { ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Lang>(DEFAULT_LANG);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setCurrent(getLang());
  }, []);

  useEffect(() => {
    const handleLangChange = () => setCurrent(getLang());
    window.addEventListener('lang-change', handleLangChange);
    return () => window.removeEventListener('lang-change', handleLangChange);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = LANGS.find(l => l.code === current) || LANGS[0];

  const change = (lang: Lang) => {
    setCurrent(lang);
    setLang(lang);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 12px', borderRadius: 8,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        color: 'var(--text)', cursor: 'pointer', fontSize: 15, fontWeight: 600,
      }}>
        <span>{currentLang.flag}</span>
        <span>{currentLang.code.toUpperCase()}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 4, minWidth: 160,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
        }}>
          {LANGS.map(lang => (
            <button key={lang.code} onClick={() => change(lang.code)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: current === lang.code ? 'rgba(129,140,248,0.1)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: current === lang.code ? 'var(--accent)' : 'var(--text)',
              fontSize: 15, fontWeight: current === lang.code ? 700 : 400,
              textAlign: 'left',
            }}>
              <span style={{ fontSize: 16 }}>{lang.flag}</span>
              <span style={{ flex: 1 }}>{lang.label}{lang.mt ? ' · auto' : ''}</span>
              {current === lang.code && <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
