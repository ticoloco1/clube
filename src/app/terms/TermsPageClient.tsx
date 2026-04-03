'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useT } from '@/lib/i18n';

const SECTION_KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({
  t: `page_terms_${i}_t` as const,
  p: `page_terms_${i}_p` as const,
}));

export default function TermsPageClient({ customHtml }: { customHtml: string }) {
  const T = useT();

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        <h1 className="text-3xl font-black text-[var(--text)] mb-2">{T('page_terms_title')}</h1>
        <p className="text-[var(--text2)] text-sm mb-8">{T('page_terms_updated')}</p>
        {customHtml ? (
          <div
            className="prose prose-sm max-w-none text-[var(--text2)]"
            dangerouslySetInnerHTML={{ __html: customHtml }}
          />
        ) : (
          <div className="prose prose-sm max-w-none text-[var(--text2)] space-y-6">
            {SECTION_KEYS.map(({ t, p }) => (
              <div key={t}>
                <h2 className="font-black text-base text-[var(--text)] mb-2">{T(t)}</h2>
                <p className="leading-relaxed">{T(p)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
