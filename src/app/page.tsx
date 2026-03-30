'use client';
import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JackpotBanner } from '@/components/ui/JackpotBanner';
import {
  Globe, Link2, Video, FileText, Image as ImgIcon, Lock,
  Zap, DollarSign, ArrowRight, GripVertical, Crown,
  Play, Users, Shield, Coins, TrendingUp
} from 'lucide-react';

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Globe,     title: 'Custom Mini Site',     desc: 'Your own slug.trustbank.xyz page with links, bio, avatar and banner.' },
  { icon: Link2,     title: 'Social Links',          desc: 'All your profiles in one place — Instagram, YouTube, TikTok, X and more.' },
  { icon: Video,     title: 'Paywall Videos',        desc: 'YouTube videos behind USDC paywall. Fans pay. You earn 60%.' },
  { icon: FileText,  title: 'Professional CV',        desc: 'Experience, skills, education. Companies pay $20 USDC to unlock.' },
  { icon: ImgIcon,   title: 'Photo Gallery',          desc: 'Profile photos, banners and visual portfolio on your page.' },
  { icon: Lock,      title: 'CV Paywall',             desc: 'CV stays locked. Each unlock pays you 50% directly to your wallet.' },
  { icon: Zap,       title: 'Boost',                  desc: 'Anyone can boost your profile or videos — $0.50 per position. 7 days.' },
  { icon: DollarSign,title: 'Earn in USDC',           desc: 'All revenue goes straight to your Polygon wallet. No banks.' },
];

