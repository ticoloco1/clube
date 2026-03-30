'use client';
import { useAuth } from '@/hooks/useAuth';
import { useMySite } from '@/hooks/useSite';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { slugPrice, extractYouTubeId } from '@/lib/utils';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import {
  Save, Eye, Upload, Plus, X, Loader2,
  Globe, Link2, Video, FileText, ChevronDown,
  Image as ImageIcon, Shield, GripVertical, ExternalLink
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { EarningsWidget } from '@/components/ui/EarningsWidget';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

// ── 30 Themes ─────────────────────────────────────────────────────────────────
const THEMES = [
  { id:'midnight',  label:'Midnight',   emoji:'🌑', bg:'#0d1117', text:'#e6edf3', accent:'#818cf8' },
  { id:'noir',      label:'Noir',       emoji:'⬛', bg:'#000000', text:'#ffffff', accent:'#ffffff' },
  { id:'neon',      label:'Neon',       emoji:'🌆', bg:'#0a0015', text:'#fce7f3', accent:'#c084fc' },
  { id:'gold',      label:'Gold',       emoji:'✨', bg:'#0c0900', text:'#fef3c7', accent:'#fde68a' },
  { id:'ocean',     label:'Ocean',      emoji:'🌊', bg:'#020c18', text:'#e0f2fe', accent:'#38bdf8' },
  { id:'rose',      label:'Rose',       emoji:'🌹', bg:'#1a0010', text:'#ffe4e6', accent:'#fb7185' },
  { id:'forest',    label:'Forest',     emoji:'🌿', bg:'#0a1a0a', text:'#dcfce7', accent:'#4ade80' },
  { id:'aurora',    label:'Aurora',     emoji:'🌌', bg:'#050218', text:'#e0e7ff', accent:'#818cf8' },
  { id:'steel',     label:'Steel',      emoji:'🔩', bg:'#1a1f2e', text:'#c8d3e0', accent:'#94a3b8' },
  { id:'matrix',    label:'Matrix',     emoji:'💻', bg:'#000800', text:'#00ff41', accent:'#00ff41' },
  { id:'nebula',    label:'Nebula',     emoji:'🔮', bg:'#0d0520', text:'#f3e8ff', accent:'#a855f7' },
  { id:'ember',     label:'Ember',      emoji:'🔥', bg:'#1c0800', text:'#ffedd5', accent:'#f97316' },
  { id:'arctic',    label:'Arctic',     emoji:'🧊', bg:'#0a1628', text:'#e0f2fe', accent:'#7dd3fc' },
  { id:'volcanic',  label:'Volcanic',   emoji:'🌋', bg:'#1a0505', text:'#fecaca', accent:'#ef4444' },
  { id:'hex',       label:'Hex',        emoji:'⬡',  bg:'#0f1923', text:'#e2e8f0', accent:'#06b6d4' },
  { id:'ivory',     label:'Ivory',      emoji:'🤍', bg:'#fafafa', text:'#18181b', accent:'#6366f1' },
  { id:'editorial', label:'Editorial',  emoji:'📰', bg:'#fffbf5', text:'#1c1917', accent:'#78716c' },
  { id:'sky',       label:'Sky',        emoji:'🩵', bg:'#f0f9ff', text:'#0c4a6e', accent:'#0ea5e9' },
  { id:'mint',      label:'Mint',       emoji:'🌱', bg:'#f0fdf4', text:'#14532d', accent:'#16a34a' },
  { id:'lavender',  label:'Lavender',   emoji:'💜', bg:'#faf5ff', text:'#4c1d95', accent:'#7c3aed' },
  { id:'peach',     label:'Peach',      emoji:'🍑', bg:'#fff7ed', text:'#7c2d12', accent:'#ea580c' },
  { id:'lemon',     label:'Lemon',      emoji:'🍋', bg:'#fefce8', text:'#713f12', accent:'#ca8a04' },
  { id:'blush',     label:'Blush',      emoji:'🌸', bg:'#fdf2f8', text:'#831843', accent:'#db2777' },
  { id:'paper',     label:'Paper',      emoji:'📜', bg:'#faf8f4', text:'#3d2b1f', accent:'#92400e' },
  { id:'geo',       label:'Geometric',  emoji:'📐', bg:'#f8fafc', text:'#1e293b', accent:'#6366f1' },
  { id:'cream',     label:'Cream',      emoji:'🧈', bg:'#fdf6e3', text:'#3b2f1e', accent:'#b45309' },
  { id:'cloud',     label:'Cloud',      emoji:'☁️', bg:'#f8f9ff', text:'#1e3a5f', accent:'#3b82f6' },
  { id:'sand',      label:'Sand',       emoji:'🏖️', bg:'#fdf4e7', text:'#44260a', accent:'#d97706' },
  { id:'nordic',    label:'Nordic',     emoji:'🇸🇪', bg:'#f5f5f0', text:'#2d2d2a', accent:'#4b7bb5' },
  { id:'sakura',    label:'Sakura',     emoji:'🌺', bg:'#fff1f5', text:'#4a1530', accent:'#e11d79' },
];

const BRAND_COLORS: Record<string,string> = {
  instagram:'#E1306C', youtube:'#FF0000', tiktok:'#000000', twitter:'#1DA1F2',
  linkedin:'#0A66C2', spotify:'#1DB954', github:'#24292e', whatsapp:'#25D366',
  facebook:'#1877F2', link:'#818cf8',
};

export default function EditorPage() {
  const { user, loading: authLoading } = useAuth();
  const { site, loading: siteLoading, save } = useMySite();
  const { add: addToCart, open: openCart } = useCart();
  const router = useRouter();
  const T = useT();

  // ── Profile state ────────────────────────────────────────────────────────
  const [siteName,     setSiteName]     = useState('');
  const [slug,         setSlug]         = useState('');
  const [bio,          setBio]          = useState('');
  const [avatarUrl,    setAvatarUrl]    = useState('');
  const [bannerUrl,    setBannerUrl]    = useState('');
  const [walletAddr,   setWalletAddr]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [published,    setPublished]    = useState(false);

  // ── Theme state ──────────────────────────────────────────────────────────
  const [theme,       setTheme]       = useState('midnight');
  const [accentColor, setAccentColor] = useState('#818cf8');
  const [photoShape,  setPhotoShape]  = useState('round');
  const [photoSize,   setPhotoSize]   = useState('md');
  const [fontStyle,   setFontStyle]   = useState('sans');
  const [textColor,   setTextColor]   = useState('');

  // ── Links state ──────────────────────────────────────────────────────────
  const [links,      setLinks]      = useState<any[]>([]);
  const [linkTitle,  setLinkTitle]  = useState('');
  const [linkUrl,    setLinkUrl]    = useState('');
  const [linkIcon,   setLinkIcon]   = useState('link');
  const [linkColor,  setLinkColor]  = useState('');
  const [dragOver,   setDragOver]   = useState<string|null>(null);

  // ── Videos state ────────────────────────────────────────────────────────
  const [videos,         setVideos]         = useState<any[]>([]);
  const [ytUrl,          setYtUrl]          = useState('');
  const [ytTitle,        setYtTitle]        = useState('');
  const [paywallEnabled, setPaywallEnabled] = useState(false);
  const [paywallPrice,   setPaywallPrice]   = useState('4.99');

  // ── CV state ────────────────────────────────────────────────────────────
  const [showCv,     setShowCv]     = useState(false);
  const [cvLocked,   setCvLocked]   = useState(false);
  const [cvPrice,    setCvPrice]    = useState('20');
  const [cvHeadline, setCvHeadline] = useState('');
  const [cvLocation, setCvLocation] = useState('');
  const [cvSkills,   setCvSkills]   = useState('');
  const [cvContent,  setCvContent]  = useState('');

  // ── Feed state ───────────────────────────────────────────────────────────
  const [showFeed,    setShowFeed]    = useState(true);
  const [feedCols,    setFeedCols]    = useState<1|2|3>(1);
  const [moduleOrder, setModuleOrder] = useState(['links','videos','cv','feed']);
  const [pageWidth, setPageWidth] = useState<number>(600);
  const [sitePages,   setSitePages]   = useState<{id:string;label:string}[]>([{id:'home',label:'Home'}]);
  const [pageContents, setPageContents] = useState<Record<string,string>>({});
  const [dragOverMod, setDragOverMod] = useState<string|null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState('profile');
  const [saving,          setSaving]          = useState(false);
  const [lastSaved,       setLastSaved]       = useState<Date|null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [ytVerifyUrl,     setYtVerifyUrl]     = useState('');
  const [verifying,       setVerifying]       = useState(false);
  const isDirty = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── Load site data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!site) return;
    setSiteName(site.site_name || '');
    setSlug(site.slug || '');
    setBio(site.bio || '');
    setAvatarUrl(site.avatar_url || '');
    setBannerUrl((site as any).banner_url || '');
    setWalletAddr((site as any).wallet_address || '');
    setContactEmail((site as any).contact_email || '');
    setPublished(site.published || false);
    setTheme(site.theme || 'midnight');
    setAccentColor(site.accent_color || '#818cf8');
    setPhotoShape(site.photo_shape || 'round');
    setPhotoSize((site as any).photo_size || 'md');
    setFontStyle((site as any).font_style || 'sans');
    setTextColor((site as any).text_color || '');
    setShowCv(site.show_cv || false);
    setCvLocked(site.cv_locked || false);
    setCvPrice(String(site.cv_price || 20));
    setCvHeadline(site.cv_headline || '');
    setCvLocation((site as any).cv_location || '');
    setCvSkills((site.cv_skills || []).join(', '));
    setCvContent(site.cv_content || '');
    setShowFeed((site as any).show_feed !== false);
    setFeedCols((site as any).feed_cols || 1);
    if ((site as any).module_order) {
      try { setModuleOrder(JSON.parse((site as any).module_order)); } catch {}
    }
    if ((site as any).site_pages) {
      try { setSitePages(JSON.parse((site as any).site_pages)); } catch {}
    }
    if ((site as any).page_width) setPageWidth((site as any).page_width);
    if ((site as any).page_contents) {
      try { setPageContents(JSON.parse((site as any).page_contents)); } catch {}
    }
  }, [site]);

  // ── Load links & videos ───────────────────────────────────────────────────
  useEffect(() => {
    if (!site?.id) return;
    supabase.from('mini_site_links').select('*').eq('site_id', site.id).order('sort_order').then(r => setLinks(r.data || []));
    supabase.from('mini_site_videos').select('*').eq('site_id', site.id).order('sort_order').then(r => setVideos(r.data || []));
  }, [site?.id]);

  // ── Auto-create site ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteLoading && !site && user) {
      const defaultSlug = (user.email?.split('@')[0] || 'user').replace(/[^a-z0-9]/gi, '').toLowerCase() + user.id.slice(0, 6);
      save({ site_name: 'My Site', slug: defaultSlug, bio: '', published: false } as any).catch(() => {});
    }
  }, [siteLoading, site, user]);

  // ── Autosave ──────────────────────────────────────────────────────────────
  const markDirty = useCallback(() => { isDirty.current = true; }, []);

  useEffect(() => {
    if (!site?.id || !isDirty.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { if (isDirty.current) handleSave(true); }, 2500);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [siteName, bio, theme, accentColor, photoShape, photoSize, fontStyle, textColor,
      showCv, cvLocked, cvPrice, cvHeadline, cvContent, cvLocation, cvSkills,
      showFeed, feedCols, moduleOrder, sitePages, walletAddr, contactEmail]);

  // ── Upload helper ─────────────────────────────────────────────────────────
  const uploadToStorage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('platform-assets').upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return supabase.storage.from('platform-assets').getPublicUrl(path).data.publicUrl;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (silent = false) => {
    if (!user || !site) return;
    setSaving(true);
    try {
      await save({
        site_name:     siteName,
        bio,
        avatar_url:    avatarUrl,
        banner_url:    bannerUrl,
        theme,
        accent_color:  accentColor,
        photo_shape:   photoShape,
        photo_size:    photoSize,
        font_style:    fontStyle,
        text_color:    textColor || null,
        show_cv:       showCv,
        cv_locked:     cvLocked,
        cv_price:      parseFloat(cvPrice) || 20,
        cv_headline:   cvHeadline,
        cv_content:    cvContent,
        cv_location:   cvLocation,
        cv_skills:     cvSkills.split(',').map(s => s.trim()).filter(Boolean),
        show_feed:     showFeed,
        feed_cols:     feedCols,
        module_order:  JSON.stringify(moduleOrder),
        site_pages:    JSON.stringify(sitePages),
        page_width: pageWidth,
        page_contents: JSON.stringify(pageContents),
        wallet_address: walletAddr,
        contact_email: contactEmail,
        published,
      } as any);

      // Handle slug change
      if (slug !== site.slug) {
        const price = slugPrice(slug);
        if (price > 0) {
          // Check if user already owns this slug
          const { data: owned } = await (supabase as any)
            .from('slug_registrations').select('id')
            .eq('user_id', user.id).eq('slug', slug).maybeSingle();
          if (owned) {
            await supabase.from('mini_sites').update({ slug }).eq('id', site.id).eq('user_id', user.id);
            if (!silent) toast.success(`✅ Slug ${slug}.trustbank.xyz aplicado!`);
          } else {
            addToCart({ id:`slug_${slug}`, label:`Slug: ${slug}.trustbank.xyz`, price, type:'slug' });
            if (!silent) { openCart(); toast.success(`Slug adicionado ao carrinho!`); }
          }
        } else {
          await supabase.from('mini_sites').update({ slug }).eq('id', site.id).eq('user_id', user.id);
          if (!silent) toast.success(`✅ ${slug}.trustbank.xyz`);
        }
      }

      isDirty.current = false;
      setLastSaved(new Date());
      if (!silent) toast.success('✅ Salvo!');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Links CRUD ────────────────────────────────────────────────────────────
  const addLink = async () => {
    if (!linkTitle || !linkUrl || !site?.id) return;
    const { data } = await supabase.from('mini_site_links').insert({
      site_id: site.id, title: linkTitle, url: linkUrl,
      icon: linkIcon, color: linkColor || null, sort_order: links.length
    }).select().single();
    if (data) setLinks(prev => [...prev, data]);
    setLinkTitle(''); setLinkUrl(''); setLinkColor('');
    toast.success('Link adicionado!');
  };

  const deleteLink = async (id: string) => {
    await supabase.from('mini_site_links').delete().eq('id', id);
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const reorderLinks = async (fromIdx: number, toIdx: number) => {
    const next = [...links];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    setLinks(next);
    await Promise.all(next.map((l, i) =>
      supabase.from('mini_site_links').update({ sort_order: i }).eq('id', l.id)
    ));
  };

  // ── Videos CRUD ───────────────────────────────────────────────────────────
  const addVideo = async () => {
    if (!ytUrl || !site?.id) return;
    if (!site.is_verified) {
      toast.error('Verifique seu canal YouTube (aba Verify) antes de publicar vídeos.');
      return;
    }
    const ytId = extractYouTubeId(ytUrl);
    if (!ytId) { toast.error('URL do YouTube inválida'); return; }
    await supabase.from('mini_site_videos').insert({
      site_id: site.id, youtube_video_id: ytId,
      title: ytTitle || 'Video', paywall_enabled: paywallEnabled,
      paywall_price: parseFloat(paywallPrice) || 4.99, sort_order: videos.length
    });
    supabase.from('mini_site_videos').select('*').eq('site_id', site.id).order('sort_order')
      .then(r => setVideos(r.data || []));
    setYtUrl(''); setYtTitle('');
    toast.success('Vídeo adicionado!');
  };

  const deleteVideo = async (id: string) => {
    await supabase.from('mini_site_videos').delete().eq('id', id);
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  // ── YouTube verify ─────────────────────────────────────────────────────────
  const verifyYouTube = async () => {
    if (!ytVerifyUrl || !site?.id) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/verify-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: ytVerifyUrl, siteSlug: site.slug, userId: user?.id }),
      });
      const data = await res.json();
      if (data.verified) {
        await supabase.from('mini_sites').update({ is_verified: true, youtube_channel_id: data.channelId }).eq('id', site.id);
        toast.success('✅ Canal verificado!');
      } else {
        toast.error('Backlink não encontrado no canal');
      }
    } catch { toast.error('Erro ao verificar'); }
    setVerifying(false);
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading || siteLoading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  );
  if (!user) { router.push('/auth'); return null; }

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const siteUrl = site?.slug ? `https://${site.slug}.trustbank.xyz` : null;
  const photoSizePx: Record<string,number> = { sm:72, md:96, lg:128, xl:160 };
  const avatarPx = photoSizePx[photoSize] || 96;

  const TABS = [
    { id:'profile', label:T('ed_profile'), icon:Globe },
    { id:'theme',   label:T('ed_theme'),   icon:ImageIcon },
    { id:'links',   label:T('ed_links'),   icon:Link2 },
    { id:'videos',  label:T('ed_videos'),  icon:Video },
    { id:'cv',      label:T('ed_cv'),      icon:FileText },
    { id:'feed',    label:'Feed',        icon:ChevronDown },
    { id:'pages',   label:'Páginas',     icon:FileText },
    { id:'verify',  label:'Verify',         icon:Shield },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* Top bar */}
      <div className="sticky top-16 z-40 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id ? 'bg-brand text-white' : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDirty.current
              ? <span className="text-xs text-amber-400 font-semibold">● Unsaved</span>
              : lastSaved && <span className="text-xs text-green-500">✓ {lastSaved.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>}
            <button onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border border-[var(--border)] hover:border-brand/50 transition-all">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {T('ed_save')}
            </button>
            {siteUrl && (
              <a href={`/s/${site?.slug}`} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border border-[var(--border)] hover:border-green-500/50 text-green-500 transition-all">
                <Eye className="w-3.5 h-3.5" /> {T('ed_preview')}
              </a>
            )}
            <button onClick={async () => {
              if (!user?.id) { toast.error('Faça login'); return; }
              const { data: sub } = await supabase.from('subscriptions' as any).select('expires_at').eq('user_id', user.id).maybeSingle();
              const active = sub?.expires_at && new Date(sub.expires_at) > new Date();
              if (!active) {
                toast.error('Assine um plano para ficar online e visível publicamente.');
                router.push('/planos');
                return;
              }
              setPublished(true); markDirty();
              await handleSave(true);
              await save({ published: true } as any);
              toast.success('🎉 Publicado!');
            }} className="px-4 py-1.5 rounded-xl text-sm font-black text-white"
              style={{ background: published ? '#22c55e' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              {published ? '✓ Live' : T('ed_publish')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main panel ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-black text-lg text-[var(--text)]">Profile</h2>

              {/* Avatar */}
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[var(--bg2)] border-2 border-[var(--border)]">
                    {avatarUrl
                      ? <img src={avatarUrl} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl font-black"
                          style={{ background: accentColor, color: '#fff' }}>{siteName?.[0] || '?'}</div>}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-brand flex items-center justify-center cursor-pointer shadow-lg hover:bg-brand/80 transition-all">
                    {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Upload className="w-3.5 h-3.5 text-white" />}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar}
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setUploadingAvatar(true);
                        try { const url = await uploadToStorage(f, 'avatars'); setAvatarUrl(url); markDirty(); }
                        catch { toast.error('Upload failed'); }
                        setUploadingAvatar(false);
                      }} />
                  </label>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="label block mb-1">Display Name</label>
                    <input value={siteName} onChange={e => { setSiteName(e.target.value); markDirty(); }}
                      className="input" placeholder="Your Name" />
                  </div>
                  <div>
                    <label className="label block mb-1">Banner (wide image)</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[var(--border)] cursor-pointer hover:border-brand/50 text-sm text-[var(--text2)] transition-all flex-1">
                        {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {bannerUrl ? 'Change banner' : 'Upload banner'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner}
                          onChange={async e => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setUploadingBanner(true);
                            try { const url = await uploadToStorage(f, 'banners'); setBannerUrl(url); markDirty(); }
                            catch { toast.error('Upload failed'); }
                            setUploadingBanner(false);
                          }} />
                      </label>
                      {bannerUrl && (
                        <button onClick={() => { setBannerUrl(''); markDirty(); }}
                          className="text-red-400 hover:opacity-70"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                    {bannerUrl && <img src={bannerUrl} className="w-full h-20 object-cover rounded-xl mt-2 border border-[var(--border)]" />}
                  </div>
                </div>
              </div>

              <div>
                <label className="label block mb-1">Bio</label>
                <textarea value={bio} onChange={e => { setBio(e.target.value); markDirty(); }}
                  className="input resize-none" rows={3} placeholder="A short description about you..." />
              </div>

              <div>
                <label className="label block mb-1">Username / Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text2)] flex-shrink-0"></span>
                  <input value={slug} onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')); markDirty(); }}
                    className="input flex-1 font-mono" placeholder="yourname" />
                </div>
                {slug && <p className="text-xs text-brand mt-1">✓ {slug}.trustbank.xyz</p>}
                {slug && slug !== site?.slug && slugPrice(slug) > 0 && (
                  <p className="text-xs text-amber-400 mt-1">⚡ Premium slug — ${slugPrice(slug)} USDC</p>
                )}
              </div>

              <div>
                <label className="label block mb-1">Polygon Wallet (for USDC payments)</label>
                <input value={walletAddr} onChange={e => { setWalletAddr(e.target.value); markDirty(); }}
                  className="input font-mono text-sm" placeholder="0x..." />
              </div>

              <div>
                <label className="label block mb-1">Contact Email</label>
                <input value={contactEmail} onChange={e => { setContactEmail(e.target.value); markDirty(); }}
                  className="input" type="email" placeholder="you@example.com" />
              </div>
            </div>
          )}

          {/* THEME */}
          {activeTab === 'theme' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-black text-lg text-[var(--text)]">Theme</h2>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => { setTheme(t.id); setAccentColor(t.accent); markDirty(); }}
                    className={`rounded-xl overflow-hidden transition-all hover:scale-[1.04] ${theme === t.id ? 'ring-2 ring-brand ring-offset-2 ring-offset-[var(--bg)]' : ''}`}>
                    <div style={{ background: t.bg, padding: '8px 8px 0' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:t.accent, marginBottom:4 }} />
                      <div style={{ height:2, background:t.text, opacity:0.7, borderRadius:2, marginBottom:3, width:'80%' }} />
                      <div style={{ height:8, background:t.accent, opacity:0.9, borderRadius:4 }} />
                    </div>
                    <div style={{ background:t.bg, borderTop:`1px solid ${t.text}15`, padding:'3px 6px 5px' }}>
                      <p style={{ fontSize:9, fontWeight:700, color:t.text, margin:0 }}>{t.emoji} {t.label}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label className="label block mb-2">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {['#818cf8','#f59e0b','#10b981','#ef4444','#06b6d4','#a855f7','#f43f5e','#0ea5e9','#84cc16','#fb923c','#ffffff','#000000'].map(c => (
                    <button key={c} onClick={() => { setAccentColor(c); markDirty(); }}
                      style={{ background:c, width:28, height:28, borderRadius:'50%',
                        border: accentColor===c ? '3px solid hsl(var(--primary))' : '2px solid hsl(var(--border))' }} />
                  ))}
                  <input type="color" value={accentColor} onChange={e => { setAccentColor(e.target.value); markDirty(); }}
                    style={{ width:28, height:28, borderRadius:'50%', border:'2px solid hsl(var(--border))', cursor:'pointer', padding:0 }} />
                </div>
              </div>

              <div>
                <label className="label block mb-2">Photo Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {[['sm','Small · 72px'],['md','Medium · 96px'],['lg','Large · 128px'],['xl','XL · 160px']].map(([v,l]) => (
                    <button key={v} onClick={() => { setPhotoSize(v); markDirty(); }}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${photoSize===v ? 'bg-brand text-white' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label block mb-2">Photo Shape</label>
                <div className="flex gap-2">
                  {[['round','● Round'],['square','■ Square'],['rounded','▢ Rounded']].map(([v,l]) => (
                    <button key={v} onClick={() => { setPhotoShape(v); markDirty(); }}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${photoShape===v ? 'bg-brand text-white' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label block mb-2">Font Style</label>
                <div className="flex gap-2">
                  {[['sans','Modern'],['serif','Elegant'],['mono','Code']].map(([v,l]) => (
                    <button key={v} onClick={() => { setFontStyle(v); markDirty(); }}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${fontStyle===v ? 'bg-brand text-white' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}
                      style={{ fontFamily: v==='serif'?'Georgia,serif':v==='mono'?'monospace':'system-ui' }}>{l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label block mb-2">Text Color Override <span className="text-[var(--text2)] text-xs font-normal">(optional)</span></label>
                <div className="flex flex-wrap gap-2 items-center">
                  {['','#ffffff','#000000','#e6edf3','#f3e8ff','#fef3c7','#dcfce7','#fce7f3','#e0f2fe'].map(col => (
                    <button key={col || 'auto'} onClick={() => { setTextColor(col); markDirty(); }}
                      title={col || 'Auto (theme)'}
                      style={{
                        width:28, height:28, borderRadius:'50%', cursor:'pointer',
                        background: col || 'linear-gradient(135deg,#818cf8,#f43f5e)',
                        border: textColor===col ? '3px solid hsl(var(--primary))' : '2px solid hsl(var(--border))',
                      }} />
                  ))}
                  <input type="color" value={textColor || '#ffffff'} onChange={e => { setTextColor(e.target.value); markDirty(); }}
                    style={{ width:28, height:28, borderRadius:'50%', border:'2px solid hsl(var(--border))', cursor:'pointer', padding:0 }} />
                  {textColor && <button onClick={() => { setTextColor(''); markDirty(); }} className="text-xs text-brand hover:underline">Reset</button>}
                </div>
                <p className="text-xs text-[var(--text2)] mt-1">Overrides theme text color on the mini site</p>
              </div>
            </div>
          )}

          {/* LINKS */}
          {activeTab === 'links' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-black text-lg text-[var(--text)]">Links & Social</h2>

              <div>
                <label className="label block mb-2">Social Network</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(BRAND_COLORS).map(([icon, color]) => (
                    <button key={icon} onClick={() => {
                      setLinkIcon(icon);
                      if (icon !== 'link') setLinkTitle(icon.charAt(0).toUpperCase() + icon.slice(1));
                    }}
                      className="py-2 rounded-xl text-xs font-bold border transition-all capitalize"
                      style={{
                        borderColor: linkIcon===icon ? color : 'hsl(var(--border))',
                        background: linkIcon===icon ? color+'18' : 'transparent',
                        color: linkIcon===icon ? color : 'hsl(var(--muted-foreground))',
                      }}>
                      {icon === 'twitter' ? 'X' : icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label block mb-1">Link Title</label>
                  <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} className="input" placeholder="Ex: My Instagram" />
                </div>
                <div>
                  <label className="label block mb-1">URL</label>
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="input" placeholder="https://..." />
                </div>
              </div>

              <div>
                <label className="label block mb-2">Button Color <span className="text-[var(--text2)] text-xs font-normal">(optional)</span></label>
                <div className="flex flex-wrap gap-2 items-center">
                  {['','#E1306C','#FF0000','#1DA1F2','#25D366','#f59e0b','#a855f7','#000000','#ffffff'].map(col => (
                    <button key={col||'auto'} onClick={() => setLinkColor(col)}
                      style={{
                        width:28, height:28, borderRadius:'50%', cursor:'pointer', flexShrink:0,
                        background: col || 'linear-gradient(135deg,#818cf8,#f43f5e)',
                        border: linkColor===col ? '3px solid hsl(var(--primary))' : '2px solid hsl(var(--border))',
                      }} />
                  ))}
                  <input type="color" value={linkColor || '#818cf8'} onChange={e => setLinkColor(e.target.value)}
                    style={{ width:28, height:28, borderRadius:'50%', border:'2px solid hsl(var(--border))', cursor:'pointer', padding:0 }} />
                </div>
              </div>

              <button onClick={addLink} disabled={!linkTitle || !linkUrl}
                className="btn-primary w-full justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Link
              </button>

              {links.length > 0 && (
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <p className="text-xs font-bold text-[var(--text2)] uppercase tracking-wide">Your Links — drag to reorder</p>
                  {links.map((link, idx) => (
                    <div key={link.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('text/plain', String(idx))}
                      onDragOver={e => { e.preventDefault(); setDragOver(link.id); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={e => { e.preventDefault(); reorderLinks(parseInt(e.dataTransfer.getData('text/plain')), idx); setDragOver(null); }}
                      className={`flex items-center gap-3 rounded-xl overflow-hidden border transition-all cursor-grab ${dragOver===link.id ? 'border-brand' : 'border-[var(--border)]'}`}
                      style={{ background: link.color ? link.color+'15' : 'hsl(var(--bg2))' }}>
                      <div style={{ width:40, height:40, background: BRAND_COLORS[link.icon] || '#818cf8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14, color:'#fff', fontWeight:900 }}>
                        {link.icon === 'instagram'?'📸':link.icon==='youtube'?'▶':link.icon==='tiktok'?'♪':link.icon==='twitter'?'✕':link.icon==='linkedin'?'in':link.icon==='spotify'?'♫':link.icon==='github'?'⌥':link.icon==='whatsapp'?'💬':link.icon==='facebook'?'f':'🔗'}
                      </div>
                      <div className="flex-1 min-w-0 py-2">
                        <p className="text-sm font-bold text-[var(--text)] truncate">{link.title}</p>
                        <p className="text-xs text-[var(--text2)] truncate">{link.url}</p>
                      </div>
                      {link.color && <div style={{ width:12, height:12, borderRadius:'50%', background:link.color, flexShrink:0 }} />}
                      <button onClick={() => deleteLink(link.id)} className="text-red-400 hover:opacity-70 pr-3 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIDEOS */}
          {activeTab === 'videos' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-black text-lg text-[var(--text)]">YouTube Videos</h2>
              <div className="space-y-3">
                <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} className="input" placeholder="https://youtube.com/watch?v=..." />
                <input value={ytTitle} onChange={e => setYtTitle(e.target.value)} className="input" placeholder="Video title (optional)" />
                <div className="flex items-center justify-between p-3 bg-[var(--bg2)] rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">Enable Paywall</p>
                    <p className="text-xs text-[var(--text2)]">Fans pay USDC to watch — you get 70%</p>
                  </div>
                  <button onClick={() => setPaywallEnabled(p => !p)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${paywallEnabled ? 'bg-brand' : 'bg-[var(--border)]'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${paywallEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {paywallEnabled && (
                  <div>
                    <label className="label block mb-1">Price (USDC)</label>
                    <input value={paywallPrice} onChange={e => setPaywallPrice(e.target.value)} className="input" type="number" step="0.01" min="0.5" />
                  </div>
                )}
                <button onClick={addVideo} disabled={!ytUrl} className="btn-primary w-full justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add Video
                </button>
              </div>
              {videos.length > 0 && (
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  {videos.map(v => (
                    <div key={v.id} className="flex items-center gap-3 p-3 bg-[var(--bg2)] rounded-xl">
                      <img src={`https://img.youtube.com/vi/${v.youtube_video_id}/default.jpg`} className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text)] truncate">{v.title}</p>
                        {v.paywall_enabled && <p className="text-xs text-amber-400">🔒 ${v.paywall_price} USDC</p>}
                      </div>
                      <button onClick={() => deleteVideo(v.id)} className="text-red-400 hover:opacity-70"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CV */}
          {activeTab === 'cv' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-black text-lg text-[var(--text)]">CV / Resume</h2>
              <div className="flex items-center justify-between p-3 bg-[var(--bg2)] rounded-xl">
                <div><p className="text-sm font-semibold text-[var(--text)]">Show CV on site</p></div>
                <button onClick={() => { setShowCv(p=>!p); markDirty(); }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${showCv ? 'bg-brand' : 'bg-[var(--border)]'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${showCv ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {showCv && (<>
                <div className="flex items-center justify-between p-3 bg-[var(--bg2)] rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">Lock behind payment</p>
                    <p className="text-xs text-[var(--text2)]">Companies pay to unlock — you get 50%</p>
                  </div>
                  <button onClick={() => { setCvLocked(p=>!p); markDirty(); }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${cvLocked ? 'bg-amber-500' : 'bg-[var(--border)]'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${cvLocked ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {cvLocked && <div>
                  <label className="label block mb-1">Unlock price (USDC)</label>
                  <input value={cvPrice} onChange={e => { setCvPrice(e.target.value); markDirty(); }} className="input" type="number" min="1" />
                </div>}
                <div><label className="label block mb-1">Headline</label>
                  <input value={cvHeadline} onChange={e => { setCvHeadline(e.target.value); markDirty(); }} className="input" placeholder="Senior Engineer at Acme" /></div>
                <div><label className="label block mb-1">Location</label>
                  <input value={cvLocation} onChange={e => { setCvLocation(e.target.value); markDirty(); }} className="input" placeholder="São Paulo, BR · Remote" /></div>
                <div><label className="label block mb-1">Skills (comma separated)</label>
                  <input value={cvSkills} onChange={e => { setCvSkills(e.target.value); markDirty(); }} className="input" placeholder="React, TypeScript, Design..." /></div>
                <div><label className="label block mb-1">Resume Content</label>
                  <textarea value={cvContent} onChange={e => { setCvContent(e.target.value); markDirty(); }} className="input resize-none" rows={8} placeholder="Work experience, education, achievements..." /></div>
              </>)}
            </div>
          )}

          {/* FEED */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-4">Feed Settings</h2>
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-sm font-bold text-[var(--text)]">Show Feed</p>
                    <p className="text-xs text-[var(--text2)]">Posts appear below bio on mini site</p></div>
                  <button onClick={() => { setShowFeed(p=>!p); markDirty(); }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${showFeed ? 'bg-brand' : 'bg-[var(--border)]'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${showFeed ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {showFeed && (
                  <div>
                    <label className="label block mb-2">Columns</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([1,2,3] as const).map(n => (
                        <button key={n} onClick={() => { setFeedCols(n); markDirty(); }}
                          className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${feedCols===n ? 'border-brand bg-brand/10 text-brand' : 'border-[var(--border)] text-[var(--text2)]'}`}>
                          {n===1?'▬ 1 column':n===2?'▬▬ 2 columns':'▬▬▬ 3 columns'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-1">Module Order</h2>
                <p className="text-xs text-[var(--text2)] mb-4">Drag to reorder</p>
                <div className="space-y-2">
                  {moduleOrder.map((mod, idx) => {
                    const labels: Record<string,string> = { links:'🔗 Links', videos:'🎬 Videos', cv:'📄 CV', feed:'📝 Feed' };
                    return (
                      <div key={mod} draggable
                        onDragStart={e => e.dataTransfer.setData('text/plain', String(idx))}
                        onDragOver={e => { e.preventDefault(); setDragOverMod(mod); }}
                        onDragLeave={() => setDragOverMod(null)}
                        onDrop={e => {
                          e.preventDefault();
                          const from = parseInt(e.dataTransfer.getData('text/plain'));
                          if (from === idx) return;
                          const next = [...moduleOrder];
                          const [item] = next.splice(from, 1);
                          next.splice(idx, 0, item);
                          setModuleOrder(next); setDragOverMod(null); markDirty();
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-grab transition-all ${dragOverMod===mod ? 'border-brand bg-brand/5' : 'border-[var(--border)] bg-[var(--bg2)]'}`}>
                        <GripVertical className="w-4 h-4 text-[var(--text2)]" />
                        <span className="text-sm font-bold text-[var(--text)]">{labels[mod]}</span>
                        <span className="text-xs text-[var(--text2)] ml-auto">#{idx+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}


          {/* PAGES TAB */}
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-1">Site Pages</h2>
                <p className="text-xs text-[var(--text2)] mb-4">Up to 3 pages with top menu (e.g. Home, Portfolio, Contact)</p>
                <div className="space-y-2 mb-3">
                  {sitePages.map((page, idx) => (
                    <div key={page.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand/10 flex items-center justify-center text-xs font-black text-brand">{idx+1}</div>
                      <input value={page.label}
                        onChange={e => { setSitePages(prev => prev.map(p => p.id===page.id ? {...p,label:e.target.value} : p)); markDirty(); }}
                        className="input flex-1 py-1.5 text-sm" placeholder={idx===0?'Home':`Page ${idx+1}`} />
                      {idx > 0 && <button onClick={() => { setSitePages(prev => prev.filter(p => p.id!==page.id)); markDirty(); }} className="text-red-400 hover:opacity-70"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
                {sitePages.length < 3 && (
                  <button onClick={() => { setSitePages(prev => [...prev, {id:`p_${Date.now()}`, label:`Page ${prev.length+1}`}]); markDirty(); }}
                    className="btn-secondary w-full justify-center text-sm"><Plus className="w-4 h-4" /> Add Page</button>
                )}
              </div>
              {/* Page content editors */}
              {sitePages.map((page) => (
                <div key={page.id} className="card p-5 mt-3">
                  <h3 className="font-black text-sm text-[var(--text)] mb-3">✏️ Conteúdo: {page.label}</h3>
                  {/* Width slider */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-[var(--text2)] font-bold whitespace-nowrap">Largura:</span>
                    <input type="range" min={320} max={1200} value={pageWidth}
                      onChange={e => { setPageWidth(Number(e.target.value)); markDirty(); }}
                      className="flex-1" style={{accentColor:'var(--accent)'}}/>
                    <span className="text-xs text-[var(--text2)] font-mono w-14">{pageWidth}px</span>
                  </div>
                  <RichTextEditor
                    value={pageContents[page.id] || ''}
                    onChange={v => { setPageContents(prev => ({...prev, [page.id]: v})); markDirty(); }}
                    placeholder={`Escreva o conteúdo da página "${page.label}"...`}
                    pageWidth={pageWidth}
                  />
                  <p className="text-xs text-[var(--text2)] mt-2">Este conteúdo aparece quando o visitante clica em "{page.label}" no mini site.</p>
                </div>
              ))}
            </div>
          )}

          {/* VERIFY */}
          {activeTab === 'verify' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-black text-lg text-[var(--text)]">Verify YouTube Channel</h2>
              <p className="text-sm text-[var(--text2)]">Add a link to <code className="text-brand">{siteUrl || 'your mini site URL'}</code> in your YouTube channel description, then verify here to get the ✓ badge.</p>
              <input value={ytVerifyUrl} onChange={e => setYtVerifyUrl(e.target.value)} className="input" placeholder="https://youtube.com/@yourchannel" />
              <button onClick={verifyYouTube} disabled={verifying || !ytVerifyUrl} className="btn-primary gap-2">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔍'} Verify Channel
              </button>
              {site && (site as any).is_verified && (
                <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                  <span>✓</span><span>Verified!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar: Live Preview ── */}
        <div>
          <div className="card p-4 sticky top-36">
            <p className="text-xs text-[var(--text2)] font-semibold uppercase tracking-wider mb-3">Live Preview</p>
            <div className="rounded-2xl overflow-hidden border border-[var(--border)]" style={{ background: currentTheme.bg }}>
              {/* Banner preview */}
              {bannerUrl && (
                <div style={{ width:'100%', height:80, overflow:'hidden', position:'relative' }}>
                  <img src={bannerUrl} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                  <div style={{ position:'absolute', inset:0, background:`linear-gradient(to bottom,transparent,${currentTheme.bg})` }} />
                </div>
              )}
              <div style={{ padding: bannerUrl ? '0 16px 16px' : '20px 16px 16px', textAlign:'center' }}>
                {/* Avatar */}
                <div style={{ display:'inline-block', marginBottom:10, marginTop: bannerUrl ? -Math.round(avatarPx/3) : 0 }}>
                  {avatarUrl
                    ? <img src={avatarUrl} style={{ width:avatarPx, height:avatarPx, borderRadius: photoShape==='round'?'50%':photoShape==='square'?8:Math.round(avatarPx*0.2), objectFit:'cover', border:`2px solid ${accentColor}`, display:'block' }} />
                    : <div style={{ width:avatarPx, height:avatarPx, borderRadius:'50%', background:accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:Math.round(avatarPx*0.4), fontWeight:900, color:'#fff' }}>{siteName?.[0] || '?'}</div>}
                </div>
                <p style={{ fontSize:15, fontWeight:900, color:textColor||currentTheme.text, margin:'0 0 3px',
                  fontFamily: fontStyle==='serif'?'Georgia,serif':fontStyle==='mono'?'monospace':'system-ui' }}>{siteName||'My Site'}</p>
                {bio && <p style={{ fontSize:11, color:textColor||currentTheme.text, opacity:0.6, margin:'0 0 10px' }}>{bio.slice(0,60)}{bio.length>60?'...':''}</p>}
                {/* Link preview */}
                {links.slice(0,3).map(link => (
                  <div key={link.id} style={{ width:'100%', padding:'7px 10px', borderRadius:10, marginBottom:5,
                    background: link.color ? link.color : `${accentColor}20`,
                    border:`1px solid ${link.color || accentColor}40`,
                    display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:22, height:22, background: BRAND_COLORS[link.icon]||accentColor, borderRadius:6, flexShrink:0 }} />
                    <span style={{ flex:1, textAlign:'center', fontSize:11, fontWeight:700, color: link.color ? '#fff' : currentTheme.text }}>{link.title}</span>
                  </div>
                ))}
                {links.length === 0 && (
                  <div style={{ width:'100%', padding:'7px 10px', borderRadius:10, background:`${accentColor}20`, border:`1px solid ${accentColor}40`, fontSize:11, fontWeight:700, color:currentTheme.text, textAlign:'left' }}>🔗 Sample Link</div>
                )}
              </div>
              {site?.slug && <p style={{ textAlign:'center', fontSize:9, color:currentTheme.text, opacity:0.35, padding:'0 0 8px', fontFamily:'monospace' }}>{site.slug}.trustbank.xyz</p>}
            </div>

            {user && <div className="mt-3"><EarningsWidget userId={user.id} accentColor={accentColor} compact /></div>}

            {siteUrl && (
              <a href={`/s/${site?.slug}`} target="_blank" rel="noopener" className="btn-secondary w-full justify-center mt-3 text-sm py-2 gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Open full site
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
