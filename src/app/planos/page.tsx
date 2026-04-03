'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useCart } from '@/store/cart';
import { Check, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n, useT } from '@/lib/i18n';

/** Plano público único: `slug = pro`. Fallbacks se a linha no Supabase estiver incompleta. */
const PRO_MONTHLY_USD = 29.99;
const PRO_YEARLY_USD = 288;

export default function PlanosPage() {
  const T = useT();
  const { lang } = useI18n();
  const [annual, setAnnual] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { add, open } = useCart();

  useEffect(() => {
    (supabase as any).from('platform_plans')
      .select('*').eq('active', true).order('sort_order')
      .then(({ data }: any) => {
        const rows = (data || []).filter((p: { slug?: string }) => String(p?.slug || '').toLowerCase() === 'pro');
        setPlans(rows);
        setLoading(false);
      });
  }, []);

  const resolvePrices = (plan: any) => {
    const m = Number(plan.price_monthly);
    const y = Number(plan.price_yearly);
    const monthly = Number.isFinite(m) && m > 0 ? m : PRO_MONTHLY_USD;
    const yearly = Number.isFinite(y) && y > 0 ? y : PRO_YEARLY_USD;
    return { monthly, yearly };
  };

  const handleBuy = (plan: any) => {
    const slug = String(plan.slug || 'pro').toLowerCase();
    const { monthly, yearly } = resolvePrices(plan);
    const price = annual ? yearly : monthly;
    const periodLabel = annual ? T('plans_period_yearly') : T('plans_period_monthly');
    add({ id: `plan_${slug}_${annual ? 'yr' : 'mo'}`, label: `${plan.name} (${periodLabel})`, price, type: 'plan' });
    open();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-black text-4xl text-[var(--text)] mb-3">{T('plans_title')}</h1>
          <p className="text-[var(--text2)] text-lg">{T('plans_subtitle')}</p>
          <p className="text-sm text-[var(--text2)] mt-4">{T('plans_pro_only_note')}</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-semibold ${!annual ? 'text-[var(--text)]' : 'text-[var(--text2)]'}`}>{T('plans_monthly')}</span>
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-brand' : 'bg-[var(--border)]'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${annual ? 'left-8' : 'left-1'}`} />
            </button>
            <span className={`text-sm font-semibold ${annual ? 'text-[var(--text)]' : 'text-[var(--text2)]'}`}>
              {T('plans_yearly')}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="grid gap-6 max-w-md mx-auto">
            {plans.map((plan) => {
              const { monthly, yearly } = resolvePrices(plan);
              const price = annual ? yearly : monthly;
              const period =
                lang === 'pt'
                  ? annual
                    ? T('plans_suffix_yr')
                    : T('plans_suffix_mo')
                  : annual
                    ? '/yr'
                    : '/mo';
              const isPopular = true;
              const features: string[] = Array.isArray(plan.features) ? plan.features : [];

              return (
                <div key={plan.id} className={`card p-8 relative transition-all hover:-translate-y-1 ${isPopular ? 'ring-2 ring-brand shadow-xl shadow-brand/20' : ''}`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                      {T('plans_most_popular')}
                    </div>
                  )}
                  <div className="mb-6">
                    <span className="text-3xl">{plan.emoji}</span>
                    <h2 className="text-xl font-black mt-2" style={{ color: plan.color || 'var(--text)' }}>{plan.name}</h2>
                    <div className="flex items-end gap-1 mt-3">
                      <span className="text-4xl font-black text-[var(--text)]">${price.toFixed(2)}</span>
                      <span className="text-[var(--text2)] mb-1">{period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-8">
                    {features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text2)]">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleBuy(plan)}
                    className={`w-full py-3.5 rounded-xl font-black text-base transition-all hover:opacity-90 ${isPopular ? 'btn-primary' : 'btn border-2 border-brand text-brand hover:bg-brand hover:text-white'}`}>
                    <Zap className="w-4 h-4 inline mr-2" />
                    {T('plans_start_with')} {plan.name}
                  </button>
                </div>
              );
            })}

            {plans.length === 0 && (
              <div className="col-span-3 text-center py-20 text-[var(--text2)]">
                {T('plans_no_plans')}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-[var(--text2)] mt-10 flex items-center justify-center gap-2">
          🔒 {T('plans_stripe_footer')}
        </p>
      </div>
    </div>
  );
}