// ── How it works steps ─────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: Globe,
    title: '1. Create your Mini Site',
    desc: 'Pick your unique slug, upload photo, bio and choose from 30 themes.',
    mockup: (
      <div className="bg-gradient-to-b from-purple-900 to-indigo-900 rounded-xl p-4 text-center space-y-2 h-full">
        <div className="w-12 h-12 rounded-full bg-purple-400 mx-auto" />
        <div className="h-3 w-24 bg-white/30 rounded mx-auto" />
        <div className="h-2 w-32 bg-white/15 rounded mx-auto" />
        <div className="h-8 w-full bg-white/10 rounded-lg mt-2" />
        <div className="h-8 w-full bg-white/10 rounded-lg" />
      </div>
    ),
  },
  {
    icon: Link2,
    title: '2. Add Social Links',
    desc: 'Instagram, YouTube, TikTok, X and more — all icons, all in one page.',
    mockup: (
      <div className="bg-white rounded-xl p-3 space-y-2 h-full">
        {['Instagram','YouTube','TikTok','LinkedIn'].map(n => (
          <div key={n} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <div className="w-4 h-4 rounded-full bg-indigo-300" />
            <span className="text-[11px] font-bold text-gray-700">{n}</span>
            <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Video,
    title: '3. Paywall Videos',
    desc: 'Add YouTube videos and set a USDC price. Fans pay to watch your content.',
    mockup: (
      <div className="bg-gray-900 rounded-xl p-3 space-y-2 h-full">
        <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-2 w-20 bg-white/20 rounded" />
          <span className="text-[11px] font-black text-green-400">$0.99 USDC</span>
        </div>
      </div>
    ),
  },
  {
    icon: FileText,
    title: '4. Professional CV',
    desc: 'Add experience, education and skills. Companies pay USDC to unlock your contact.',
    mockup: (
      <div className="bg-amber-50 rounded-xl p-3 space-y-2 h-full">
        <div className="h-3 w-28 bg-amber-900/20 rounded" />
        <div className="h-2 w-20 bg-amber-900/10 rounded" />
        <div className="flex gap-1 flex-wrap mt-1">
          {['React','TypeScript','Node'].map(s => (
            <span key={s} className="text-[9px] font-bold px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">{s}</span>
          ))}
        </div>
        <div className="bg-amber-100 rounded-lg p-2 mt-1 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-2 w-16 bg-amber-900/15 rounded" />
            <div className="h-1.5 w-24 bg-amber-900/10 rounded" />
          </div>
          <Lock className="w-4 h-4 text-amber-600" />
        </div>
      </div>
    ),
  },
  {
    icon: Crown,
    title: '5. Claim Premium Slug',
    desc: 'Short slugs like /ceo, /art or /dev are valuable digital assets. Buy, sell, auction.',
    mockup: (
      <div className="bg-gray-900 rounded-xl p-3 space-y-2 h-full">
        {[['/ceo','$5,000'],['/art','$3,000'],['/dev','$1,500']].map(([slug, price]) => (
          <div key={slug} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[11px] font-black text-white font-mono">{slug}</span>
            <span className="text-[11px] font-black text-yellow-400">{price}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: GripVertical,
    title: '6. Reorder Modules',
    desc: 'Drag & drop to arrange Links, Videos, CV, Feed and more exactly how you want.',
    mockup: (
      <div className="bg-slate-900 rounded-xl p-3 space-y-1.5 h-full">
        {['🔗 Links','🎬 Videos','📄 CV','📝 Feed'].map(m => (
          <div key={m} className="flex items-center gap-2 px-2 py-2 bg-white/8 rounded-lg border border-white/10 text-[11px] text-white/80 font-bold">
            <GripVertical className="w-3 h-3 text-white/30" />
            {m}
          </div>
        ))}
      </div>
    ),
  },
];

// ── Stats ──────────────────────────────────────────────────────────────────────
const STATS = [
  { value: 'USDC', label: 'Polygon · No banks', icon: Coins },
  { value: '60%',  label: 'To creator on videos', icon: TrendingUp },
  { value: '30',   label: 'Premium themes', icon: ImgIcon },
  { value: '$0.50',label: 'Per boost position', icon: Zap },
];

export default function HomePage() {
  const T = useT();
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      (supabase as any).from('platform_plans')
        .select('*').eq('active', true).order('sort_order')
        .then(({ data }: any) => { if (data?.length) setDbPlans(data); });
    });
  }, []);
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'TrustBank',
          url: 'https://trustbank.xyz',
          description: 'Create your professional mini site with paywall videos, CV unlock and USDC payments.',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://trustbank.xyz/slugs?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        })}}
      />
      <Header />
      <JackpotBanner />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-6"
        style={{ background: 'linear-gradient(135deg, hsl(220 60% 14%), hsl(220 55% 22%), hsl(43 90% 24%))' }}>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full mb-6 text-sm font-bold text-white/90 border border-white/20">
            <Globe className="w-4 h-4" /> Your professional presence · USDC payments · Polygon
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-5 text-white">
            Your identity.<br />
            <span style={{ color: 'hsl(43 90% 55%)' }}>Your revenue.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Create a beautiful mini site with paywall videos, professional CV, social links and more.
            Companies pay to unlock your CV. You earn <strong className="text-white">60% of every sale</strong>.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/editor"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-lg shadow-xl transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: 'hsl(43 90% 50%)', color: 'hsl(220 60% 12%)' }}>
              Create Your Mini Site <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/sites"
              className="inline-flex items-center gap-2 border-2 border-white/30 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors">
              Browse Mini Sites
            </Link>
          </div>
        </div>
        {/* Glow orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'hsl(43 90% 50% / 0.15)' }} />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'hsl(213 100% 55% / 0.12)' }} />
      </section>

      {/* ── Stats ── */}
      <section className="py-10 px-6 border-b" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--secondary))' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="card p-4 text-center hover:-translate-y-0.5 transition-transform">
              <s.icon className="w-5 h-5 mx-auto mb-2 text-brand" />
              <p className="text-2xl font-black text-brand">{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-16 px-6" style={{ background: 'hsl(var(--secondary) / 0.4)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Everything in One Page
          </h2>
          <p className="text-center mb-10 max-w-xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Your mini site is your digital business card, portfolio, and revenue engine — all in USDC.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ background: 'hsl(var(--accent) / 0.12)' }}>
                  <f.icon className="w-5 h-5 text-accent-c" />
                </div>
                <h3 className="text-sm font-black mb-1" style={{ color: 'hsl(var(--foreground))' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works — with visual mockups ── */}
      <section className="py-16 px-6" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            How It Works
          </h2>
          <p className="text-center mb-10 max-w-xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Create your professional presence in minutes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STEPS.map(step => (
              <div key={step.title} className="card overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="h-40 p-3">{step.mockup}</div>
                <div className="p-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'hsl(var(--accent) / 0.12)' }}>
                      <step.icon className="w-4 h-4 text-accent-c" />
                    </div>
                    <h3 className="text-sm font-black" style={{ color: 'hsl(var(--foreground))' }}>{step.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/editor"
              className="btn-accent inline-flex items-center gap-2 px-8 py-3.5 text-base font-black">
              Create My Mini Site <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>


      {/* ── Pricing — dynamic from DB ── */}
      {dbPlans.length > 0 && (
        <section className="py-16 px-6" style={{ background: 'hsl(var(--secondary) / 0.4)' }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Simple Pricing
            </h2>
            <p className="text-center text-sm mb-10" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Start free. Upgrade when you need more.
            </p>
            <div className={`grid gap-6 ${dbPlans.length === 1 ? 'max-w-sm mx-auto' : dbPlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
              {dbPlans.map((plan, idx) => (
                <div key={plan.id} className={`card p-6 relative ${idx === 0 ? 'ring-2 ring-brand' : ''}`}>
                  {idx === 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </div>
                  )}
                  <div className="text-2xl mb-2">{plan.emoji}</div>
                  <h3 className="font-black text-lg mb-1" style={{ color: plan.color || 'var(--text)' }}>{plan.name}</h3>
                  <div className="text-3xl font-black text-[var(--text)] mb-4">
                    ${plan.price_monthly}<span className="text-sm text-[var(--text2)] font-normal">/mo</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {(Array.isArray(plan.features) ? plan.features : []).slice(0, 5).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[var(--text2)]">
                        <span className="text-green-400 font-bold">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/planos" className={`block text-center py-2.5 rounded-xl font-black text-sm transition-all ${idx === 0 ? 'btn-primary' : 'btn border border-brand text-brand hover:bg-brand/10'}`}>
                    Get {plan.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center card p-12"
          style={{ background: 'linear-gradient(135deg, hsl(220 60% 14%), hsl(220 55% 22%))' }}>
          <Users className="w-12 h-12 mx-auto mb-4 text-white/60" />
          <h2 className="text-3xl font-black text-white mb-3">Start earning in USDC today</h2>
          <p className="text-white/70 mb-8 text-lg">Free to create. No credit card. No bank account needed.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/editor"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-black text-base shadow-xl hover:opacity-90 transition-all hover:-translate-y-0.5"
              style={{ background: 'hsl(43 90% 50%)', color: 'hsl(220 60% 12%)' }}>
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/slugs"
              className="inline-flex items-center gap-2 border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-colors">
              <Crown className="w-5 h-5" /> Browse Slugs
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-6 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Payments via Helio · USDC on Polygon · No custody of funds
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
