import Link from 'next/link';

export function Footer() {
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
              Decentralized content & classifieds platform. Payments in USDC on Polygon.
            </p>
          </div>
          <div>
            <p className="font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-3">Platform</p>
            <div className="space-y-2">
              {[['/', 'Home'],['/slugs','Slugs'],['/cv','CVs'],['/imoveis','Properties'],['/carros','Cars'],['/jackpot','Jackpot']].map(([href,label]) => (
                <Link key={href} href={href} className="block text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-3">Account</p>
            <div className="space-y-2">
              {[['/editor','Editor'],['/creditos','Credits'],['/planos','Plans'],['/auth','Sign In']].map(([href,label]) => (
                <Link key={href} href={href} className="block text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-xs text-[var(--text2)] uppercase tracking-wider mb-3">Legal</p>
            <div className="space-y-2">
              {[['/terms','Terms of Service'],['/privacy','Privacy Policy'],['/disclaimer','Disclaimer']].map(([href,label]) => (
                <Link key={href} href={href} className="block text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors">{label}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="border-t border-[var(--border)] pt-6 space-y-2">
          <p className="text-[10px] text-[var(--text2)] leading-relaxed">
            <strong className="text-[var(--text2)]">Legal Disclaimer:</strong>{' '}
            <em>TrustBank is a decentralized content and classifieds platform. We do not provide banking, financial, investment, or payment services. The name "TrustBank" refers to trust between users and does not imply any banking license or financial institution status. All transactions are peer-to-peer in USDC (a stablecoin) on the Polygon blockchain. TrustBank does not hold, custody, or transfer funds on behalf of users. Users are solely responsible for their wallets, transactions, and compliance with local laws. The Jackpot feature is a platform loyalty reward program and is not a lottery or gambling service.</em>
          </p>
          <p className="text-[10px] text-[var(--text2)]">
            © {new Date().getFullYear()} TrustBank. All rights reserved. · USDC payments powered by Helio · Polygon Network
          </p>
        </div>
      </div>
    </footer>
  );
}
