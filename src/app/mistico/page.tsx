'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Sparkles, Moon, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/lib/i18n';

export default function MisticoHubPage() {
  const { user } = useAuth();
  const T = useT();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-black text-3xl text-[var(--text)] mb-2">{T('mystic_hub_title')}</h1>
        <p className="text-[var(--text2)] mb-10">{T('mystic_hub_sub')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/mistico/tarot"
            className="card p-6 flex flex-col gap-3 hover:border-brand/40 transition-colors border border-[var(--border)]"
          >
            <Moon className="w-10 h-10 text-purple-400" />
            <span className="font-black text-lg text-[var(--text)]">{T('mystic_tarot_title')}</span>
            <span className="text-sm text-[var(--text2)]">{T('mystic_tarot_desc')}</span>
          </Link>
          <Link
            href="/mistico/loteria"
            className="card p-6 flex flex-col gap-3 hover:border-brand/40 transition-colors border border-[var(--border)]"
          >
            <Sparkles className="w-10 h-10 text-amber-400" />
            <span className="font-black text-lg text-[var(--text)]">{T('mystic_lottery_title')}</span>
            <span className="text-sm text-[var(--text2)]">{T('mystic_lottery_desc')}</span>
          </Link>
          {user && (
            <Link
              href="/mistico/config"
              className="card p-6 flex flex-col gap-3 hover:border-brand/40 transition-colors border border-[var(--border)] sm:col-span-2"
            >
              <Settings className="w-10 h-10 text-brand" />
              <span className="font-black text-lg text-[var(--text)]">{T('mystic_config_title')}</span>
              <span className="text-sm text-[var(--text2)]">{T('mystic_config_desc')}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
