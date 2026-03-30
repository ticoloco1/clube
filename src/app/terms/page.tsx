import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        <h1 className="text-3xl font-black text-[var(--text)] mb-2">Terms of Service</h1>
        <p className="text-[var(--text2)] text-sm mb-8">Last updated: March 2026</p>
        <div className="prose prose-sm max-w-none text-[var(--text2)] space-y-6">
          {[
            ['1. Platform Nature', 'TrustBank is a decentralized content, classifieds, and identity platform. We are NOT a bank, financial institution, money transmitter, or payment processor. We do not hold, custody, or manage user funds. All payments are peer-to-peer in USDC (a stablecoin) on the Polygon blockchain network.'],
            ['2. Eligibility', 'You must be at least 18 years old to use TrustBank. By using the platform, you confirm that you meet this requirement and that your use complies with all applicable local laws.'],
            ['3. User Accounts', 'You are responsible for maintaining the security of your account. TrustBank uses Google OAuth and email authentication via Supabase. We do not store passwords. You are responsible for all activity under your account.'],
            ['4. Content & Listings', 'Users are solely responsible for content they post, list, or publish on TrustBank. Prohibited content includes: illegal goods or services, adult content, weapons, spam, or anything that violates applicable law. TrustBank reserves the right to remove content without notice.'],
            ['5. Payments & USDC', 'All transactions on TrustBank are denominated in USDC on the Polygon network. TrustBank facilitates payment routing between users via Helio but does not custody funds. Revenue splits occur automatically on-chain at the time of payment. TrustBank is not liable for lost transactions, wrong addresses, or blockchain network issues.'],
            ['6. Slugs & Digital Assets', 'Slugs (custom URL identifiers) are licensed, not sold. TrustBank reserves the right to revoke slugs that violate terms of service. Slug registrations are annual and must be renewed. Unclaimed or expired slugs return to the marketplace.'],
            ['7. Jackpot & Boost', 'The Jackpot feature is a platform loyalty reward program for users who participate in the Boost system. It is not a lottery, gambling, or financial product. Participation is automatic upon boosting content. TrustBank reserves the right to modify or discontinue the Jackpot at any time.'],
            ['8. CV Directory', 'Professionals list CVs voluntarily. Companies that pay for directory access agree to use contact information only for legitimate recruitment purposes. Misuse of contact data is prohibited.'],
            ['9. Limitation of Liability', 'TrustBank is provided "as is." We are not liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including loss of data, revenue, or digital assets.'],
            ['10. Governing Law', 'These terms are governed by applicable law. Disputes shall be resolved through binding arbitration. Class action lawsuits are waived.'],
            ['11. Changes', 'We may update these terms at any time. Continued use of the platform after changes constitutes acceptance.'],
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
