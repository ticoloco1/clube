'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Megaphone, ArrowLeft } from 'lucide-react';

function MarketplaceAdsInner() {
  const sp = useSearchParams();
  const slug = sp.get('slug') || '';
  const host = slug ? `https://${slug}.trustbank.xyz` : '';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12 flex-1">
        <Link
          href="/sites"
          className="inline-flex items-center gap-2 text-sm text-[var(--text2)] hover:text-brand mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Diretório de mini-sites
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand/15 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-brand" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text)]">Patrocínios TrustBank</h1>
        </div>
        <p className="text-[var(--text2)] text-sm leading-relaxed mb-6">
          As marcas escolhem mini-sites no diretório, enviam proposta com valor e duração, e pagam com USDC (Helio).
          O TrustBank retém o fluxo comercial e aplica a taxa da plataforma; o criador recebe a parte acordada após a
          campanha, conforme as regras ativas da sua conta.
        </p>
        {slug ? (
          <div className="card p-6 border border-brand/30 bg-brand/5">
            <p className="text-xs font-bold text-[var(--text2)] uppercase tracking-wide mb-2">Mini-site selecionado</p>
            <p className="font-mono font-black text-lg text-brand">{slug}.trustbank.xyz</p>
            {host && (
              <a
                href={host}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm font-semibold text-brand hover:underline"
              >
                Abrir site →
              </a>
            )}
            <p className="text-xs text-[var(--text2)] mt-6">
              Em breve: formulário de proposta e checkout Helio ligados à conta da empresa. Por agora use o
              diretório para contactar o perfil ou aguarde a próxima versão do fluxo automático.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text2)]">
            Escolhe um perfil em{' '}
            <Link href="/sites" className="text-brand font-semibold hover:underline">
              /sites
            </Link>{' '}
            e clica em <strong>Patrocínios</strong> no mini-site para voltar aqui com o slug na URL.
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default function MarketplaceAdsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text2)]">…</div>}>
      <MarketplaceAdsInner />
    </Suspense>
  );
}
