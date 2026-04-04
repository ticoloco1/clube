'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Share2, X, Copy, Check, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

export interface TrustBankShareModalProps {
  slug: string;
  siteName: string;
  accentColor?: string;
  /** Avatar for modal hero + optional corner QR context */
  avatarUrl?: string | null;
  /** Dark profile strip under hero (contrast for the share button). */
  isDarkSurface?: boolean;
}

const SOCIALS: {
  id: string;
  labelKey: 'share_social_copy' | 'share_social_x' | 'share_social_fb' | 'share_social_wa' | 'share_social_li' | 'share_social_tg';
  color: string;
  svg: string;
}[] = [
  { id: 'copy', labelKey: 'share_social_copy', color: '#111827', svg: '' },
  {
    id: 'twitter',
    labelKey: 'share_social_x',
    color: '#000000',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  },
  {
    id: 'facebook',
    labelKey: 'share_social_fb',
    color: '#1877F2',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  },
  {
    id: 'whatsapp',
    labelKey: 'share_social_wa',
    color: '#25D366',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
  },
  {
    id: 'linkedin',
    labelKey: 'share_social_li',
    color: '#0A66C2',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  },
  {
    id: 'telegram',
    labelKey: 'share_social_tg',
    color: '#2CA5E0',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  },
];

export function TrustBankShareModal({
  slug,
  siteName,
  accentColor = '#6366f1',
  avatarUrl,
  isDarkSurface = true,
}: TrustBankShareModalProps) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState('');

  const url = `https://${slug}.trustbank.xyz`;

  useEffect(() => {
    setQrSrc(
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=8`,
    );
  }, [url]);

  const copy = () => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(T('toast_link_copied'));
  };

  const shareExternal = (platform: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(`${siteName} — TrustBank`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=520');
  };

  const nativeShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ title: siteName, text: T('share_native_text').replace('{name}', siteName), url }).catch(() => {
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-bold transition-all"
          style={
            isDarkSurface
              ? {
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.9)',
                }
              : {
                  background: 'rgba(0,0,0,0.04)',
                  borderColor: 'rgba(0,0,0,0.12)',
                  color: 'rgba(0,0,0,0.82)',
                }
          }
        >
          <Share2 className="h-4 w-4 opacity-90" />
          {T('share_open')}
        </button>

      {/* Canto inferior esquerdo: QR “ver no telemóvel” (evita sobrepor o assistente IA à direita) */}
      {qrSrc && (
        <div
          className="fixed bottom-4 left-4 z-[55] hidden sm:flex flex-col items-center gap-1 rounded-2xl bg-white p-2.5 shadow-xl ring-1 ring-black/5"
          style={{ maxWidth: 112 }}
        >
          <span className="text-[10px] font-bold text-neutral-500 text-center leading-tight px-1">
            {T('share_corner_mobile')}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="" width={88} height={88} className="rounded-lg" />
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tb-share-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-[400px] overflow-hidden rounded-[24px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
              <h2 id="tb-share-title" className="flex-1 text-center text-[15px] font-black text-neutral-900 pr-8">
                {T('share_modal_title')}
              </h2>
              <button
                type="button"
                aria-label={T('lively_close')}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Hero escuro + foto full-bleed com opacidade */}
            <div className="relative h-[168px] w-full overflow-hidden bg-[#1c1c1c]">
              {avatarUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${avatarUrl})`,
                    opacity: 0.38,
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0 opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}aa, #111)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-black/70" />
              <div className="relative flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white/90 bg-neutral-800 text-2xl font-black text-white shadow-lg"
                  style={{ boxShadow: `0 8px 32px ${accentColor}44` }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    siteName?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <p className="m-0 text-lg font-black tracking-tight text-white">@{slug}</p>
                <p className="m-0 flex items-center gap-1.5 text-xs font-semibold text-white/75">
                  <Link2 className="h-3.5 w-3.5 opacity-80" />
                  <span className="font-mono">{slug}.trustbank.xyz</span>
                </p>
              </div>
            </div>

            <div className="px-4 pb-5 pt-4">
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {SOCIALS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex min-w-[76px] flex-shrink-0 flex-col items-center gap-1.5"
                    onClick={() => {
                      if (s.id === 'copy') copy();
                      else shareExternal(s.id);
                    }}
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md ring-1 ring-black/5"
                      style={{
                        background: s.id === 'copy' ? '#f3f4f6' : s.color,
                        color: s.id === 'copy' ? '#111' : '#fff',
                      }}
                    >
                      {s.id === 'copy' ? (
                        copied ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center" dangerouslySetInnerHTML={{ __html: s.svg }} />
                      )}
                    </span>
                    <span className="max-w-[76px] text-center text-[10px] font-bold leading-tight text-neutral-500">
                      {T(s.labelKey)}
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-center text-[15px] font-black leading-snug text-neutral-900">
                {T('share_join_title').replace('{name}', siteName)}
              </p>
              <p className="mt-1.5 text-center text-[12px] leading-relaxed text-neutral-500">
                {T('share_join_sub')}
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <Link
                  href="/auth"
                  className="block w-full rounded-full bg-neutral-900 py-3.5 text-center text-[14px] font-black text-white transition hover:bg-black"
                  onClick={() => setOpen(false)}
                >
                  {T('share_cta_signup')}
                </Link>
                <Link
                  href="/planos"
                  className="block w-full rounded-full border-2 border-neutral-900 py-3 text-center text-[14px] font-black text-neutral-900 transition hover:bg-neutral-50"
                  onClick={() => setOpen(false)}
                >
                  {T('share_cta_learn')}
                </Link>
              </div>

              {qrSrc && (
                <div className="mt-6 flex flex-col items-center border-t border-neutral-100 pt-5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                    {T('share_qr_scan')}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSrc} alt="" width={140} height={140} className="rounded-xl ring-1 ring-neutral-200" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
