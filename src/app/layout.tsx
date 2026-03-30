import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  metadataBase: new URL('https://trustbank.xyz'),
  title: {
    default: 'TrustBank — Your Professional Mini Site',
    template: '%s | TrustBank',
  },
  description: 'Create your professional mini site with paywall videos, CV unlock, social links and more. Earn in USDC on Polygon. Claim your premium slug.',
  keywords: ['mini site', 'link in bio', 'USDC paywall', 'slug marketplace', 'professional CV', 'crypto payments', 'Polygon', 'creator monetization'],
  authors: [{ name: 'TrustBank', url: 'https://trustbank.xyz' }],
  creator: 'TrustBank',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://trustbank.xyz',
    siteName: 'TrustBank',
    title: 'TrustBank — Mini Sites & USDC Paywall',
    description: 'Create your professional mini site. Earn in USDC on Polygon.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'TrustBank' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrustBank — Mini Sites & USDC Paywall',
    description: 'Create your professional mini site. Earn in USDC on Polygon.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: 'https://trustbank.xyz',
  },
};

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
        `}} />
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
