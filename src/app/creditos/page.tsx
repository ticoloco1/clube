'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { Coins, ArrowRight, ArrowLeft, History, Wallet, Info, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n, useT } from '@/lib/i18n';
import { iaTopupChargeUsd } from '@/lib/aiUsdBudget';

const CREDIT_PACKS = [
  { credits: 100, usdc: 1.0, bonus: 0 },
  { credits: 500, usdc: 5.0, bonus: 0 },
  { credits: 1000, usdc: 10.0, bonus: 50, popular: true },
  { credits: 5000, usdc: 50.0, bonus: 500 },
  { credits: 10000, usdc: 100.0, bonus: 1500 },
];

const IA_FACE_PACKS = [5, 10, 25, 50, 100] as const;

type AiSiteRow = {
  id: string;
  slug: string;
  site_name: string;
};

export default function CreditosPage() {
  const T = useT();
  const { lang } = useI18n();
  const numLocale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [aiSites, setAiSites] = useState<AiSiteRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('credit_wallets').select('balance').eq('user_id', user.id).maybeSingle()
      .then(({ data }: any) => setBalance(data?.balance || 0));
    (supabase as any).from('credit_transactions').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }: any) => setTransactions(data || []));
    supabase.from('mini_sites').select('wallet_address').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setWalletAddress((data as any)?.wallet_address || ''));
    supabase
      .from('mini_sites')
      .select('id, slug, site_name')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setAiSites((data as AiSiteRow[]) || []));
  }, [user]);

  const handleBuyAiTopup = (site: AiSiteRow, face: number) => {
    const charge = iaTopupChargeUsd(face);
    add({
      id: `ai_topup_${site.id}_${face}`,
      label: T('credits_ia_cart_label')
        .replace('{name}', site.site_name || site.slug)
        .replace('{charge}', charge.toFixed(0)),
      price: charge,
      type: 'ai_topup',
    });
    toast.success(T('credits_ia_topup_toast'));
    openCart();
  };

  const handleBuy = (pack: typeof CREDIT_PACKS[0]) => {
    const bonusText = pack.bonus > 0 ? T('credits_cart_bonus').replace('{n}', String(pack.bonus)) : '';
    const label = T('credits_cart_pack')
      .replace('{credits}', pack.credits.toLocaleString(numLocale))
      .replace('{bonus}', bonusText)
      .replace('{usdc}', pack.usdc.toFixed(2));
    add({
      id: `credits_${pack.credits}_${Date.now()}`,
      label,
      price: pack.usdc,
      type: 'credits',
    });
    toast.success(T('toast_credits_pack_cart').replace('{total}', String(pack.credits + pack.bonus)));
    openCart();
  };

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 100) { toast.error(T('err_credits_min')); return; }
    if (amount > balance) { toast.error(T('err_insufficient_balance')); return; }
    if (!walletAddress) { toast.error(T('err_wallet_polygon_first')); return; }
    const walletShort = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    toast.success(T('toast_redeem_request').replace('${amount}', (amount * 0.01).toFixed(2)).replace('{wallet}', walletShort));
    setShowWithdraw(false);
  };

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="text-center">
        <Coins className="w-12 h-12 text-brand mx-auto mb-4" />
        <h2 className="font-black text-[var(--text)] text-xl mb-2">{T('credits_page_title')}</h2>
        <p className="text-[var(--text2)] mb-4">{T('credits_login_prompt')}</p>
        <a href="/auth" className="btn-primary">{T('credits_sign_in_btn')}</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Balance card */}
        <div className="card p-6 mb-8" style={{ background: 'linear-gradient(135deg,var(--bg2),var(--bg3))', borderColor: 'rgba(99,102,241,.3)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-[var(--text2)] mb-1 flex items-center gap-1.5"><Coins className="w-4 h-4 text-brand" /> {T('credits_balance_label')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-[var(--text)]">{balance.toLocaleString(numLocale)}</span>
                <span className="text-[var(--text2)]">{T('credits_credits_word')}</span>
              </div>
              <p className="text-sm text-[var(--text2)] mt-1">{T('credits_usdc_rate').replace('${amount}', (balance * 0.01).toFixed(2))}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowWithdraw(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text2)] hover:border-brand/50 hover:text-brand transition-all">
                <ArrowLeft className="w-4 h-4" /> {T('credits_redeem_btn')}
              </button>
            </div>
          </div>
        </div>

        {/* Withdraw modal */}
        {showWithdraw && (
          <div className="card p-5 mb-6 border-brand/30">
            <h3 className="font-bold text-[var(--text)] mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand" /> {T('credits_redeem_title')}
            </h3>
            {!walletAddress ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-3">
                <p className="text-sm text-amber-400 font-semibold mb-1">{T('credits_wallet_missing')}</p>
                <p className="text-xs text-amber-400/70 mb-3">{T('credits_wallet_hint')}</p>
                <a href="/editor" className="text-xs text-brand underline">{T('credits_editor_link')}</a>
              </div>
            ) : (
              <>
                <p className="text-xs text-[var(--text2)] mb-3">{T('credits_sending_to')} <span className="font-mono text-[var(--text)]">{walletAddress.slice(0,8)}...{walletAddress.slice(-6)}</span></p>
                <div className="flex gap-2 mb-3">
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    className="input flex-1" placeholder={T('credits_placeholder_amount')} min={100} max={balance} />
                  <span className="flex items-center text-sm text-[var(--text2)] px-2">
                    {T('credits_equals_usdc').replace('${amount}', withdrawAmount ? (parseInt(withdrawAmount) * 0.01).toFixed(2) : '0.00')}
                  </span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-3 text-xs text-blue-400">
                  <p className="font-semibold mb-1">{T('credits_withdraw_help_meta')}</p>
                  <p className="opacity-80">{T('credits_no_wallet_help')}</p>
                </div>
              </>
            )}
            <div className="flex gap-2">
              {walletAddress && <button onClick={handleWithdraw} className="btn-primary text-sm flex-1 justify-center">{T('credits_redeem')}</button>}
              <button onClick={() => setShowWithdraw(false)} className="btn-secondary text-sm flex-1 justify-center">{T('credits_cancel')}</button>
            </div>
          </div>
        )}

        {/* IA USD top-up (per mini-site) */}
        <h2 className="font-black text-[var(--text)] text-xl mb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-violet-400" /> {T('credits_ia_topup_title')}
        </h2>
        <p className="text-[var(--text2)] text-sm mb-3 leading-relaxed">{T('credits_ia_topup_blurb')}</p>
        <p className="text-[var(--text2)] text-xs mb-5 leading-relaxed border border-[var(--border)] rounded-xl p-3 bg-[var(--bg2)]/80">
          {T('credits_ia_deepseek_note')}
        </p>
        {aiSites.length === 0 ? (
          <div className="card p-5 mb-8 border border-amber-500/20 bg-amber-500/5">
            <p className="text-sm text-amber-200 mb-3">{T('credits_ia_no_site')}</p>
            <a href="/editor" className="text-sm font-bold text-brand underline">{T('credits_editor_link')}</a>
          </div>
        ) : (
          <div className="space-y-8 mb-10">
            {aiSites.map((s) => (
                <div key={s.id} className="card p-5 border border-violet-500/20 bg-violet-500/5">
                  <div className="mb-3">
                    <h3 className="font-bold text-[var(--text)]">
                      {s.site_name || s.slug}{' '}
                      <span className="text-[var(--text2)] font-normal text-sm">
                        {T('credits_ia_topup_site_heading').replace('{slug}', s.slug)}
                      </span>
                    </h3>
                    <p className="text-[11px] text-[var(--text2)] mt-2 leading-relaxed">
                      {T('credits_ia_wallet_hint')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {IA_FACE_PACKS.map((face) => {
                      const charge = iaTopupChargeUsd(face);
                      return (
                        <button
                          key={face}
                          type="button"
                          onClick={() => handleBuyAiTopup(s, face)}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] hover:border-violet-400/60 p-4 text-left transition-all"
                        >
                          <p className="text-sm font-black text-[var(--text)]">
                            {T('credits_ia_topup_pack_label').replace('{charge}', charge.toFixed(0))}
                          </p>
                          <p className="text-[10px] text-[var(--text2)] mt-1">{T('credits_stripe_usd')}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Buy packs */}
        <h2 className="font-black text-[var(--text)] text-xl mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-brand" /> {T('credits_buy_title')}
        </h2>
        <p className="text-[var(--text2)] text-sm mb-5">{T('credits_buy_blurb')}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {CREDIT_PACKS.map(pack => (
            <div key={pack.credits} className={`card p-5 cursor-pointer hover:border-brand/50 transition-all hover:-translate-y-0.5 ${pack.popular ? 'border-brand ring-2 ring-brand/20' : ''}`}
              onClick={() => handleBuy(pack)}>
              {pack.popular && <div className="text-center mb-2"><span className="bg-brand text-white text-xs font-black px-3 py-0.5 rounded-full">{T('credits_popular')}</span></div>}
              <div className="text-center">
                <p className="text-2xl font-black text-[var(--text)]">{pack.credits.toLocaleString(numLocale)}</p>
                <p className="text-xs text-[var(--text2)]">{T('credits_credits_word')}</p>
                {pack.bonus > 0 && <p className="text-xs text-green-500 font-bold mt-0.5">{T('credits_bonus_free').replace('{n}', String(pack.bonus))}</p>}
                <p className="text-lg font-black text-brand mt-2">${pack.usdc.toFixed(2)} USD</p>
              </div>
              <button className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                {T('credits_buy_pack')}
              </button>
            </div>
          ))}
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-[var(--text)] mb-4 flex items-center gap-2"><History className="w-4 h-4" /> {T('credits_history_title')}</h3>
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {tx.amount > 0 ? '+' : '−'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.description}</p>
                    <p className="text-xs text-[var(--text2)]">{new Date(tx.created_at).toLocaleDateString(numLocale)}</p>
                  </div>
                  <span className={`text-sm font-black ${tx.amount > 0 ? 'text-green-500' : 'text-[var(--text2)]'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
