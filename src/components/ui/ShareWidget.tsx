'use client';
import { useState, useEffect } from 'react';
import { Share2, QrCode, X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

interface ShareWidgetProps {
  slug: string;
  siteName: string;
  accentColor?: string;
}

export function ShareWidget({ slug, siteName, accentColor = '#818cf8' }: ShareWidgetProps) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState('');

  const url = `https://${slug}.trustbank.xyz`;

  useEffect(() => {
    if (open) {
      // Use QR Server API (free, no key needed)
      setQrSrc(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=10`);
    }
  }, [open, url]);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(T('toast_link_copied'));
  };

  const share = (platform: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(`Check out ${siteName} on TrustBank`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: siteName, url }).catch(() => {});
    } else {
      setOpen(true);
    }
  };

  const SOCIALS = [
    { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>` },
    { id: 'twitter',  label: 'X / Twitter', color: '#1DA1F2', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>` },
    { id: 'telegram', label: 'Telegram',    color: '#2CA5E0', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>` },
    { id: 'facebook', label: 'Facebook',    color: '#1877F2', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>` },
    { id: 'linkedin', label: 'LinkedIn',    color: '#0A66C2', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>` },
  ];

  return (
    <>
      <button onClick={nativeShare}
        style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:999,
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
          color:'rgba(255,255,255,0.7)', fontWeight:600, fontSize:13, cursor:'pointer',
          backdropFilter:'blur(8px)', transition:'all .15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}>
        <Share2 style={{ width:14, height:14 }} />
        Compartilhar
      </button>

      {/* QR/Share modal */}
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setOpen(false)}>
          <div style={{ background:'#0d1117', border:`1px solid ${accentColor}30`, borderRadius:24, padding:28, maxWidth:360, width:'100%', position:'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
              <X style={{ width:16, height:16 }} />
            </button>

            <h3 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:'#e6edf3', textAlign:'center' }}>
              Compartilhar
            </h3>

            {/* QR Code */}
            <div style={{ textAlign:'center', marginBottom:20 }}>
              {qrSrc && (
                <div style={{ display:'inline-block', padding:12, background:'#fff', borderRadius:16 }}>
                  <img src={qrSrc} alt="QR Code" style={{ width:160, height:160, display:'block' }} />
                </div>
              )}
              <p style={{ margin:'8px 0 0', fontSize:12, color:'rgba(255,255,255,0.4)' }}>Escaneie para abrir</p>
            </div>

            {/* Copy link */}
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              <div style={{ flex:1, padding:'8px 12px', background:'rgba(255,255,255,0.06)', borderRadius:10, fontSize:12, color:'rgba(255,255,255,0.5)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {url}
              </div>
              <button onClick={copy} style={{ padding:'8px 14px', borderRadius:10, background: copied ? '#22c55e' : accentColor, border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, flexShrink:0, transition:'all .2s' }}>
                {copied ? <Check style={{ width:14, height:14 }} /> : <Copy style={{ width:14, height:14 }} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            {/* Social share buttons */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {SOCIALS.map(s => (
                <button key={s.id} onClick={() => share(s.id)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:12, background:`${s.color}15`, border:`1px solid ${s.color}25`, color:s.color, cursor:'pointer', fontWeight:700, fontSize:13, transition:'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.color}28`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.color}15`; }}>
                  <span style={{ width:18, height:18, flexShrink:0 }} dangerouslySetInnerHTML={{ __html: s.svg }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
