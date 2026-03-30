'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Zap, Users, Clock, Info, ChevronDown, Coins, ArrowRight, Sparkles } from 'lucide-react';
import { JackpotBanner } from '@/components/ui/JackpotBanner';

export default function JackpotPage() {
  const { user } = useAuth();
  const [pool, setPool] = useState<any>(null);
  const [myEntries, setMyEntries] = useState(0);
  const [draws, setDraws] = useState<any[]>([]);
  const [showFaq, setShowFaq] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    (supabase as any).from('jackpot_pool').select('*').maybeSingle().then(({ data }: any) => setPool(data));
    (supabase as any).from('jackpot_draws').select('*').order('created_at', { ascending: false }).limit(5).then(({ data }: any) => setDraws(data || []));
    (supabase as any).from('jackpot_entries').select('user_id', { count: 'exact', head: true }).is('draw_id', null).then(({ count }: any) => setTotalUsers(count || 0));
    if (user) {
      (supabase as any).from('jackpot_entries').select('tickets').eq('user_id', user.id).is('draw_id', null)
        .then(({ data }: any) => setMyEntries((data || []).reduce((s: number, r: any) => s + (r.tickets || 0), 0)));
    }
  }, [user]);

  const totalTickets = pool?.total_entries || 0;
  const myOdds = totalTickets > 0 ? ((myEntries / totalTickets) * 100).toFixed(2) : '0';
  const prizePool = (pool?.balance_usdc || 0) * 0.85; // 15% platform cut
  const firstPrize = prizePool * 0.5;

  const FAQ = [
    { q: 'Como ganhar tickets?', a: 'Você precisa ter um mini site publicado no TrustBank. Então, cada $0.50 USDC em boost = 1 ticket automático. Quanto mais boostar, mais tickets.' },
    { q: 'Qual a minha chance de ganhar?', a: `Seus tickets ÷ total de tickets no pool. Com ${myEntries} tickets e ${totalTickets} totais, suas chances são ${myOdds}%.` },
    { q: 'Como funciona o prêmio?', a: '15% fica na plataforma. Do restante: 1º lugar = 50%, restante dividido entre os demais ganhadores conforme posição.' },
    { q: 'Quando acontece o sorteio?', a: 'O admin decide quando sortear, geralmente quando o jackpot acumulou um valor significativo. Todos são notificados.' },
    { q: 'Posso resgatar meus créditos em USDC?', a: 'Sim. Vá em Configurações → Créditos → Resgatar. O USDC é enviado para sua carteira Polygon. Se não tiver carteira, mostramos como criar uma.' },
    { q: 'É legal?', a: 'Tratamos o jackpot como recompensa de fidelidade da plataforma — um benefício da atividade de boost, não uma loteria separada. Verifique as leis locais do seu país.' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg,#0d0500 0%,var(--bg) 100%)', paddingBottom: 40 }}>
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-5 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Jackpot Acumulado — 20% de todo boost
          </div>
          <div className="text-6xl md:text-8xl font-black mb-2"
            style={{ fontFamily: '"Courier New",monospace', color: '#fbbf24', textShadow: '0 0 40px rgba(251,191,36,.4)' }}>
            ${(pool?.balance_usdc || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-amber-400/60 text-sm mb-2">USDC na Polygon</p>
          <div className="flex items-center justify-center gap-6 text-sm text-[var(--text2)] mb-8">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {totalUsers} participantes</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> {totalTickets.toLocaleString()} tickets</span>
            <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-400" /> 1º prêmio: ${firstPrize.toFixed(2)}</span>
          </div>
          {/* Eligibility notice */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 mb-4">
            <span>✅ Só mini sites publicados participam · Boost = tickets automáticos</span>
          </div>

          {user ? (
            myEntries > 0 ? (
              <div className="inline-block bg-amber-500/10 border border-amber-500/30 rounded-2xl px-6 py-4">
                <p className="text-amber-300 font-black text-xl">{myEntries} tickets</p>
                <p className="text-amber-400/60 text-sm">= {myOdds}% de chance · Boost mais para aumentar!</p>
              </div>
            ) : (
              <div className="inline-block">
                <p className="text-[var(--text2)] mb-3">Você ainda não tem tickets. Dê boost em qualquer conteúdo!</p>
                <a href="/slugs" className="btn-primary inline-flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Dar boost agora <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )
          ) : (
            <a href="/auth" className="btn-primary inline-flex items-center gap-2">
              Entrar para participar <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16">

        {/* How prizes are distributed */}
        <div className="card p-6 mb-8">
          <h2 className="font-black text-[var(--text)] text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Distribuição dos Prêmios
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { place: '🥇 1º', pct: 50, color: '#fbbf24' },
              { place: '🥈 2º', pct: 20, color: '#94a3b8' },
              { place: '🥉 3º', pct: 12, color: '#fb923c' },
              { place: '4–20º', pct: 18, color: '#818cf8' },
            ].map(w => (
              <div key={w.place} className="text-center p-4 rounded-xl bg-[var(--bg2)] border border-[var(--border)]">
                <div className="text-2xl font-black mb-1" style={{ color: w.color }}>{w.pct}%</div>
                <div className="text-sm font-bold text-[var(--text)]">{w.place}</div>
                <div className="text-xs text-[var(--text2)] mt-1">${((prizePool * w.pct) / 100).toFixed(0)} USDC*</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text2)]">* Baseado no pool atual após 15% da plataforma. Valores variam conforme o jackpot cresce.</p>
        </div>

        {/* How it works */}
        <div className="card p-6 mb-8">
          <h2 className="font-black text-[var(--text)] text-lg mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand" /> Como Funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '01', icon: '🚀', title: 'Publique seu mini site', desc: 'Só usuários com mini site publicado participam. Depois, cada $0.50 USDC em boost = 1 ticket automático.' },
              { n: '02', icon: '🎰', title: 'Acumula', desc: '20% de cada boost vai para o pool. O jackpot cresce conforme mais pessoas boostan.' },
              { n: '03', icon: '🏆', title: 'Sorteio', desc: 'O admin sorteia quando achar ideal. Quanto mais tickets, maiores suas chances. Resultado on-chain.' },
            ].map(s => (
              <div key={s.n} className="bg-[var(--bg2)] rounded-xl p-4">
                <div className="text-3xl mb-2">{s.icon}</div>
                <h3 className="font-bold text-[var(--text)] mb-1">{s.title}</h3>
                <p className="text-sm text-[var(--text2)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Past draws */}
        {draws.length > 0 && (
          <div className="card p-6 mb-8">
            <h2 className="font-black text-[var(--text)] text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--text2)]" /> Sorteios Anteriores
            </h2>
            <div className="space-y-3">
              {draws.map((draw: any) => (
                <div key={draw.id} className="flex items-center justify-between p-4 bg-[var(--bg2)] rounded-xl">
                  <div>
                    <p className="font-bold text-[var(--text)] text-sm">{new Date(draw.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="text-xs text-[var(--text2)]">{draw.total_entries?.toLocaleString()} tickets · {draw.winners?.length} ganhadores</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-amber-400">${draw.total_prize_usdc?.toFixed(2)}</p>
                    <p className="text-xs text-[var(--text2)]">USDC distribuído</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="card p-6">
          <h2 className="font-black text-[var(--text)] text-lg mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-brand" /> Perguntas Frequentes
          </h2>
          <div className="space-y-2">
            {FAQ.map((faq, i) => (
              <div key={i} className="border border-[var(--border)] rounded-xl overflow-hidden">
                <button onClick={() => setShowFaq(showFaq === i ? null : i)}
                  className="flex items-center justify-between w-full p-4 text-left hover:bg-[var(--bg2)] transition-colors">
                  <span className="font-semibold text-sm text-[var(--text)]">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[var(--text2)] transition-transform flex-shrink-0 ml-3 ${showFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {showFaq === i && (
                  <div className="px-4 pb-4 text-sm text-[var(--text2)] leading-relaxed border-t border-[var(--border)]" style={{ paddingTop: 12 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
