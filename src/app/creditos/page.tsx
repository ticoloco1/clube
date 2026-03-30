'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/store/cart';
import { Coins, ArrowRight, ArrowLeft, History, Wallet, Info, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const CREDIT_PACKS = [
  { credits: 100,  usdc: 1.00,  label: '100 créditos', bonus: 0 },
  { credits: 500,  usdc: 5.00,  label: '500 créditos', bonus: 0 },
  { credits: 1000, usdc: 10.00, label: '1.000 créditos', bonus: 50,  popular: true },
  { credits: 5000, usdc: 50.00, label: '5.000 créditos', bonus: 500 },
  { credits: 10000,usdc: 100.00,label: '10.000 créditos', bonus: 1500 },
];

export default function CreditosPage() {
  const { user } = useAuth();
  const { add, open: openCart } = useCart();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('credit_wallets').select('balance').eq('user_id', user.id).maybeSingle()
      .then(({ data }: any) => setBalance(data?.balance || 0));
    (supabase as any).from('credit_transactions').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }: any) => setTransactions(data || []));
    supabase.from('mini_sites').select('wallet_address').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setWalletAddress((data as any)?.wallet_address || ''));
  }, [user]);

  const handleBuy = (pack: typeof CREDIT_PACKS[0]) => {
    add({
      id: `credits_${pack.credits}_${Date.now()}`,
      label: `${pack.label}${pack.bonus > 0 ? ` + ${pack.bonus} bônus` : ''} = $${pack.usdc} USDC`,
      price: pack.usdc,
      type: 'plan',
    });
    toast.success(`${pack.credits + pack.bonus} créditos no carrinho!`);
    openCart();
  };

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 100) { toast.error('Mínimo 100 créditos ($1.00 USDC)'); return; }
    if (amount > balance) { toast.error('Saldo insuficiente'); return; }
    if (!walletAddress) { toast.error('Adicione sua carteira Polygon no editor primeiro'); return; }
    // In production, this would trigger a server-side withdrawal
    toast.success(`Solicitação de resgate de $${(amount * 0.01).toFixed(2)} USDC enviada para ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
    setShowWithdraw(false);
  };

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="text-center">
        <Coins className="w-12 h-12 text-brand mx-auto mb-4" />
        <h2 className="font-black text-[var(--text)] text-xl mb-2">Créditos TrustBank</h2>
        <p className="text-[var(--text2)] mb-4">Faça login para ver seu saldo</p>
        <a href="/auth" className="btn-primary">Entrar</a>
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
              <p className="text-sm text-[var(--text2)] mb-1 flex items-center gap-1.5"><Coins className="w-4 h-4 text-brand" /> Seu saldo</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-[var(--text)]">{balance.toLocaleString()}</span>
                <span className="text-[var(--text2)]">créditos</span>
              </div>
              <p className="text-sm text-[var(--text2)] mt-1">≈ ${(balance * 0.01).toFixed(2)} USDC · 1 crédito = $0.01</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowWithdraw(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text2)] hover:border-brand/50 hover:text-brand transition-all">
                <ArrowLeft className="w-4 h-4" /> Resgatar USDC
              </button>
            </div>
          </div>
        </div>

        {/* Withdraw modal */}
        {showWithdraw && (
          <div className="card p-5 mb-6 border-brand/30">
            <h3 className="font-bold text-[var(--text)] mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand" /> Resgatar créditos em USDC
            </h3>
            {!walletAddress ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-3">
                <p className="text-sm text-amber-400 font-semibold mb-1">Carteira não configurada</p>
                <p className="text-xs text-amber-400/70 mb-3">Adicione seu endereço Polygon no editor para resgatar.</p>
                <a href="/editor" className="text-xs text-brand underline">Ir para o editor →</a>
              </div>
            ) : (
              <>
                <p className="text-xs text-[var(--text2)] mb-3">Enviando para: <span className="font-mono text-[var(--text)]">{walletAddress.slice(0,8)}...{walletAddress.slice(-6)}</span></p>
                <div className="flex gap-2 mb-3">
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    className="input flex-1" placeholder="Quantos créditos? (min. 100)" min={100} max={balance} />
                  <span className="flex items-center text-sm text-[var(--text2)] px-2">
                    = ${withdrawAmount ? (parseInt(withdrawAmount) * 0.01).toFixed(2) : '0.00'} USDC
                  </span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-3 text-xs text-blue-400">
                  <p className="font-semibold mb-1">💡 Não tem carteira Polygon?</p>
                  <p className="opacity-80">É grátis e fácil. <a href="https://metamask.io" target="_blank" className="underline">MetaMask</a> ou <a href="https://rainbow.me" target="_blank" className="underline">Rainbow Wallet</a> — instale, crie uma carteira e copie o endereço que começa com 0x.</p>
                </div>
              </>
            )}
            <div className="flex gap-2">
              {walletAddress && <button onClick={handleWithdraw} className="btn-primary text-sm flex-1 justify-center">Resgatar</button>}
              <button onClick={() => setShowWithdraw(false)} className="btn-secondary text-sm flex-1 justify-center">Cancelar</button>
            </div>
          </div>
        )}

        {/* Buy packs */}
        <h2 className="font-black text-[var(--text)] text-xl mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-brand" /> Comprar Créditos
        </h2>
        <p className="text-[var(--text2)] text-sm mb-5">Use créditos para assistir vídeos, desbloquear CVs, dar boost — sem precisar fazer transação a cada vez.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {CREDIT_PACKS.map(pack => (
            <div key={pack.credits} className={`card p-5 cursor-pointer hover:border-brand/50 transition-all hover:-translate-y-0.5 ${pack.popular ? 'border-brand ring-2 ring-brand/20' : ''}`}
              onClick={() => handleBuy(pack)}>
              {pack.popular && <div className="text-center mb-2"><span className="bg-brand text-white text-xs font-black px-3 py-0.5 rounded-full">POPULAR</span></div>}
              <div className="text-center">
                <p className="text-2xl font-black text-[var(--text)]">{pack.credits.toLocaleString()}</p>
                <p className="text-xs text-[var(--text2)]">créditos</p>
                {pack.bonus > 0 && <p className="text-xs text-green-500 font-bold mt-0.5">+ {pack.bonus} bônus grátis!</p>}
                <p className="text-lg font-black text-brand mt-2">${pack.usdc.toFixed(2)} USDC</p>
              </div>
              <button className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                Comprar
              </button>
            </div>
          ))}
        </div>

        {/* Transactions */}
        {transactions.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-[var(--text)] mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Histórico</h3>
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {tx.amount > 0 ? '+' : '−'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.description}</p>
                    <p className="text-xs text-[var(--text2)]">{new Date(tx.created_at).toLocaleDateString('pt-BR')}</p>
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
