'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export function Footer() {
  const T = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg2)] mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                <span className="text-white font-black text-xs">T</span>
              </div>
              <span className="font-black text-[var(--text)]">TrustBank</span>
            </div>
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              {T('footer_desc')}
            </p>
          </div>
          <div>
            <p className="font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-3">{T('footer_platform')}</p>
            <div className="space-y-2">
              {[
                ['/', T('footer_home')],
                ['/slugs', T('nav_slug_market')],
                ['/cv', T('nav_cvs')],
                ['/imoveis', T('imoveis_title')],
                ['/carros', T('carros_title')],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-3">{T('footer_account')}</p>
            <div className="space-y-2">
              {[
                ['/editor', T('header_editor')],
                ['/creditos', T('footer_creditos')],
                ['/planos', T('nav_planos')],
                ['/auth', T('nav_signin')],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-3">{T('footer_legal')}</p>
            <div className="space-y-2">
              {[
                ['/terms', T('footer_terms')],
                ['/privacy', T('footer_privacy')],
                ['/disclaimer', T('footer_disclaimer_link')],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-6 space-y-2">
          <p className="text-[10px] text-[var(--text2)] leading-relaxed">
            <strong className="text-[var(--text2)]">{T('footer_legal_disclaimer_title')}</strong>{' '}
            <em>{T('footer_disclaimer_body')}</em>
          </p>
          <p className="text-[10px] text-[var(--text2)]">
            {T('footer_copyright').replace('{year}', String(year))}
          </p>
        </div>
      </div>
    </footer>
  );
}
