import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Toaster } from 'sonner';
import { getSiteBaseUrl } from '@/lib/siteBaseUrl';

const SITE_URL = getSiteBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TrustBank — Your Professional Mini Site',
    template: '%s | TrustBank',
  },
  description: 'Create your professional mini site with paywall videos, CV unlock, social links and more. Get paid in USD via Stripe. Claim your premium slug.',
  keywords: ['mini site', 'link in bio', 'Stripe paywall', 'slug marketplace', 'professional CV', 'USD payments', 'creator monetization'],
  authors: [{ name: 'TrustBank', url: SITE_URL }],
  creator: 'TrustBank',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'TrustBank',
    title: 'TrustBank — Mini Sites & Stripe Paywall',
    description: 'Create your professional mini site. Monetize with Stripe (USD).',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'TrustBank' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrustBank — Mini Sites & Stripe Paywall',
    description: 'Create your professional mini site. Monetize with Stripe (USD).',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const rootJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'TrustBank',
      url: SITE_URL,
      logo: `${SITE_URL}/og-default.png`,
    },
    {
      '@type': 'WebSite',
      name: 'TrustBank',
      url: SITE_URL,
      inLanguage: 'en',
      publisher: { '@type': 'Organization', name: 'TrustBank', url: SITE_URL },
    },
  ],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning needed because ThemeScript sets class before React hydrates
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {/* Apply saved theme BEFORE first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = JSON.parse(localStorage.getItem('tb-theme') || '{}');
            var dark = t.state ? t.state.dark : true;
            document.documentElement.classList.toggle('dark', dark !== false);
          } catch(e) {
            document.documentElement.classList.add('dark');
          }
          try {
            var lng = localStorage.getItem('i18n-lang');
            var htmlMap = { pt:'pt-BR',en:'en',es:'es',fr:'fr',de:'de',it:'it',zh:'zh-Hans',ja:'ja',ko:'ko',ar:'ar' };
            if (lng && htmlMap[lng]) {
              document.documentElement.lang = htmlMap[lng];
              document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
            }
          } catch(e) {}
        `}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: rootJsonLd }} />
        {process.env.VERCEL_GIT_COMMIT_SHA ? (
          <meta name="trustbank-build" content={process.env.VERCEL_GIT_COMMIT_SHA} />
        ) : null}
      </head>
      <body>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
