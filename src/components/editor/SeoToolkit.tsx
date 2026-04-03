'use client';

import { useT } from '@/lib/i18n';
import { Search, Globe } from 'lucide-react';

/** Título SEO sugerido a partir do slug (e nome do site, se existir). */
export function buildDefaultSeoTitle(slug: string, siteName: string): string {
  const s = (slug || '').trim().toLowerCase();
  if (!s) return '';
  const titled = s
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const name = (siteName || '').trim();
  if (name) return `${name} · ${titled}`;
  return `${titled} | TrustBank`;
}

type MeterZone = 'empty' | 'short' | 'good' | 'warn';

function resolveMeterZone(
  length: number,
  max: number,
  idealMax: number,
  minComfort: number,
): MeterZone {
  if (length === 0) return 'empty';
  if (length < minComfort) return 'short';
  if (length <= idealMax) return 'good';
  return 'warn';
}

const ZONE_STYLE: Record<
  MeterZone,
  { bar: string; labelKey: 'ed_seo_meter_empty' | 'ed_seo_meter_short' | 'ed_seo_meter_good' | 'ed_seo_meter_warn' }
> = {
  empty: { bar: '#64748b', labelKey: 'ed_seo_meter_empty' },
  short: { bar: '#eab308', labelKey: 'ed_seo_meter_short' },
  good: { bar: '#22c55e', labelKey: 'ed_seo_meter_good' },
  warn: { bar: '#f97316', labelKey: 'ed_seo_meter_warn' },
};

/** Barra + semáforo visual (verde / amarelo / laranja) para Title (70) e Description (160). */
export function SeoTrafficMeter({
  length,
  max,
  idealMax,
  minComfort,
}: {
  length: number;
  max: number;
  idealMax: number;
  minComfort: number;
}) {
  const T = useT();
  const zone = resolveMeterZone(length, max, idealMax, minComfort);
  const { bar, labelKey } = ZONE_STYLE[zone];
  const pct = max > 0 ? Math.min(100, (length / max) * 100) : 0;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="h-2 rounded-full bg-[var(--bg2)] overflow-hidden border border-[var(--border)] relative">
        <div
          className="h-full transition-[width] duration-300 ease-out rounded-full"
          style={{ width: `${pct}%`, backgroundColor: bar, boxShadow: zone === 'good' ? `0 0 12px ${bar}55` : undefined }}
        />
        {/* Marcadores ideais */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/25 pointer-events-none"
          style={{ left: `${(idealMax / max) * 100}%` }}
          title={`~${idealMax}`}
        />
      </div>
      <div className="flex justify-between items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
        <span className="text-[var(--text2)] tabular-nums">
          {length}/{max} {T('ed_seo_meter_chars')}
        </span>
        <span className="flex items-center gap-1.5" style={{ color: bar }}>
          <span className="inline-flex gap-1" aria-hidden title="SEO">
            {(() => {
              const dim = '#475569';
              if (zone === 'empty') {
                return (
                  <>
                    <span className="w-2 h-2 rounded-full" style={{ background: dim }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: dim }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: dim }} />
                  </>
                );
              }
              return (
                <>
                  <span
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: zone === 'short' ? '#eab308' : dim,
                      boxShadow: zone === 'short' ? '0 0 6px #eab30888' : undefined,
                    }}
                  />
                  <span
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: zone === 'good' ? '#22c55e' : dim,
                      boxShadow: zone === 'good' ? '0 0 6px #22c55e88' : undefined,
                    }}
                  />
                  <span
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: zone === 'warn' ? '#ef4444' : dim,
                      boxShadow: zone === 'warn' ? '0 0 6px #ef444488' : undefined,
                    }}
                  />
                </>
              );
            })()}
          </span>
          {T(labelKey)}
        </span>
      </div>
    </div>
  );
}

/** Pré-visualização estilo resultado Google (título azul, URL verde, snippet cinza). */
export function GoogleSerpPreview({
  slug,
  siteName,
  seoTitle,
  seoDescription,
  bio,
  cvHeadline,
  avatarUrl,
}: {
  slug: string;
  siteName: string;
  seoTitle: string;
  seoDescription: string;
  bio: string;
  cvHeadline: string;
  avatarUrl: string;
}) {
  const T = useT();
  const urlDisplay = slug.trim()
    ? `https://${slug.trim()}.trustbank.xyz`
    : 'https://seudominio.trustbank.xyz';

  const title =
    seoTitle.trim() ||
    (siteName.trim() ? `${siteName.trim()} | TrustBank` : slug.trim() ? `${slug.trim()} | TrustBank` : T('ed_seo_google_title_placeholder'));

  const rawDesc =
    seoDescription.trim() ||
    (cvHeadline.trim() ? `${cvHeadline.trim()} — ${bio.trim()}` : bio.trim()) ||
    (siteName.trim() ? `${siteName.trim()} — ${T('ed_seo_google_desc_fallback')}` : T('ed_seo_google_desc_placeholder'));

  const description = rawDesc.slice(0, 160);

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden text-left"
      style={{ background: '#f1f5f9' }}
    >
      <div className="px-3 py-2 border-b border-slate-200/80 bg-white/90 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <div className="flex-1 h-7 rounded-full bg-slate-100 border border-slate-200/80 flex items-center px-3 text-[11px] text-slate-400 truncate">
          trustbank.xyz
        </div>
      </div>
      <div className="p-3 sm:p-4 bg-white space-y-1">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-slate-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500">
                {(siteName || slug || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-slate-800 font-medium truncate leading-tight">{siteName || slug || 'TrustBank'}</p>
            <p className="text-[11px] text-emerald-800 truncate leading-tight" style={{ color: '#0d652d' }}>
              {urlDisplay}
            </p>
          </div>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="block text-lg sm:text-xl text-[#1a0dab] hover:underline leading-snug font-normal line-clamp-2"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {title}
        </a>
        <p
          className="text-sm text-slate-600 leading-relaxed line-clamp-3"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {description}
        </p>
        <p className="text-[10px] text-slate-400 pt-1 flex items-center gap-1">
          <Globe className="w-3 h-3" />
          {T('ed_seo_google_simulated')}
        </p>
      </div>
    </div>
  );
}
