'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useCart } from '@/store/cart';
import { Check, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n, useT } from '@/lib/i18n';
import { PLATFORM_USD } from '@/lib/platformPricing';
import { PLAN_MARKETING_PLANOS_EN_KEY } from '@/lib/planMarketingSettings';

const PRO_M = PLATFORM_USD.proMonthly;
const PRO_Y = PLATFORM_USD.proYearly;
const PRO_2Y = PLATFORM_USD.proTwoYear;

type ProBilling = 'monthly' | 'yearly' | 'two_year';

const PRO_FEATURES_FALLBACK = [
  'Unlimited links',
  '3 site pages',
  'Feed & paid posts (Stripe)',
  'CV unlock',
  '30 themes',
  'Analytics',
  '1 free slug included',
];

const PRO_FALLBACK_PLAN = {
  id: 'static-pro',
  slug: 'pro',
  name: 'Pro',
  emoji: '⚡',
  color: '#818cf8',
  features: PRO_FEATURES_FALLBACK,
  active: true,
  sort_order: 1,
};

export default function PlanosPage() {
  const T = useT();
  const { lang } = useI18n();
  const [billing, setBilling] = useState<ProBilling>('monthly');
  const [proPlan, setProPlan] = useState<any>(PRO_FALLBACK_PLAN);
  const [loading, setLoading] = useState(true);
  const [planosNoteOverride, setPlanosNoteOverride] = useState('');
  const { add, open } = useCart();

  useEffect(() => {
    let cancelled = false;
    void (supabase as any)
      .from('platform_settings')
      .select('value')
      .eq('key', PLAN_MARKETING_PLANOS_EN_KEY)
      .maybeSingle()
      .then(({ data }: any) => {
        if (cancelled) return;
        const v = typeof data?.value === 'string' ? data.value.trim() : '';
        if (v) setPlanosNoteOverride(v);
      });
    void (supabase as any)
      .from('platform_plans')
      .select('*')
      .eq('active', true)
      .eq('slug', 'pro')
      .maybeSingle()
      .then(({ data }: any) => {
        if (cancelled) return;
        if (data) {
          setProPlan({
            ...data,
            features:
              Array.isArray(data.features) && data.features.length > 0 ? data.features : PRO_FEATURES_FALLBACK,
          });
        } else {
          setProPlan(PRO_FALLBACK_PLAN);
        }
      })
      .catch(() => {
        if (!cancelled) setProPlan(PRO_FALLBACK_PLAN);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = billing === 'yearly' ? PRO_Y : billing === 'two_year' ? PRO_2Y : PRO_M;

  const handleBuy = () => {
    const periodLabel =
      billing === 'yearly'
        ? T('plans_period_yearly')
        : billing === 'two_year'
          ? T('plans_period_two_year')
          : T('plans_period_monthly');
    const idSuffix = billing === 'yearly' ? 'yr' : billing === 'two_year' ? '2yr' : 'mo';
    add({
      id: `plan_pro_${idSuffix}`,
      label: `${proPlan.name || 'Pro'} (${periodLabel})`,
      price: total,
      type: 'plan',
    });
    open();
  };

  const period =
    lang === 'pt'
      ? billing === 'yearly'
        ? T('plans_suffix_yr')
        : billing === 'two_year'
          ? T('plans_suffix_2yr')
          : T('plans_suffix_mo')
      : billing === 'yearly'
        ? '/yr'
        : billing === 'two_year'
          ? '/2 yr'
          : '/mo';

  const baseFeatures: string[] = Array.isArray(proPlan.features) ? proPlan.features : PRO_FEATURES_FALLBACK;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="font-black text-4xl text-[var(--text)] mb-3">{T('plans_title')}</h1>
          <p className="text-[var(--text2)] text-lg">{T('plans_subtitle')}</p>
          <p className="text-xs text-[var(--text2)] mt-2 font-medium tracking-wide uppercase">{T('plans_all_usd')}</p>
          <p className="text-sm text-[var(--text2)] mt-4 leading-relaxed max-w-md mx-auto">
            {planosNoteOverride.trim() ? planosNoteOverride : T('plans_pro_only_note')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {(['monthly', 'yearly', 'two_year'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  billing === b ? 'bg-brand text-white' : 'text-[var(--text2)] bg-[var(--border)]/60 hover:opacity-90'
                }`}
              >
                {b === 'monthly' ? T('plans_monthly') : b === 'yearly' ? T('plans_yearly') : T('plans_two_year')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="card p-8 relative ring-2 ring-brand shadow-xl shadow-brand/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
              {T('plans_most_popular')}
            </div>

            <div className="mb-6">
              <span className="text-3xl">{proPlan.emoji || '⚡'}</span>
              <h2 className="text-xl font-black mt-2" style={{ color: proPlan.color || 'var(--text)' }}>
                {proPlan.name || 'Pro'}
              </h2>
              <div className="flex flex-wrap items-end gap-2 mt-3">
                <span className="text-4xl font-black text-[var(--text)]">US${total.toFixed(2)}</span>
                <span className="text-[var(--text2)] mb-1">{period}</span>
              </div>
              <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed">{T('plans_single_price_hint')}</p>
            </div>

            <ul className="space-y-2.5 mb-6">
              {baseFeatures.map((f: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text2)]">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleBuy}
              className="w-full py-3.5 rounded-xl font-black text-base transition-all hover:opacity-90 btn-primary"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              {T('plans_subscribe_pro').replace('{name}', proPlan.name || 'Pro')}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-[var(--text2)] mt-10 flex items-center justify-center gap-2">
          🔒 {T('plans_stripe_footer')}
        </p>
      </div>
    </div>
  );
}
