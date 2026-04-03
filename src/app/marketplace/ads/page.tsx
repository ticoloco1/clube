'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Megaphone, ArrowLeft, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

function MarketplaceAdsFallback() {
  const T = useT();
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text2)]">{T('mkt_loading')}</div>
  );
}

function MarketplaceAdsInner() {
  const T = useT();
  const sp = useSearchParams();
  const slug = sp.get('slug') || '';
  const host = slug ? `https://${slug}.trustbank.xyz` : '';
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [bid, setBid] = useState('49');
  const [color, setColor] = useState('#6366f1');
  const [product, setProduct] = useState('');
  const [tone, setTone] = useState<'professional' | 'wild_monkey'>('professional');
  const [script, setScript] = useState('');
  const [sending, setSending] = useState(false);

  const submitMagic = async () => {
    if (!user) {
      toast.error(T('mkt_magic_need_login'));
      return;
    }
    if (!slug.trim()) {
      toast.error(T('mkt_hint_1'));
      return;
    }
    const t = title.trim();
    if (!t) {
      toast.error(T('mkt_field_title'));
      return;
    }
    const b = parseFloat(bid.replace(',', '.'));
    if (!Number.isFinite(b) || b < 1) {
      toast.error(T('mkt_field_bid'));
      return;
    }
    setSending(true);
    try {
      const { data: siteRow, error: se } = await supabase
        .from('mini_sites')
        .select('id')
        .eq('slug', slug.trim().toLowerCase())
        .maybeSingle();
      if (se || !siteRow) {
        toast.error(T('mkt_magic_err'));
        setSending(false);
        return;
      }

      const { data: prop, error: pe } = await (supabase as any)
        .from('ad_proposals')
        .insert({
          advertiser_user_id: user.id,
          title: t,
          body: body.trim() || null,
          duration_days: 7,
          total_budget_usdc: b,
          status: 'sent',
          magic_brand_color: color.trim() || null,
          magic_product_label: product.trim() || null,
          magic_tone: tone,
          magic_script: script.trim() || null,
        })
        .select('id')
        .single();

      if (pe || !prop?.id) {
        console.error(pe);
        toast.error(T('mkt_magic_err'));
        setSending(false);
        return;
      }

      const { error: te } = await (supabase as any).from('ad_proposal_targets').insert({
        proposal_id: prop.id,
        site_id: (siteRow as { id: string }).id,
        bid_amount_usdc: b,
        owner_status: 'pending',
      });

      if (te) {
        console.error(te);
        toast.error(T('mkt_magic_err'));
        setSending(false);
        return;
      }

      toast.success(T('mkt_magic_ok'));
      setTitle('');
      setScript('');
    } catch (e) {
      console.error(e);
      toast.error(T('mkt_magic_err'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12 flex-1">
        <Link
          href="/sites"
          className="inline-flex items-center gap-2 text-sm text-[var(--text2)] hover:text-brand mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> {T('mkt_back')}
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand/15 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-brand" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text)]">{T('mkt_title')}</h1>
        </div>
        <p className="text-[var(--text2)] text-sm leading-relaxed mb-6">{T('mkt_body')}</p>
        {slug ? (
          <div className="space-y-6">
            <div className="card p-6 border border-brand/30 bg-brand/5">
              <p className="text-xs font-bold text-[var(--text2)] uppercase tracking-wide mb-2">{T('mkt_selected')}</p>
              <p className="font-mono font-black text-lg text-brand">{slug}.trustbank.xyz</p>
              {host && (
                <a
                  href={host}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-sm font-semibold text-brand hover:underline"
                >
                  {T('mkt_open')}
                </a>
              )}
            </div>

            <div className="card p-6 space-y-4 border border-[var(--border)]">
              <h2 className="font-black text-lg text-[var(--text)]">{T('mkt_magic_title')}</h2>
              <p className="text-xs text-[var(--text2)] leading-relaxed">{T('mkt_magic_intro')}</p>

              <div>
                <label className="label block text-xs mb-1">{T('mkt_field_title')}</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
              </div>
              <div>
                <label className="label block text-xs mb-1">{T('mkt_field_body')}</label>
                <textarea className="input resize-none min-h-[72px]" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
              </div>
              <div>
                <label className="label block text-xs mb-1">{T('mkt_field_bid')}</label>
                <input className="input" value={bid} onChange={(e) => setBid(e.target.value)} inputMode="decimal" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label block text-xs mb-1">{T('mkt_field_color')}</label>
                  <input className="input font-mono text-sm" value={color} onChange={(e) => setColor(e.target.value)} maxLength={14} />
                </div>
                <div>
                  <label className="label block text-xs mb-1">{T('mkt_field_product')}</label>
                  <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} maxLength={80} />
                </div>
              </div>
              <div>
                <label className="label block text-xs mb-1">{T('mkt_field_tone')}</label>
                <select className="input" value={tone} onChange={(e) => setTone(e.target.value as 'professional' | 'wild_monkey')}>
                  <option value="professional">{T('mkt_tone_pro')}</option>
                  <option value="wild_monkey">{T('mkt_tone_wild')}</option>
                </select>
              </div>
              <div>
                <label className="label block text-xs mb-1">{T('mkt_field_script')}</label>
                <textarea className="input resize-none min-h-[100px]" value={script} onChange={(e) => setScript(e.target.value)} maxLength={2000} />
              </div>

              <button
                type="button"
                disabled={sending}
                onClick={() => void submitMagic()}
                className="btn-primary w-full sm:w-auto gap-2 justify-center"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {sending ? T('mkt_magic_sending') : T('mkt_magic_submit')}
              </button>
              <p className="text-[10px] text-[var(--text2)]">{T('mkt_coming')}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text2)]">
            {T('mkt_hint_1')}{' '}
            <Link href="/sites" className="text-brand font-semibold hover:underline">
              /sites
            </Link>{' '}
            {T('mkt_hint_2').replace('{sponsor}', T('mkt_sponsor_label'))}
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default function MarketplaceAdsPage() {
  return (
    <Suspense fallback={<MarketplaceAdsFallback />}>
      <MarketplaceAdsInner />
    </Suspense>
  );
}
