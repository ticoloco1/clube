'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMySite } from '@/hooks/useSite';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { Header } from '@/components/layout/Header';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function VaultPage() {
  const { user, loading } = useAuth();
  const { site: mySite, reload: reloadSite } = useMySite();
  const { add, open } = useCart();
  const router = useRouter();
  const [slugs, setSlugs] = useState<any[]>([]);
  const [siteSlug, setSiteSlug] = useState('');
  const [busy, setBusy] = useState(true);
  const [mode, setMode] = useState<Record<string,string>>({});
  const [prices, setPrices] = useState<Record<string,string>>({});
  const [emails, setEmails] = useState<Record<string,string>>({});

  const load = async () => {
    if (!user) return;
    const [{ data: s }, { data: site }] = await Promise.all([
      (supabase as any).from('slug_registrations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      (supabase as any).from('mini_sites').select('slug').eq('user_id', user.id).maybeSingle(),
    ]);
    setSlugs(s || []);
    setSiteSlug(site?.slug || '');
    setBusy(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth'); return; }
    load();
  }, [user, loading]);

  const update = async (id: string, patch: any) => {
    const { error } = await (supabase as any).from('slug_registrations').update(patch).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('✅ Feito!');
    setMode(m => ({ ...m, [id]: '' }));
    load();
  };

  const applySlug = async (slug: string) => {
    // Use mySite from hook (most reliable)
    if (mySite?.id) {
      const { error } = await (supabase as any).from('mini_sites').update({ slug }).eq('id', mySite.id);
      if (error) { toast.error(error.message); return; }
      setSiteSlug(slug);
      reloadSite();
      toast.success(`✅ ${slug}.trustbank.xyz ativo!`);
      return;
    }
    // Fallback: query directly
    const { data: siteData } = await (supabase as any).from('mini_sites').select('id').eq('user_id', user!.id).maybeSingle();
    if (!siteData) { 
      toast.error('Mini site não encontrado. Vá em /editor e salve primeiro.');
      return; 
    }
    const { error } = await (supabase as any).from('mini_sites').update({ slug }).eq('id', siteData.id);
    if (error) { toast.error(error.message); return; }
    setSiteSlug(slug);
    reloadSite();
    toast.success(`✅ ${slug}.trustbank.xyz ativo!`);
  };

  if (loading || busy) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-[var(--text)]">🔐 Cofre de Slugs</h1>
            <p className="text-[var(--text2)] mt-1 text-sm">Venda · Leilão · Transferir · Usar no site</p>
          </div>
          <Link href="/slugs" className="bg-brand text-white font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition">
            + Registrar Slug
          </Link>
        </div>

        {slugs.length === 0 ? (
          <div className="card rounded-2xl p-16 text-center">
            <p className="text-5xl mb-4">🔑</p>
            <p className="font-black text-xl text-[var(--text)] mb-2">Nenhum slug registrado</p>
            <p className="text-[var(--text2)] mb-6 text-sm">Registre slugs no marketplace para aparecerem aqui</p>
            <Link href="/slugs" className="bg-brand text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition inline-block">
              Ir para o Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {slugs.map((s: any) => {
              const days = Math.floor((new Date(s.expires_at || Date.now() + 365*86400000).getTime() - Date.now()) / 86400000);
              const len = (s.slug || '').length;
              const icon = len <= 2 ? '👑' : len <= 3 ? '💎' : len <= 4 ? '🔷' : len <= 5 ? '🔹' : '🔑';
              const label = len <= 2 ? 'Legendary' : len <= 3 ? 'Ultra Rare' : len <= 4 ? 'Premium' : len <= 5 ? 'Popular' : 'Standard';
              const color = len <= 2 ? '#f59e0b' : len <= 3 ? '#a855f7' : len <= 4 ? '#818cf8' : len <= 5 ? '#38bdf8' : '#4ade80';
              const isActive = s.slug === siteSlug;
              const m = mode[s.id] || '';

              return (
                <div key={s.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">

                  {/* Top */}
                  <div className="p-5 flex items-center gap-4">
                    <span className="text-3xl flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-lg text-[var(--text)] font-mono">{s.slug}.trustbank.xyz</span>
                        {isActive && <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold">✓ Ativo</span>}
                        {s.for_sale && <span className="text-xs bg-brand/15 text-brand px-2 py-0.5 rounded-full font-bold">🏷️ ${s.sale_price?.toLocaleString()}</span>}
                        {s.status === 'auction' && <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-bold">🔨 Leilão</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold" style={{ color }}>{icon} {label}</span>
                        <span className="text-[var(--text2)]">·</span>
                        <span className={days <= 30 ? 'text-amber-400 font-bold' : 'text-[var(--text2)]'}>
                          {days > 0 ? `${days} dias restantes` : '⚠️ Expirado'}
                        </span>
                        <span className="text-[var(--text2)]">· $7/ano</span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="px-5 pb-4 flex flex-wrap gap-2">
                    {!isActive && (
                      <button onClick={() => applySlug(s.slug)}
                        className="text-xs font-bold px-3 py-2 rounded-xl bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20 transition">
                        🌐 Usar no meu site
                      </button>
                    )}
                    {days <= 0 && (
                      <button onClick={() => { add({ id: `renew_${s.id}`, label: `Renovar ${s.slug}.trustbank.xyz`, price: 7, type: 'slug' }); open(); }}
                        className="text-xs font-bold px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition">
                        🔄 Renovar $7
                      </button>
                    )}
                    <button onClick={() => setMode(prev => ({ ...prev, [s.id]: prev[s.id] === 'sell' ? '' : 'sell' }))}
                      className="text-xs font-bold px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-brand/40 transition">
                      🏷️ Vender
                    </button>
                    <button onClick={() => setMode(prev => ({ ...prev, [s.id]: prev[s.id] === 'auction' ? '' : 'auction' }))}
                      className="text-xs font-bold px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-amber-400/40 transition">
                      🔨 Leilão
                    </button>
                    <button onClick={() => setMode(prev => ({ ...prev, [s.id]: prev[s.id] === 'transfer' ? '' : 'transfer' }))}
                      className="text-xs font-bold px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:border-blue-400/40 transition">
                      ↗️ Transferir
                    </button>
                    {s.for_sale && (
                      <>
                        <button onClick={() => setMode(p => ({ ...p, [s.id]: 'sell' }))}
                          className="text-xs font-bold px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] transition">
                          ✏️ Editar preço
                        </button>
                        <button onClick={() => update(s.id, { for_sale: false, sale_price: null, status: 'active' })}
                          className="text-xs font-bold px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">
                          ✕ Tirar da venda
                        </button>
                      </>
                    )}
                  </div>

                  {/* Sell */}
                  {m === 'sell' && (
                    <div className="mx-5 mb-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex items-center gap-3">
                      <span className="text-sm text-[var(--text2)] flex-shrink-0">Preço USDC:</span>
                      <input type="number" value={prices[s.id] || ''} onChange={e => setPrices(p => ({ ...p, [s.id]: e.target.value }))}
                        className="input flex-1 py-2 text-sm" placeholder="Ex: 500" min="1" />
                      <button onClick={() => update(s.id, { for_sale: true, sale_price: parseFloat(prices[s.id] || '0'), status: 'active' })}
                        disabled={!prices[s.id]} className="bg-brand text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-40">Salvar</button>
                      <button onClick={() => setMode(p => ({ ...p, [s.id]: '' }))} className="text-[var(--text2)] hover:text-red-400">✕</button>
                    </div>
                  )}

                  {/* Auction */}
                  {m === 'auction' && (
                    <div className="mx-5 mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text2)] flex-shrink-0">Lance mínimo:</span>
                        <input type="number" value={prices[s.id] || ''} onChange={e => setPrices(p => ({ ...p, [s.id]: e.target.value }))}
                          className="input flex-1 py-2 text-sm" placeholder="Ex: 100 USDC" min="1" />
                        <button onClick={async () => {
                          const minBid = parseFloat(prices[s.id] || '0');
                          if (!user || !minBid) return;
                          const ends = new Date(Date.now() + 7 * 86400000).toISOString();
                          const { error: e1 } = await (supabase as any).from('slug_auctions').insert({
                            slug: s.slug,
                            slug_registration_id: s.id,
                            seller_id: user.id,
                            min_bid: minBid,
                            current_bid: 0,
                            min_increment: 5,
                            bid_count: 0,
                            ends_at: ends,
                            status: 'active',
                          });
                          if (e1) { toast.error(e1.message); return; }
                          await update(s.id, { for_sale: true, sale_price: minBid, status: 'auction' });
                        }}
                          disabled={!prices[s.id]} className="bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-40">Iniciar</button>
                        <button onClick={() => setMode(p => ({ ...p, [s.id]: '' }))} className="text-[var(--text2)]">✕</button>
                      </div>
                      <p className="text-xs text-amber-400">Leilão de 7 dias · plataforma cobra 15%</p>
                    </div>
                  )}

                  {/* Transfer */}
                  {m === 'transfer' && (
                    <div className="mx-5 mb-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
                      <div className="flex items-center gap-3">
                        <input value={emails[s.id] || ''} onChange={e => setEmails(p => ({ ...p, [s.id]: e.target.value }))}
                          className="input flex-1 py-2 text-sm" placeholder="Email do destinatário no TrustBank" type="email" />
                        <button onClick={async () => {
                          const email = emails[s.id];
                          if (!email) return;
                          const { data } = await (supabase as any).from('mini_sites').select('user_id').eq('contact_email', email).maybeSingle();
                          if (!data) { toast.error('Usuário não encontrado — use o email cadastrado no TrustBank'); return; }
                          update(s.id, { user_id: data.user_id, status: 'active', for_sale: false, sale_price: null });
                        }} disabled={!emails[s.id]} className="bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-40">Transferir</button>
                        <button onClick={() => setMode(p => ({ ...p, [s.id]: '' }))} className="text-[var(--text2)]">✕</button>
                      </div>
                      <p className="text-xs text-red-400 font-bold">⚠️ Irreversível — você perderá este slug permanentemente</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] text-sm">
          <p className="font-black text-[var(--text)] mb-3">ℹ️ Como funciona</p>
          <div className="grid md:grid-cols-3 gap-3 text-[var(--text2)]">
            <p><strong className="text-[var(--text)]">$7/ano</strong> mantém o slug ativo por 365 dias</p>
            <p><strong className="text-[var(--text)]">30 dias</strong> de grace period após vencer</p>
            <p>Sem renovação → slug <strong className="text-[var(--text)]">volta ao marketplace</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
