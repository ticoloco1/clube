import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        <h1 className="text-3xl font-black text-[var(--text)] mb-2">Privacy Policy</h1>
        <p className="text-[var(--text2)] text-sm mb-8">Last updated: March 2026</p>
        <div className="space-y-6 text-[var(--text2)] text-sm">
          {[
            ['What We Collect', 'Email address and name (from Google OAuth or email signup). Profile information you voluntarily provide (bio, avatar, links, CV). Polygon wallet address (only if you provide it for receiving payments). Payment metadata (amounts, transaction hashes — not card numbers, which are handled by Helio). Usage data (page views, feature usage) via anonymous analytics.'],
            ['What We Do NOT Collect', 'We do not store passwords. We do not store credit card numbers. We do not sell your data to third parties. We do not run ads.'],
            ['How We Use Data', 'To provide platform features (mini sites, slugs, listings). To process payment splits and jackpot entries. To display your public profile to other users. To send transactional emails (payment confirmations, slug expiry notices).'],
            ['Data Storage', 'Data is stored in Supabase (PostgreSQL) hosted on AWS. Media files are stored in Cloudflare R2 or Supabase Storage. Data may be stored in servers located in the United States.'],
            ['Your Rights', 'You may request deletion of your account and all associated data at any time by emailing support. Blockchain transactions (USDC payments) are immutable and cannot be deleted — this is inherent to blockchain technology.'],
            ['Cookies', 'We use cookies only for authentication sessions (Supabase Auth). No tracking cookies. No ad cookies. Language preference is stored in localStorage.'],
            ['Third-Party Services', 'Google OAuth (authentication), Supabase (database), Helio (payment routing), Cloudflare (DNS, CDN), Vercel (hosting). Each has their own privacy policy.'],
            ['Contact', 'For privacy questions or data deletion requests, contact us at privacy@trustbank.xyz'],
          ].map(([title, text]) => (
            <div key={title as string}>
              <h2 className="font-black text-base text-[var(--text)] mb-2">{title}</h2>
              <p className="leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
