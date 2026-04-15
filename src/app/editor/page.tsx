'use client';
import { useAuth } from '@/hooks/useAuth';
import { useMySite } from '@/hooks/useSite';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cart';
import { extractYouTubeId } from '@/lib/utils';
import {
  slugRegistrationDueUsd,
  slugLengthTierUsd,
  slugLengthTierByLenOnly,
  isSlugReservedAdminOnly,
  SLUG_EXTRA_REGISTRATION_USD,
  normalizeSlugKey,
  isWorldFirstNameSlug,
} from '@/lib/slugPolicy';
import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useT, useI18n } from '@/lib/i18n';
import {
  Save, Eye, Upload, Plus, X, Loader2,
  Globe, Link2, Video, FileText, ChevronDown,
  Image as ImageIcon, Shield, GripVertical, ExternalLink, CreditCard,
  LayoutTemplate, Search, Wand2, Cpu, MessageCircle, Megaphone, Trash2, KeyRound,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { EarningsWidget } from '@/components/ui/EarningsWidget';
import { PageRichEditor } from '@/components/editor/PageRichEditor';
import { CVEditor, type CVData } from '@/components/editor/CVEditor';
import { SeoTrafficMeter, GoogleSerpPreview, buildDefaultSeoTitle } from '@/components/editor/SeoToolkit';
import { LIVELY_AVATAR_MODELS } from '@/lib/livelyAvatarModels';
import { IdentityLabPanel } from '@/components/editor/IdentityLabPanel';
import { CreatorStudioPanel } from '@/components/editor/CreatorStudioPanel';
import { AvatarCharacterInspirationPanel } from '@/components/editor/AvatarCharacterInspirationPanel';
import { ApiHubDrawer } from '@/components/editor/ApiHubDrawer';
import { readSiteAiBudget } from '@/lib/aiUsdBudget';
import { EditorScriptsAndAdsDialog } from '@/components/editor/EditorScriptsAndAdsDialog';
import type { IdentityStyleId, VoiceEffectId } from '@/lib/identityStylePresets';
import { DEFAULT_BOOKING_SERVICES, DEFAULT_WEEKLY_HOURS } from '@/lib/bookingSchedule';
import { normalizeLivelyTtsProvider, type LivelyTtsProvider } from '@/lib/livelyTtsPreference';
import { PLATFORM_USD } from '@/lib/platformPricing';
import { extractPageModulesLayout, isReservedPageModulesKey, type ProfilePhotoAlign } from '@/lib/pageModulesLayout';

const LS_EDITOR_IA_API = 'tb_editor_ia_api_enabled';

// ── Themes (rótulos: T(`ed_theme_${id}`)) ───────────────────────────────────
const THEMES = [
  { id:'midnight',  emoji:'🌑', bg:'#0d1117', text:'#e6edf3', accent:'#818cf8' },
  { id:'noir',      emoji:'⬛', bg:'#000000', text:'#ffffff', accent:'#ffffff' },
  { id:'neon',      emoji:'🌆', bg:'#0a0015', text:'#fce7f3', accent:'#c084fc' },
  { id:'gold',      emoji:'✨', bg:'#0c0900', text:'#fef3c7', accent:'#fde68a' },
  { id:'ocean',     emoji:'🌊', bg:'#020c18', text:'#e0f2fe', accent:'#38bdf8' },
  { id:'rose',      emoji:'🌹', bg:'#1a0010', text:'#ffe4e6', accent:'#fb7185' },
  { id:'forest',    emoji:'🌿', bg:'#0a1a0a', text:'#dcfce7', accent:'#4ade80' },
  { id:'aurora',    emoji:'🌌', bg:'#050218', text:'#e0e7ff', accent:'#818cf8' },
  { id:'steel',     emoji:'🔩', bg:'#1a1f2e', text:'#c8d3e0', accent:'#94a3b8' },
  { id:'matrix',    emoji:'💻', bg:'#000800', text:'#00ff41', accent:'#00ff41' },
  { id:'nebula',    emoji:'🔮', bg:'#0d0520', text:'#f3e8ff', accent:'#a855f7' },
  { id:'ember',     emoji:'🔥', bg:'#1c0800', text:'#ffedd5', accent:'#f97316' },
  { id:'arctic',    emoji:'🧊', bg:'#0a1628', text:'#e0f2fe', accent:'#7dd3fc' },
  { id:'volcanic',  emoji:'🌋', bg:'#1a0505', text:'#fecaca', accent:'#ef4444' },
  { id:'hex',       emoji:'⬡',  bg:'#0f1923', text:'#e2e8f0', accent:'#06b6d4' },
  { id:'ivory',     emoji:'🤍', bg:'#fafafa', text:'#18181b', accent:'#6366f1' },
  { id:'editorial', emoji:'📰', bg:'#fffbf5', text:'#1c1917', accent:'#78716c' },
  { id:'sky',       emoji:'🩵', bg:'#f0f9ff', text:'#0c4a6e', accent:'#0ea5e9' },
  { id:'mint',      emoji:'🌱', bg:'#f0fdf4', text:'#14532d', accent:'#16a34a' },
  { id:'lavender',  emoji:'💜', bg:'#faf5ff', text:'#4c1d95', accent:'#7c3aed' },
  { id:'peach',     emoji:'🍑', bg:'#fff7ed', text:'#7c2d12', accent:'#ea580c' },
  { id:'lemon',     emoji:'🍋', bg:'#fefce8', text:'#713f12', accent:'#ca8a04' },
  { id:'blush',     emoji:'🌸', bg:'#fdf2f8', text:'#831843', accent:'#db2777' },
  { id:'paper',     emoji:'📜', bg:'#faf8f4', text:'#3d2b1f', accent:'#92400e' },
  { id:'geo',       emoji:'📐', bg:'#f8fafc', text:'#1e293b', accent:'#6366f1' },
  { id:'cream',     emoji:'🧈', bg:'#fdf6e3', text:'#3b2f1e', accent:'#b45309' },
  { id:'cloud',     emoji:'☁️', bg:'#f8f9ff', text:'#1e3a5f', accent:'#3b82f6' },
  { id:'sand',      emoji:'🏖️', bg:'#fdf4e7', text:'#44260a', accent:'#d97706' },
  { id:'nordic',    emoji:'🇸🇪', bg:'#f5f5f0', text:'#2d2d2a', accent:'#4b7bb5' },
  { id:'sakura',    emoji:'🌺', bg:'#fff1f5', text:'#4a1530', accent:'#e11d79' },
  { id:'cyber_violet', emoji:'⚡', bg:'#0a0518', text:'#f5e6ff', accent:'#c084fc' },
  { id:'cyber_azure', emoji:'🧿', bg:'#030a14', text:'#e0f7ff', accent:'#22d3ee' },
  { id:'cyber_crimson', emoji:'🔻', bg:'#140205', text:'#ffe4ec', accent:'#fb7185' },
  { id:'azul', emoji:'🔷', bg:'#2563eb', text:'#ffffff', accent:'#fde047' },
  { id:'amarelo', emoji:'🟡', bg:'#facc15', text:'#422006', accent:'#1e3a8a' },
  { id:'dourado_luz', emoji:'✨', bg:'#f59e0b', text:'#422006', accent:'#7c2d12' },
  { id:'roxo', emoji:'🟣', bg:'#9333ea', text:'#faf5ff', accent:'#fde047' },
  { id:'vermelho', emoji:'🔴', bg:'#ef4444', text:'#fff7ed', accent:'#fef08a' },
  { id:'vinho', emoji:'🍷', bg:'#9f1239', text:'#ffe4e6', accent:'#fcd34d' },
  { id:'verde_nativo', emoji:'🌿', bg:'#16a34a', text:'#f0fdf4', accent:'#fef9c3' },
  { id:'lima', emoji:'💚', bg:'#bef264', text:'#1a2e05', accent:'#15803d' },
  { id:'prata', emoji:'🪙', bg:'#22d3ee', text:'#f0f9ff', accent:'#fef08a' },
  { id:'aco_escovado', emoji:'🔩', bg:'#0891b2', text:'#ecfeff', accent:'#fbbf24' },
  { id:'neon_mix', emoji:'🌈', bg:'#a855f7', text:'#ffffff', accent:'#fef08a' },
  { id:'lilas', emoji:'💜', bg:'#c4b5fd', text:'#3b0764', accent:'#6d28d9' },
  { id:'banana', emoji:'🍌', bg:'#fde047', text:'#422006', accent:'#c2410c' },
  { id:'abacate', emoji:'🥑', bg:'#65a30d', text:'#ecfccb', accent:'#fef08a' },
  { id:'maca', emoji:'🍎', bg:'#f43f5e', text:'#fff1f2', accent:'#fef08a' },
  { id:'royal_blue', emoji:'💎', bg:'#1e40af', text:'#eff6ff', accent:'#fbbf24' },
  { id:'mapa_tesouro', emoji:'🗺️', bg:'#d97706', text:'#292524', accent:'#fef3c7' },
  { id:'manchado', emoji:'☕', bg:'#fb923c', text:'#431407', accent:'#fef3c7' },
] as const;

const BRAND_COLORS: Record<string,string> = {
  instagram:'#E1306C', youtube:'#FF0000', tiktok:'#000000', twitter:'#1DA1F2',
  linkedin:'#0A66C2', spotify:'#1DB954', github:'#24292e', whatsapp:'#25D366',
  facebook:'#1877F2', link:'#818cf8',
};
const SOCIAL_URL_TEMPLATES: Record<string, string> = {
  instagram: 'https://instagram.com/',
  youtube: 'https://youtube.com/',
  tiktok: 'https://tiktok.com/',
  twitter: 'https://x.com/',
  linkedin: 'https://linkedin.com/in/',
  spotify: 'https://open.spotify.com/',
  github: 'https://github.com/',
  whatsapp: 'https://wa.me/',
  facebook: 'https://facebook.com/',
  link: 'https://',
};

function EditorPageInner() {
  const AI_DISABLED_TEMP = true;
  const searchParams = useSearchParams();
  const editorSiteId = searchParams.get('site');
  const editorPreferNew = searchParams.get('new') === '1';
  const { user, loading: authLoading } = useAuth();
  const { site, loading: siteLoading, save, reload } = useMySite({
    siteId: editorSiteId,
    preferNew: editorPreferNew,
  });
  const { add: addToCart, open: openCart } = useCart();
  const router = useRouter();
  const T = useT();
  const { lang } = useI18n();
  const iaBudget = useMemo(() => readSiteAiBudget(site ?? undefined), [site]);
  const modLab = useMemo(
    () => ({
      pages: T('ed_mod_pages'),
      links: T('ed_mod_links'),
      videos: T('ed_mod_videos'),
      cv: T('ed_mod_cv'),
      feed: T('ed_mod_feed'),
      ads: T('ed_mod_ads'),
      mystic: T('ed_mod_mystic'),
      slug_market: T('ed_mod_slug_market'),
      classified: T('ed_mod_classified'),
      booking: T('ed_mod_booking'),
    }),
    [T, lang],
  );

  // ── Profile state ────────────────────────────────────────────────────────
  const [siteName,     setSiteName]     = useState('');
  const [slug,         setSlug]         = useState('');
  const [bio,          setBio]          = useState('');
  const [avatarUrl,    setAvatarUrl]    = useState('');
  const [bannerUrl,    setBannerUrl]    = useState('');
  const [bannerFocusX, setBannerFocusX] = useState(50);
  const [bannerFocusY, setBannerFocusY] = useState(50);
  const [bannerZoom, setBannerZoom] = useState(100);
  const [bannerFit, setBannerFit] = useState<'cover'|'contain'>('cover');
  const [bannerPlaceholderEnabled, setBannerPlaceholderEnabled] = useState(true);
  const [bannerPlaceholderColor, setBannerPlaceholderColor] = useState('#1f2937');
  const [walletAddr,   setWalletAddr]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  /** Número WhatsApp público (guardado em mini_sites.contact_phone) — link wa.me para visitantes. */
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [published,    setPublished]    = useState(false);
  const [seoTitle,     setSeoTitle]     = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoOgImage,   setSeoOgImage]   = useState('');
  const [seoSearchTags, setSeoSearchTags] = useState<string[]>([]);
  const [seoJsonLd, setSeoJsonLd] = useState('');
  const [seoTagDraft, setSeoTagDraft] = useState('');
  const [magicDescLoading, setMagicDescLoading] = useState(false);
  const [suggestTagsLoading, setSuggestTagsLoading] = useState(false);
  const [seoPackLoading, setSeoPackLoading] = useState(false);
  const [livelyAvatarEnabled, setLivelyAvatarEnabled] = useState(false);
  const [livelyAvatarModel, setLivelyAvatarModel] = useState('neo');
  const [livelyAvatarWelcome, setLivelyAvatarWelcome] = useState('');
  const [livelyNftVerifyLoading, setLivelyNftVerifyLoading] = useState(false);
  const [livelyCentralMagic, setLivelyCentralMagic] = useState(false);
  const [livelyFloatingExpressive, setLivelyFloatingExpressive] = useState(false);
  const [livelyDualAgent, setLivelyDualAgent] = useState(false);
  const [livelyAgentInstructions, setLivelyAgentInstructions] = useState('');
  const [livelyElevenOwner, setLivelyElevenOwner] = useState('');
  const [livelyElevenAgent, setLivelyElevenAgent] = useState('');
  const [livelyTtsProvider, setLivelyTtsProvider] = useState<LivelyTtsProvider>('auto');
  const [livelyUseDeepseekByok, setLivelyUseDeepseekByok] = useState(false);
  const [livelyPremiumVerifyLoading, setLivelyPremiumVerifyLoading] = useState(false);
  const [livelySuggestWelcomeBusy, setLivelySuggestWelcomeBusy] = useState(false);
  const [byokDeepseekConfigured, setByokDeepseekConfigured] = useState<boolean | null>(null);
  const [byokDeepseekSaving, setByokDeepseekSaving] = useState(false);
  const [byokDeepseekKeyDraft, setByokDeepseekKeyDraft] = useState('');
  const [scriptsAdsDialogOpen, setScriptsAdsDialogOpen] = useState(false);
  const [livelyProfileAsAvatar, setLivelyProfileAsAvatar] = useState(false);
  const [livelyProfileSpeakOnEntry, setLivelyProfileSpeakOnEntry] = useState(true);
  const [livelyProfileSpeechTap, setLivelyProfileSpeechTap] = useState('');
  const [livelyProfileSpeechBeforeReply, setLivelyProfileSpeechBeforeReply] = useState('');
  const [identityPortraitUrl, setIdentityPortraitUrl] = useState('');
  const [identityStylePreset, setIdentityStylePreset] = useState<IdentityStyleId>('buccaneer');
  const [identityVoiceEffect, setIdentityVoiceEffect] = useState<VoiceEffectId>('neutral');
  const [magicPortraitEnabled, setMagicPortraitEnabled] = useState(false);

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
  const [videoPreviewImageUrl, setVideoPreviewImageUrl] = useState('');
  const [videoPreviewEmbedUrl, setVideoPreviewEmbedUrl] = useState('');
  const [uploadingVideoCover, setUploadingVideoCover] = useState(false);
  const [paywallEnabled, setPaywallEnabled] = useState(false);
  const [paywallPrice,   setPaywallPrice]   = useState(String(PLATFORM_USD.videoPaywallDefault));

  // ── CV state ────────────────────────────────────────────────────────────
  const [showCv,     setShowCv]     = useState(false);
  const [cvLocked,   setCvLocked]   = useState(false);
  const [cvContactLocked, setCvContactLocked] = useState(false);
  const [cvPrice,    setCvPrice]    = useState(String(PLATFORM_USD.cvUnlockDefault));
  const [cvHeadline, setCvHeadline] = useState('');
  const [cvLocation, setCvLocation] = useState('');
  const [cvSkills,   setCvSkills]   = useState('');
  const [cvContent,  setCvContent]  = useState('');

  // ── Feed state ───────────────────────────────────────────────────────────
  const [showFeed,    setShowFeed]    = useState(true);
  const [feedCols,    setFeedCols]    = useState<1|2|3>(1);
  const [profilePhotoAlign, setProfilePhotoAlign] = useState<ProfilePhotoAlign>('center');
  const [moduleOrder, setModuleOrder] = useState<string[]>(['links', 'feed']);
  const [pageWidth, setPageWidth] = useState<number>(600);
  const [sitePages,   setSitePages]   = useState<{id:string;label:string;template?:'default'|'videos_3'|'videos_4'}[]>([{id:'home',label:'Home',template:'default'}]);
  const [pageContents, setPageContents] = useState<Record<string,string>>({});
  const [pageModules, setPageModules] = useState<Record<string, string[]>>({ home: ['links', 'feed'] });
  const [pagesEditorSelectedId, setPagesEditorSelectedId] = useState<string>('home');
  const [pageColumns, setPageColumns] = useState<Record<string, 1|2|3>>({ home: 1 });
  const [moduleColumns, setModuleColumns] = useState<Record<string, Record<string, 1|2|3>>>({
    home: { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 },
  });
  const [clearAllArmed, setClearAllArmed] = useState<Record<string, boolean>>({});
  const [adAskingPrice, setAdAskingPrice] = useState('');
  const [adShowPricePublic, setAdShowPricePublic] = useState(true);
  const [directoryProfileSlug, setDirectoryProfileSlug] = useState('');
  const [siteCategorySlug, setSiteCategorySlug] = useState('');
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [dragOverMod, setDragOverMod] = useState<string|null>(null);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [tickerItems, setTickerItems] = useState<{ label: string; url: string }[]>([]);
  const [cvExperience, setCvExperience] = useState<any[]>([]);
  const [cvEducation, setCvEducation] = useState<any[]>([]);
  const [cvProjects, setCvProjects] = useState<any[]>([]);
  const [cvLanguages, setCvLanguages] = useState<any[]>([]);
  const [cvCertificates, setCvCertificates] = useState<any[]>([]);
  const [cvContactWhatsapp, setCvContactWhatsapp] = useState('');
  const [cvHirePrice, setCvHirePrice] = useState(0);
  const [cvHireCurrency, setCvHireCurrency] = useState('USD');
  const [cvHireType, setCvHireType] = useState('hour');
  const [cvFree, setCvFree] = useState(false);
  const [mysticPublicEnabled, setMysticPublicEnabled] = useState(false);
  const [mysticTarotPrice, setMysticTarotPrice] = useState(String(PLATFORM_USD.mysticTarotDefault));
  const [mysticLotteryPrice, setMysticLotteryPrice] = useState(String(PLATFORM_USD.mysticLotteryPremiumDefault));
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingSlotMinutes, setBookingSlotMinutes] = useState('30');
  const [bookingTimezone, setBookingTimezone] = useState('America/Sao_Paulo');
  const [bookingWeeklyJson, setBookingWeeklyJson] = useState(() => JSON.stringify(DEFAULT_WEEKLY_HOURS, null, 2));
  const [bookingServicesJson, setBookingServicesJson] = useState(
    () => JSON.stringify([{ label: 'Consultation', minutes: 30 }], null, 2),
  );
  const [bookingVertical, setBookingVertical] = useState<'general' | 'medical' | 'legal' | 'business'>('general');
  const [sectionOrder, setSectionOrder] = useState<string[]>(['summary','experience','education','skills','projects','languages','certificates','contact']);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState('profile');
  const [livePreviewTab, setLivePreviewTab]   = useState<'minisite' | 'google'>('minisite');
  const [saving,          setSaving]          = useState(false);
  const [lastSaved,       setLastSaved]       = useState<Date|null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [ytVerifyUrl,     setYtVerifyUrl]     = useState('');
  const [verifying,       setVerifying]       = useState(false);
  const isDirty = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const [trialHours, setTrialHours] = useState(24);
  const [graceDays, setGraceDays] = useState(30);
  const ADMIN_BYPASS_EMAIL = 'arytcf@gmail.com';
  const [isAdminBypass, setIsAdminBypass] = useState(false);
  const [userSlugRegCount, setUserSlugRegCount] = useState(0);
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteSlug, setNewSiteSlug] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [createSlugTaken, setCreateSlugTaken] = useState(false);
  const [createSlugOwnedByUser, setCreateSlugOwnedByUser] = useState(false);
  const [createSlugHasMiniMine, setCreateSlugHasMiniMine] = useState(false);
  const [createSlugChecking, setCreateSlugChecking] = useState(false);
  const [showSchemaHint, setShowSchemaHint] = useState(false);
  const [stripeOnboarding, setStripeOnboarding] = useState(false);
  /** Evita repor slug/campos a cada refresh do objeto `site` (load após save) */
  const editorHydratedForSiteId = useRef<string | null>(null);
  const stripeReturnHandled = useRef(false);

  /** IA desligada por defeito; só liga com opt-in explícito (localStorage = "1"). */
  const [editorIaApiEnabled, setEditorIaApiEnabled] = useState(false);
  useEffect(() => {
    try {
      setEditorIaApiEnabled(localStorage.getItem(LS_EDITOR_IA_API) === '1');
    } catch {
      /* ignore */
    }
  }, []);
  const setEditorIaApiEnabledPersist = useCallback((on: boolean) => {
    setEditorIaApiEnabled(on);
    try {
      localStorage.setItem(LS_EDITOR_IA_API, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const ensureEditorIaOrToast = useCallback(() => {
    if (editorIaApiEnabled) return true;
    toast.message(T('ed_ia_master_off_hint'));
    return false;
  }, [editorIaApiEnabled, T]);

  /** Ordem livre: só remove duplicados. Inclui vídeos, místico e agenda para aparecerem no mini-site. */
  const normalizeModuleList = useCallback((mods: string[]) => {
    const allowed = new Set([
      'pages',
      'links',
      'videos',
      'cv',
      'feed',
      'ads',
      'mystic',
      'slug_market',
      'classified',
      'booking',
    ]);
    return Array.from(new Set(mods.filter((m) => allowed.has(m))));
  }, []);

  useEffect(() => {
    if (site) {
      setCreateSlugTaken(false);
      setCreateSlugOwnedByUser(false);
      setCreateSlugHasMiniMine(false);
      setCreateSlugChecking(false);
      return;
    }
    if (!user?.id) {
      setCreateSlugTaken(false);
      setCreateSlugOwnedByUser(false);
      setCreateSlugHasMiniMine(false);
      setCreateSlugChecking(false);
      return;
    }
    /** Mesmo valor que ao gravar: a-z, 0-9 e hífen (o preço usa letras+números sem hífen). */
    const clean = newSiteSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const key = normalizeSlugKey(clean);
    if (key.length < 2) {
      setCreateSlugTaken(false);
      setCreateSlugOwnedByUser(false);
      setCreateSlugHasMiniMine(false);
      setCreateSlugChecking(false);
      return;
    }
    setCreateSlugChecking(true);
    const tid = setTimeout(async () => {
      try {
        const { data: ms } = await supabase.from('mini_sites').select('id,user_id').eq('slug', clean).maybeSingle();
        if (ms) {
          const mine = (ms as { user_id?: string }).user_id === user.id;
          setCreateSlugHasMiniMine(mine);
          setCreateSlugTaken(true);
          setCreateSlugOwnedByUser(false);
          return;
        }
        setCreateSlugHasMiniMine(false);
        const { data: reg } = await (supabase as any)
          .from('slug_registrations')
          .select('id,user_id')
          .eq('slug', clean)
          .maybeSingle();
        if (!reg) {
          setCreateSlugTaken(false);
          setCreateSlugOwnedByUser(false);
          return;
        }
        const owner = (reg as { user_id?: string }).user_id === user.id;
        setCreateSlugOwnedByUser(owner);
        setCreateSlugTaken(!owner);
      } catch {
        setCreateSlugTaken(false);
        setCreateSlugOwnedByUser(false);
        setCreateSlugHasMiniMine(false);
      } finally {
        setCreateSlugChecking(false);
      }
    }, 400);
    return () => clearTimeout(tid);
  }, [site, newSiteSlug, user?.id]);

  const trialGraceEndsAt = (site as any)?.trial_grace_until ? new Date((site as any).trial_grace_until) : null;
  const inGraceWindow = !published && !isAdminBypass && !!trialGraceEndsAt && trialGraceEndsAt > new Date();
  const graceDaysLeft = inGraceWindow
    ? Math.max(0, Math.ceil((trialGraceEndsAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  useEffect(() => {
    if (stripeReturnHandled.current || typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const stripe = sp.get('stripe');
    if (!stripe) return;
    stripeReturnHandled.current = true;
    void reload().then(() => {
      if (stripe === 'done') toast.success(T('ed_stripe_return_done'));
      else if (stripe === 'refresh') toast.message(T('ed_stripe_return_refresh'));
      router.replace('/editor');
    });
  }, [reload, router, T]);

  const stripePayoutsReady = !!(site as any)?.stripe_connect_account_id && (site as any)?.stripe_connect_charges_enabled;
  const mysticTarotNum = parseFloat(String(mysticTarotPrice).replace(',', '.')) || 0;
  const mysticLotteryNum = parseFloat(String(mysticLotteryPrice).replace(',', '.')) || 0;
  const monetizationNeedsStripe =
    (paywallEnabled && parseFloat(String(paywallPrice).replace(',', '.')) > 0)
    || (cvLocked && !cvFree && parseFloat(String(cvPrice).replace(',', '.')) > 0)
    || (cvContactLocked && !cvFree && parseFloat(String(cvPrice).replace(',', '.')) > 0)
    || (mysticPublicEnabled && (mysticTarotNum >= 0.5 || mysticLotteryNum >= 0.5));

  // ── Load site data (uma vez por mini-site; não sobrescreve enquanto editas o mesmo id) ──
  useEffect(() => {
    if (!site) return;
    if (editorHydratedForSiteId.current === site.id) return;
    editorHydratedForSiteId.current = site.id;
    setSiteName(site.site_name || '');
    setSlug(site.slug || '');
    setBio(site.bio || '');
    setAvatarUrl(site.avatar_url || '');
    setBannerUrl((site as any).banner_url || '');
    setBannerFocusX((site as any).banner_focus_x ?? 50);
    setBannerFocusY((site as any).banner_focus_y ?? 50);
    setBannerZoom(Math.max(50, Math.min(150, Number((site as any).banner_zoom ?? 100))));
    setBannerFit(((site as any).banner_fit === 'contain' ? 'contain' : 'cover'));
    setBannerPlaceholderEnabled((site as any).banner_placeholder_enabled !== false);
    setBannerPlaceholderColor((site as any).banner_placeholder_color || '#1f2937');
    setWalletAddr((site as any).wallet_address || '');
    setContactEmail((site as any).contact_email || '');
    setContactWhatsapp(typeof (site as any).contact_phone === 'string' ? (site as any).contact_phone : '');
    setPublished(site.published || false);
    setTickerEnabled((site as any).ticker_enabled !== false);
    try {
      const ti = (site as any).ticker_items;
      if (Array.isArray(ti)) setTickerItems(ti.filter((x: any) => x?.label && x?.url));
      else if (typeof ti === 'string') {
        const parsed = JSON.parse(ti);
        if (Array.isArray(parsed)) setTickerItems(parsed.filter((x: any) => x?.label && x?.url));
      }
    } catch {}
    if (!((site as any).ticker_items?.length)) {
      setTickerItems([
        { label: 'Open my links', url: `https://${site.slug}.trustbank.xyz` },
        { label: 'Sponsorships', url: 'https://trustbank.xyz/marketplace/ads' },
      ]);
    }
    const savedSeoTitle = (site as any).seo_title;
    setSeoTitle(
      typeof savedSeoTitle === 'string' && savedSeoTitle.trim() !== ''
        ? savedSeoTitle
        : buildDefaultSeoTitle(site.slug || '', site.site_name || ''),
    );
    setSeoDescription((site as any).seo_description || '');
    setSeoOgImage((site as any).seo_og_image || '');
    const rawTags = (site as any).seo_search_tags;
    if (Array.isArray(rawTags)) setSeoSearchTags(rawTags.map(String).filter(Boolean));
    else setSeoSearchTags([]);
    setSeoJsonLd(typeof (site as any).seo_json_ld === 'string' ? (site as any).seo_json_ld : '');
    setLivelyAvatarEnabled((site as any).lively_avatar_enabled === true);
    setLivelyAvatarModel((site as any).lively_avatar_model || 'neo');
    setLivelyAvatarWelcome(typeof (site as any).lively_avatar_welcome === 'string' ? (site as any).lively_avatar_welcome : '');
    setLivelyCentralMagic((site as any).lively_central_magic === true);
    setLivelyFloatingExpressive((site as any).lively_floating_expressive === true);
    setLivelyDualAgent((site as any).lively_dual_agent === true);
    setLivelyAgentInstructions(typeof (site as any).lively_agent_instructions === 'string' ? (site as any).lively_agent_instructions : '');
    setLivelyElevenOwner(typeof (site as any).lively_elevenlabs_voice_owner === 'string' ? (site as any).lively_elevenlabs_voice_owner : '');
    setLivelyElevenAgent(typeof (site as any).lively_elevenlabs_voice_agent === 'string' ? (site as any).lively_elevenlabs_voice_agent : '');
    setLivelyTtsProvider(normalizeLivelyTtsProvider((site as any).lively_tts_provider));
    setLivelyUseDeepseekByok((site as any).lively_use_deepseek_byok === true);
    setLivelyProfileAsAvatar((site as any).lively_profile_as_avatar === true);
    setLivelyProfileSpeakOnEntry((site as any).lively_profile_speak_on_entry !== false);
    setLivelyProfileSpeechTap(typeof (site as any).lively_profile_speech_tap === 'string' ? (site as any).lively_profile_speech_tap : '');
    setLivelyProfileSpeechBeforeReply(
      typeof (site as any).lively_profile_speech_before_reply === 'string' ? (site as any).lively_profile_speech_before_reply : '',
    );
    setIdentityPortraitUrl(typeof (site as any).identity_portrait_url === 'string' ? (site as any).identity_portrait_url : '');
    const isp = (site as any).identity_style_preset;
    setIdentityStylePreset(
      isp === 'buccaneer' || isp === 'glitch' || isp === 'manga_hero' || isp === 'galactic_knight' ? isp : 'buccaneer',
    );
    const ive = (site as any).identity_voice_effect;
    setIdentityVoiceEffect(
      ive === 'neutral' || ive === 'buccaneer' || ive === 'glitch' || ive === 'manga_hero' || ive === 'galactic_knight'
        ? ive
        : 'neutral',
    );
    setMagicPortraitEnabled((site as any).magic_portrait_enabled === true);
    setTheme(site.theme || 'midnight');
    setAccentColor(site.accent_color || '#818cf8');
    setPhotoShape(site.photo_shape || 'round');
    setPhotoSize((site as any).photo_size === 'site' ? 'xl' : (site as any).photo_size || 'md');
    setFontStyle((site as any).font_style || 'sans');
    setTextColor((site as any).text_color || '');
    setShowCv(site.show_cv || false);
    setCvLocked(site.cv_locked || false);
    setCvContactLocked((site as any).cv_contact_locked === true);
    setCvPrice(String(site.cv_price ?? PLATFORM_USD.cvUnlockDefault));
    setCvHeadline(site.cv_headline || '');
    setCvLocation((site as any).cv_location || '');
    setCvSkills((site.cv_skills || []).join(', '));
    setCvContent(site.cv_content || '');
    setCvExperience((site as any).cv_experience || []);
    setCvEducation((site as any).cv_education || []);
    setCvProjects((site as any).cv_projects || []);
    setCvLanguages((site as any).cv_languages || []);
    setCvCertificates((site as any).cv_certificates || []);
    setCvContactWhatsapp((site as any).cv_contact_whatsapp || '');
    setCvHirePrice(Number((site as any).cv_hire_price || 0));
    setCvHireCurrency((site as any).cv_hire_currency || 'USD');
    setCvHireType((site as any).cv_hire_type || 'hour');
    setCvFree(Boolean((site as any).cv_free));
    setMysticPublicEnabled((site as any).mystic_public_enabled === true);
    setMysticTarotPrice(
      (site as any).mystic_tarot_price_usd != null && String((site as any).mystic_tarot_price_usd) !== ''
        ? String((site as any).mystic_tarot_price_usd)
        : String(PLATFORM_USD.mysticTarotDefault),
    );
    setMysticLotteryPrice(
      (site as any).mystic_lottery_premium_price_usd != null && String((site as any).mystic_lottery_premium_price_usd) !== ''
        ? String((site as any).mystic_lottery_premium_price_usd)
        : String(PLATFORM_USD.mysticLotteryPremiumDefault),
    );
    setBookingEnabled((site as any).booking_enabled === true);
    setBookingSlotMinutes(String((site as any).booking_slot_minutes ?? 30));
    setBookingTimezone(typeof (site as any).booking_timezone === 'string' && (site as any).booking_timezone ? (site as any).booking_timezone : 'America/Sao_Paulo');
    try {
      const rawWh = (site as any).booking_weekly_hours;
      if (rawWh != null) {
        const obj = typeof rawWh === 'string' ? JSON.parse(rawWh) : rawWh;
        setBookingWeeklyJson(JSON.stringify(obj && typeof obj === 'object' ? obj : DEFAULT_WEEKLY_HOURS, null, 2));
      } else {
        setBookingWeeklyJson(JSON.stringify(DEFAULT_WEEKLY_HOURS, null, 2));
      }
    } catch {
      setBookingWeeklyJson(JSON.stringify(DEFAULT_WEEKLY_HOURS, null, 2));
    }
    try {
      const rawSv = (site as any).booking_services;
      if (rawSv != null) {
        const arr = typeof rawSv === 'string' ? JSON.parse(rawSv) : rawSv;
        setBookingServicesJson(JSON.stringify(Array.isArray(arr) ? arr : [{ label: 'Consultation', minutes: 30 }], null, 2));
      } else {
        setBookingServicesJson(JSON.stringify([{ label: 'Consultation', minutes: 30 }], null, 2));
      }
    } catch {
      setBookingServicesJson(JSON.stringify([{ label: 'Consultation', minutes: 30 }], null, 2));
    }
    const bv = String((site as any).booking_vertical || 'general').toLowerCase();
    setBookingVertical(
      bv === 'medical' || bv === 'legal' || bv === 'business' ? (bv as 'medical' | 'legal' | 'business') : 'general',
    );
    setSectionOrder((site as any).section_order || ['summary','experience','education','skills','projects','languages','certificates','contact']);
    setShowFeed((site as any).show_feed !== false);
    setFeedCols((site as any).feed_cols || 1);
    setAdAskingPrice((site as any).ad_asking_price_usdc != null && (site as any).ad_asking_price_usdc !== ''
      ? String((site as any).ad_asking_price_usdc) : '');
    setAdShowPricePublic((site as any).ad_show_price_public !== false);
    setDirectoryProfileSlug((site as any).directory_profile_slug || '');
    setSiteCategorySlug((site as any).site_category_slug || '');
    if ((site as any).module_order) {
      try { setModuleOrder(JSON.parse((site as any).module_order)); } catch {}
    }
    if ((site as any).site_pages) {
      try { setSitePages(JSON.parse((site as any).site_pages)); } catch {}
    }
    if ((site as any).page_width) setPageWidth(Math.min(1010, Number((site as any).page_width) || 600));
    if ((site as any).page_contents) {
      try { setPageContents(JSON.parse((site as any).page_contents)); } catch {}
    }
    if ((site as any).page_modules) {
      try {
        const parsed = JSON.parse((site as any).page_modules);
        setProfilePhotoAlign(extractPageModulesLayout((site as any).page_modules).profile_photo_align);
        const pm: Record<string, string[]> = {};
        const pc: Record<string, 1|2|3> = {};
        const mc: Record<string, Record<string, 1|2|3>> = {};
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([pageId, raw]: any) => {
            if (isReservedPageModulesKey(pageId)) return;
            if (Array.isArray(raw)) {
              pm[pageId] = raw;
              pc[pageId] = 1;
              mc[pageId] = { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 };
              return;
            }
            const modules = Array.isArray(raw?.modules) ? raw.modules : ['links','cv','feed'];
            const cols = [1,2,3].includes(Number(raw?.columns)) ? Number(raw.columns) as 1|2|3 : 1;
            pm[pageId] = pageId === 'home' ? normalizeModuleList(modules) : modules;
            pc[pageId] = cols;
            mc[pageId] = {
              pages: [1,2,3].includes(Number(raw?.moduleColumns?.pages)) ? Number(raw.moduleColumns.pages) as 1|2|3 : 1,
              links: [1,2,3].includes(Number(raw?.moduleColumns?.links)) ? Number(raw.moduleColumns.links) as 1|2|3 : 1,
              videos: [1,2,3].includes(Number(raw?.moduleColumns?.videos)) ? Number(raw.moduleColumns.videos) as 1|2|3 : 1,
              cv: [1,2,3].includes(Number(raw?.moduleColumns?.cv)) ? Number(raw.moduleColumns.cv) as 1|2|3 : 1,
              feed: [1,2,3].includes(Number(raw?.moduleColumns?.feed)) ? Number(raw.moduleColumns.feed) as 1|2|3 : 1,
              ads: [1,2,3].includes(Number(raw?.moduleColumns?.ads)) ? Number(raw.moduleColumns.ads) as 1|2|3 : 1,
              mystic: [1,2,3].includes(Number(raw?.moduleColumns?.mystic)) ? Number(raw.moduleColumns.mystic) as 1|2|3 : 1,
              slug_market: [1,2,3].includes(Number(raw?.moduleColumns?.slug_market)) ? Number(raw.moduleColumns.slug_market) as 1|2|3 : 1,
              classified: [1,2,3].includes(Number(raw?.moduleColumns?.classified)) ? Number(raw.moduleColumns.classified) as 1|2|3 : 1,
              booking: [1,2,3].includes(Number(raw?.moduleColumns?.booking)) ? Number(raw.moduleColumns.booking) as 1|2|3 : 1,
            };
          });
        }
        if (Object.keys(pm).length) setPageModules(pm);
        if (Object.keys(pc).length) setPageColumns(pc);
        if (Object.keys(mc).length) setModuleColumns(mc);
      } catch {
        setProfilePhotoAlign('center');
      }
    } else {
      setProfilePhotoAlign('center');
    }
  }, [site]);

  useEffect(() => {
    if (!site) editorHydratedForSiteId.current = null;
  }, [site]);

  useEffect(() => {
    if (!user?.id) { setUserSlugRegCount(0); return; }
    (supabase as any).from('slug_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }: any) => setUserSlugRegCount(typeof count === 'number' ? count : 0));
  }, [user?.id]);

  useEffect(() => {
    if (site?.id) setPagesEditorSelectedId('home');
  }, [site?.id]);

  useEffect(() => {
    if (!sitePages.some((p) => p.id === pagesEditorSelectedId)) setPagesEditorSelectedId('home');
  }, [sitePages, pagesEditorSelectedId]);

  useEffect(() => {
    const enforceTrialLifecycle = async () => {
      if (!site?.id || !user?.id) return;
      const { data: sub } = await supabase.from('subscriptions' as any).select('expires_at').eq('user_id', user?.id).maybeSingle();
      const active = sub?.expires_at && new Date(sub.expires_at) > new Date();
      if (active) return;
      const now = new Date();
      const trialEndRaw = (site as any).trial_publish_until;
      const graceEndRaw = (site as any).trial_grace_until;
      const trialEnd = trialEndRaw ? new Date(trialEndRaw) : null;
      const graceEnd = graceEndRaw ? new Date(graceEndRaw) : null;

      if (site.published && trialEnd && trialEnd <= now) {
        const nextGrace = graceEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await save({ published: false, trial_grace_until: nextGrace.toISOString() } as any);
        setPublished(false);
        toast.error(T('err_trial_expired'));
        return;
      }

      if (!site.published && graceEnd && graceEnd <= now) {
        await Promise.all([
          supabase.from('mini_site_links').delete().eq('site_id', site.id),
          supabase.from('mini_site_videos').delete().eq('site_id', site.id),
          (supabase as any).from('feed_posts').delete().eq('site_id', site.id),
          (supabase as any).from('slug_registrations').delete().eq('user_id', user.id).eq('slug', site.slug),
        ]);
        await supabase.from('mini_sites').delete().eq('id', site.id).eq('user_id', user.id);
        toast.error(T('err_grace_ended'));
      }
    };
    enforceTrialLifecycle();
  }, [site?.id, site?.published, site?.slug, user?.id]);

  // ── Load links & videos ───────────────────────────────────────────────────
  useEffect(() => {
    if (!site?.id) return;
    supabase.from('mini_site_links').select('*').eq('site_id', site.id).order('sort_order').then(r => setLinks(r.data || []));
    supabase.from('mini_site_videos').select('*').eq('site_id', site.id).order('sort_order').then(r => setVideos(r.data || []));
    (supabase as any).from('feed_posts').select('*').eq('site_id', site.id).order('created_at', { ascending: false }).limit(50)
      .then((r: any) => setFeedPosts(r.data || []));
  }, [site?.id]);

  useEffect(() => {
    (supabase as any).from('platform_settings').select('key,value').in('key', ['trial_hours', 'grace_days']).then(({ data }: any) => {
      (data || []).forEach((s: any) => {
        if (s.key === 'trial_hours') setTrialHours(Math.max(1, Number(s.value) || 24));
        if (s.key === 'grace_days') setGraceDays(Math.max(30, Number(s.value) || 30));
      });
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const byEmail = (user.email || '').toLowerCase() === ADMIN_BYPASS_EMAIL;
    if (byEmail) { setIsAdminBypass(true); return; }
    (supabase as any).from('user_roles')
      .select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }: any) => setIsAdminBypass(!!data));
  }, [user?.id, user?.email]);

  // NOTE:
  // We intentionally do NOT auto-create mini-sites anymore.
  // Auto-creation could generate unintended slugs/profiles when loading fails temporarily.

  // ── Autosave (debounce longo: evita “piscar” / reload a cada tecla) ───────
  /** Mínimo ~2 min após última alteração antes de gravar em silêncio. Gravar manual (barra) é imediato. */
  const AUTOSAVE_DEBOUNCE_MS = 120_000;

  const markDirty = useCallback(() => { isDirty.current = true; }, []);

  useEffect(() => {
    if (!site?.id || !isDirty.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (isDirty.current) void handleSave(true);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    // handleSave muda a cada render mas queremos o último estado no tick; omitido de propósito.
    // Incluir todos os campos que handleSave persiste em mini_sites para o CV e perfil não “perderem” autosave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteName, slug, bio, theme, accentColor, photoShape, photoSize, fontStyle, textColor,
      avatarUrl, bannerUrl,
      showCv, cvLocked, cvContactLocked, cvFree, cvPrice, cvHeadline, cvContent, cvLocation, cvSkills,
      cvExperience, cvEducation, cvProjects, cvLanguages, cvCertificates, sectionOrder,
      showFeed, feedCols, moduleOrder, sitePages, pageWidth, pageContents, pageModules, walletAddr, contactEmail, contactWhatsapp, published, seoTitle, seoDescription, seoOgImage, seoSearchTags, seoJsonLd,
      livelyAvatarEnabled, livelyAvatarModel, livelyAvatarWelcome, livelyCentralMagic, livelyFloatingExpressive, livelyDualAgent, livelyAgentInstructions, livelyElevenOwner, livelyElevenAgent, livelyTtsProvider,
      livelyProfileAsAvatar, livelyProfileSpeakOnEntry, livelyProfileSpeechTap, livelyProfileSpeechBeforeReply,
      identityPortraitUrl, identityStylePreset, identityVoiceEffect, magicPortraitEnabled, bannerFocusX, bannerFocusY, bannerZoom, bannerFit, bannerPlaceholderEnabled, bannerPlaceholderColor, tickerEnabled, tickerItems,
      adAskingPrice, adShowPricePublic, directoryProfileSlug, siteCategorySlug,
      mysticPublicEnabled, mysticTarotPrice, mysticLotteryPrice,
      bookingEnabled, bookingSlotMinutes, bookingTimezone, bookingWeeklyJson, bookingServicesJson, bookingVertical]);

  // ── Upload helper ─────────────────────────────────────────────────────────
  const uploadToStorage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('platform-assets').upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return supabase.storage.from('platform-assets').getPublicUrl(path).data.publicUrl;
  };

  const seoAssistPayload = () => ({
    siteName: siteName.trim(),
    bio: bio.trim(),
    slug: slug.trim(),
    cvHeadline: cvHeadline.trim(),
    cvSkills: cvSkills.split(',').map((s) => s.trim()).filter(Boolean),
    links: links.map((l: { title?: string; url?: string }) => ({ title: l.title, url: l.url })),
    pageLabels: sitePages.map((p) => p.label),
    category: siteCategorySlug.trim() || undefined,
    subcategory: directoryProfileSlug.trim() || undefined,
  });

  const notifySearchEnginesPublished = () => {
    const s = slug.trim().toLowerCase();
    if (!s) return;
    void fetch('/api/seo/notify-published', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ slug: s }),
    }).catch(() => {});
  };

  const runMagicDescription = async () => {
    if (!ensureEditorIaOrToast()) return;
    if (!site?.id || magicDescLoading) return;
    setMagicDescLoading(true);
    try {
      const res = await fetch('/api/editor/seo-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: site.id,
          action: 'magic_description',
          payload: seoAssistPayload(),
          uiLang: lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('ed_seo_ai_error'));
        return;
      }
      const d = typeof data.description === 'string' ? data.description : '';
      if (d) {
        setSeoDescription(d.slice(0, 160));
        markDirty();
        toast.success(T('ed_seo_magic_done'));
      }
    } catch {
      toast.error(T('ed_seo_ai_error'));
    } finally {
      setMagicDescLoading(false);
    }
  };

  const runSuggestSearchTags = async () => {
    if (!site?.id || suggestTagsLoading) return;
    setSuggestTagsLoading(true);
    try {
      const res = await fetch('/api/editor/seo-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: site.id,
          action: 'suggest_keywords',
          payload: seoAssistPayload(),
          uiLang: lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('ed_seo_ai_error'));
        return;
      }
      const tags = Array.isArray(data.tags) ? data.tags : [];
      if (!tags.length) return;
      setSeoSearchTags((prev) => {
        const next = [...prev];
        for (const t of tags) {
          const x = String(t).trim();
          if (x && !next.includes(x) && next.length < 16) next.push(x);
        }
        return next;
      });
      markDirty();
      toast.success(T('ed_seo_tags_done'));
    } catch {
      toast.error(T('ed_seo_ai_error'));
    } finally {
      setSuggestTagsLoading(false);
    }
  };

  const runSeoPack = async () => {
    if (!ensureEditorIaOrToast()) return;
    if (!site?.id || seoPackLoading) return;
    setSeoPackLoading(true);
    try {
      const res = await fetch('/api/editor/seo-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: site.id,
          action: 'seo_pack',
          payload: seoAssistPayload(),
          uiLang: lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('ed_seo_ai_error'));
        return;
      }
      const st = typeof data.pack?.seoTitle === 'string' ? data.pack.seoTitle.trim() : '';
      const sd = typeof data.pack?.seoDescription === 'string' ? data.pack.seoDescription.trim() : '';
      const jld = typeof data.seoJsonLd === 'string' ? data.seoJsonLd.trim() : '';
      if (st) setSeoTitle(st.slice(0, 70));
      if (sd) setSeoDescription(sd.slice(0, 160));
      if (jld) setSeoJsonLd(jld);
      const services = Array.isArray(data.pack?.services) ? data.pack.services : [];
      if (services.length) {
        setSeoSearchTags((prev) => {
          const next = [...prev];
          for (const x of services) {
            const t = String(x).trim();
            if (t && !next.includes(t) && next.length < 16) next.push(t);
          }
          return next;
        });
      }
      const intro = typeof data.pack?.intro === 'string' ? data.pack.intro.trim() : '';
      if (intro && !bio.trim()) {
        setBio(intro.slice(0, 2500));
      }
      markDirty();
      toast.success(T('ed_seo_pack_done'));
    } catch {
      toast.error(T('ed_seo_ai_error'));
    } finally {
      setSeoPackLoading(false);
    }
  };

  const runVerifyLivelyNft = async () => {
    if (!user?.id || livelyNftVerifyLoading) return;
    setLivelyNftVerifyLoading(true);
    try {
      const res = await fetch('/api/lively-avatar/verify-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('ed_lively_nft_fail'));
        return;
      }
      toast.success(T('ed_lively_nft_ok'));
      await reload();
    } catch {
      toast.error(T('ed_lively_nft_fail'));
    } finally {
      setLivelyNftVerifyLoading(false);
    }
  };

  const runVerifyPremiumNft = async () => {
    if (!user?.id || livelyPremiumVerifyLoading) return;
    setLivelyPremiumVerifyLoading(true);
    try {
      const res = await fetch('/api/lively-avatar/verify-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'premium' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('ed_lively_premium_fail'));
        return;
      }
      toast.success(T('ed_lively_premium_ok'));
      await reload();
    } catch {
      toast.error(T('ed_lively_premium_fail'));
    } finally {
      setLivelyPremiumVerifyLoading(false);
    }
  };

  const runSuggestLivelyWelcome = async () => {
    if (!ensureEditorIaOrToast()) return;
    const slug = site?.slug?.trim();
    if (!slug || livelySuggestWelcomeBusy) return;
    setLivelySuggestWelcomeBusy(true);
    try {
      const res = await fetch('/api/lively-avatar/suggest-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, uiLang: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('ed_lively_suggest_fail'));
        return;
      }
      const w = typeof data.welcome === 'string' ? data.welcome.trim() : '';
      if (w) {
        setLivelyAvatarWelcome(w.slice(0, 500));
        markDirty();
        toast.success(T('ed_lively_suggest_ok'));
      }
    } catch {
      toast.error(T('ed_lively_suggest_fail'));
    } finally {
      setLivelySuggestWelcomeBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const id = site?.id;
    if (!id) {
      setByokDeepseekConfigured(null);
      setByokDeepseekKeyDraft('');
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/editor/byok-deepseek?siteId=${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && typeof data.configured === 'boolean') {
          setByokDeepseekConfigured(data.configured);
        } else {
          setByokDeepseekConfigured(false);
        }
      } catch {
        if (!cancelled) setByokDeepseekConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  const saveByokDeepseek = async () => {
    if (!site?.id || byokDeepseekSaving) return;
    const k = byokDeepseekKeyDraft.trim();
    if (!k) {
      toast.error(T('ed_byok_key_empty'));
      return;
    }
    setByokDeepseekSaving(true);
    try {
      const res = await fetch('/api/editor/byok-deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ siteId: site.id, apiKey: k }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro');
        return;
      }
      setByokDeepseekKeyDraft('');
      setByokDeepseekConfigured(true);
      toast.success(T('ed_byok_toast_saved'));
    } catch {
      toast.error('Erro');
    } finally {
      setByokDeepseekSaving(false);
    }
  };

  const removeByokDeepseek = async () => {
    if (!site?.id || byokDeepseekSaving) return;
    setByokDeepseekSaving(true);
    try {
      const res = await fetch(`/api/editor/byok-deepseek?siteId=${encodeURIComponent(site.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro');
        return;
      }
      setByokDeepseekConfigured(false);
      setByokDeepseekKeyDraft('');
      toast.success(T('ed_byok_toast_removed'));
    } catch {
      toast.error('Erro');
    } finally {
      setByokDeepseekSaving(false);
    }
  };

  const runSuggestAdPrice = async () => {
    if (!ensureEditorIaOrToast()) return;
    if (!site?.id || suggestingPrice) return;
    setSuggestingPrice(true);
    try {
      const res = await fetch('/api/pricing-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Falha');
      const v = data.ai?.min_usd_week ?? data.heuristic?.base ?? data.heuristic?.min;
      if (v != null && !Number.isNaN(Number(v))) {
        setAdAskingPrice(String(Math.round(Number(v))));
        markDirty();
        toast.success(T('ed_toast_price_suggest_ok'));
      } else {
        toast.info(T('ed_toast_price_suggest_none'));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setSuggestingPrice(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (silent = false) => {
    if (!user || !site) return;
    if (!silent) setSaving(true);
    try {
      const combinedPageModules: Record<string, any> = {};
      sitePages.forEach((p) => {
        const rawModules = pageModules[p.id] || (p.id === 'home' ? moduleOrder : []);
        const modules = p.id === 'home' ? normalizeModuleList(rawModules) : rawModules;
        combinedPageModules[p.id] = {
          modules,
          columns: pageColumns[p.id] || 1,
          moduleColumns: moduleColumns[p.id] || { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 },
        };
      });
      combinedPageModules._layout = {
        profile_photo_align: profilePhotoAlign,
      };

      let weeklyHoursPayload: Record<string, unknown> = { ...DEFAULT_WEEKLY_HOURS };
      try {
        const w = JSON.parse(bookingWeeklyJson);
        if (w && typeof w === 'object' && !Array.isArray(w)) weeklyHoursPayload = w as Record<string, unknown>;
      } catch {
        /* mantém default */
      }
      let servicesPayload: unknown[] = [...DEFAULT_BOOKING_SERVICES];
      try {
        const s = JSON.parse(bookingServicesJson);
        if (Array.isArray(s) && s.length) servicesPayload = s;
      } catch {
        /* mantém default */
      }

      const savePayload: any = {
        site_name:     siteName,
        bio,
        avatar_url:    avatarUrl,
        banner_url:    bannerUrl,
        banner_focus_x: bannerFocusX,
        banner_focus_y: bannerFocusY,
        banner_zoom: bannerZoom,
        banner_fit: bannerFit,
        banner_placeholder_enabled: bannerPlaceholderEnabled,
        banner_placeholder_color: bannerPlaceholderColor || null,
        theme,
        accent_color:  accentColor,
        photo_shape:   photoShape,
        photo_size:    photoSize === 'site' ? 'xl' : photoSize,
        font_style:    fontStyle,
        text_color:    textColor || null,
        show_cv:       showCv,
        cv_locked:     false,
        cv_contact_locked: false,
        cv_price:      0,
        cv_headline:   cvHeadline,
        cv_content:    cvContent,
        cv_location:   cvLocation,
        cv_skills:     cvSkills.split(',').map(s => s.trim()).filter(Boolean),
        cv_experience: cvExperience,
        cv_education: cvEducation,
        cv_projects: cvProjects,
        cv_languages: cvLanguages,
        cv_certificates: cvCertificates,
        cv_contact_whatsapp: cvContactWhatsapp || null,
        cv_hire_price: cvHirePrice || 0,
        cv_hire_currency: cvHireCurrency || 'USD',
        cv_hire_type: cvHireType || 'hour',
        cv_free: cvFree,
        section_order: sectionOrder,
        show_feed:     showFeed,
        feed_cols:     feedCols,
        module_order:  JSON.stringify(moduleOrder),
        site_pages:    JSON.stringify(sitePages),
        page_width: Math.min(1010, Math.max(320, pageWidth)),
        page_contents: JSON.stringify(pageContents),
        page_modules: JSON.stringify(combinedPageModules),
        wallet_address: walletAddr,
        contact_email: contactEmail,
        contact_phone: contactWhatsapp.trim() || null,
        ticker_enabled: tickerEnabled,
        ticker_items: tickerItems,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        seo_og_image: seoOgImage || null,
        seo_search_tags: seoSearchTags.length ? seoSearchTags : [],
        seo_json_ld: seoJsonLd.trim() || null,
        lively_avatar_enabled: livelyAvatarEnabled,
        lively_avatar_model: livelyAvatarModel || 'neo',
        lively_avatar_welcome: livelyAvatarWelcome.trim() || null,
        lively_central_magic: livelyCentralMagic,
        lively_floating_preset: 'classic',
        lively_floating_expressive: livelyFloatingExpressive,
        lively_dual_agent: livelyDualAgent,
        lively_agent_instructions: livelyAgentInstructions.trim() || null,
        lively_elevenlabs_voice_owner: livelyElevenOwner.trim() || null,
        lively_elevenlabs_voice_agent: livelyElevenAgent.trim() || null,
        lively_tts_provider: livelyTtsProvider,
        lively_use_deepseek_byok: livelyUseDeepseekByok,
        lively_profile_as_avatar: livelyProfileAsAvatar,
        lively_profile_speak_on_entry: livelyProfileSpeakOnEntry,
        lively_profile_speech_tap: livelyProfileSpeechTap.trim() || null,
        lively_profile_speech_before_reply: livelyProfileSpeechBeforeReply.trim() || null,
        identity_portrait_url: identityPortraitUrl.trim() || null,
        identity_style_preset: identityStylePreset || null,
        identity_voice_effect: identityVoiceEffect || 'neutral',
        magic_portrait_enabled: magicPortraitEnabled,
        published,
        ad_asking_price_usdc: (() => {
          const t = adAskingPrice.trim();
          if (!t) return null;
          const n = parseFloat(t.replace(',', '.'));
          if (Number.isNaN(n) || n <= 0) return null;
          return n;
        })(),
        ad_show_price_public: adShowPricePublic,
        directory_profile_slug: directoryProfileSlug.trim() || null,
        site_category_slug: siteCategorySlug.trim() || null,
        mystic_public_enabled: mysticPublicEnabled,
        mystic_tarot_price_usd: Math.max(0.5, mysticTarotNum || PLATFORM_USD.mysticTarotDefault),
        mystic_lottery_premium_price_usd: Math.max(0.5, mysticLotteryNum || PLATFORM_USD.mysticLotteryPremiumDefault),
        booking_enabled: bookingEnabled,
        booking_slot_minutes: Math.max(15, Math.min(180, parseInt(String(bookingSlotMinutes), 10) || 30)),
        booking_timezone: bookingTimezone.trim() || 'America/Sao_Paulo',
        booking_weekly_hours: weeklyHoursPayload,
        booking_services: servicesPayload,
        booking_vertical: bookingVertical,
      } as any;

      if (AI_DISABLED_TEMP) {
        // Temporarily disable AI persistence to avoid schema drift breakages.
        delete savePayload.lively_avatar_enabled;
        delete savePayload.lively_avatar_model;
        delete savePayload.lively_avatar_welcome;
        delete savePayload.lively_central_magic;
        delete savePayload.lively_floating_preset;
        delete savePayload.lively_floating_expressive;
        delete savePayload.lively_dual_agent;
        delete savePayload.lively_agent_instructions;
        delete savePayload.lively_elevenlabs_voice_owner;
        delete savePayload.lively_elevenlabs_voice_agent;
        delete savePayload.lively_tts_provider;
        delete savePayload.lively_use_deepseek_byok;
        delete savePayload.lively_profile_as_avatar;
        delete savePayload.lively_profile_speak_on_entry;
        delete savePayload.lively_profile_speech_tap;
        delete savePayload.lively_profile_speech_before_reply;
        delete savePayload.identity_portrait_url;
        delete savePayload.identity_style_preset;
        delete savePayload.identity_voice_effect;
        delete savePayload.magic_portrait_enabled;
      }

      await save(savePayload);

      // Handle slug change
      if (slug !== site.slug) {
        if (!isAdminBypass && isSlugReservedAdminOnly(slug)) {
          if (!silent) toast.error(T('err_slug_reserved'));
          if (!silent) setSaving(false);
          return;
        }
        if (isAdminBypass) {
          await supabase.from('mini_sites').update({ slug }).eq('id', site.id).eq('user_id', user.id);
          const { data: owned } = await (supabase as any).from('slug_registrations').select('id').eq('user_id', user.id).eq('slug', slug).maybeSingle();
          if (!owned) {
            await (supabase as any).from('slug_registrations').insert({
              user_id: user.id,
              slug,
              status: 'active',
              for_sale: false,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }
          if (!silent) toast.success(T('toast_slug_admin_bypass').replace('{slug}', slug));
          isDirty.current = false;
          if (!silent) setLastSaved(new Date());
          return;
        }
        const { count } = await (supabase as any).from('slug_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        const ownCount = typeof count === 'number' ? count : 0;
        const price = slugRegistrationDueUsd(slug, ownCount);
        if (price > 0) {
          // Check if user already owns this slug
          const { data: owned } = await (supabase as any)
            .from('slug_registrations').select('id')
            .eq('user_id', user.id).eq('slug', slug).maybeSingle();
          if (owned) {
            await supabase.from('mini_sites').update({ slug }).eq('id', site.id).eq('user_id', user.id);
            if (!silent) toast.success(T('toast_slug_applied').replace('{slug}', slug));
          } else {
            addToCart({ id:`slug_${slug}`, label:`Slug: ${slug}.trustbank.xyz`, price, type:'slug' });
            if (!silent) { openCart(); toast.success(T('toast_slug_cart').replace('{slug}', slug)); }
          }
        } else {
          const { data: existing } = await (supabase as any)
            .from('slug_registrations').select('id').eq('slug', slug).maybeSingle();
          if (!existing) {
            await (supabase as any).from('slug_registrations').insert({
              user_id: user.id,
              slug,
              status: 'active',
              for_sale: false,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }
          await supabase.from('mini_sites').update({ slug }).eq('id', site.id).eq('user_id', user.id);
          if (!silent) toast.success(T('toast_slug_domain_ok').replace('{slug}', slug));
        }
      }

      isDirty.current = false;
      if (!silent) setLastSaved(new Date());
      if (!silent) toast.success(T('toast_saved'));
    } catch (e: any) {
      const msg = String(e?.message || '');
      const isSchemaColumnIssue =
        /could not find.*column/i.test(msg) ||
        /schema cache/i.test(msg) ||
        /column .* does not exist/i.test(msg);
      if (isSchemaColumnIssue) setShowSchemaHint(true);
      toast.error(T('toast_error_prefix') + msg);
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
    toast.success(T('toast_link_added'));
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
      toast.error(T('err_youtube_verify_first'));
      return;
    }
    const ytId = extractYouTubeId(ytUrl);
    if (!ytId) { toast.error(T('toast_invalid_youtube')); return; }
    const basePayload = {
      site_id: site.id, youtube_video_id: ytId,
      title: ytTitle || 'Video', paywall_enabled: paywallEnabled,
      paywall_price: parseFloat(paywallPrice) || PLATFORM_USD.videoPaywallDefault,
      preview_image_url: videoPreviewImageUrl.trim() || null,
      sort_order: videos.length
    };
    let { error } = await (supabase as any).from('mini_site_videos').insert({
      ...basePayload,
      preview_embed_url: videoPreviewEmbedUrl.trim() || null,
    });
    if (error && /preview_embed_url/i.test(String(error.message || ''))) {
      const retry = await (supabase as any).from('mini_site_videos').insert(basePayload);
      error = retry.error;
    }
    if (error) {
      toast.error(error.message || T('toast_error_prefix'));
      return;
    }
    supabase.from('mini_site_videos').select('*').eq('site_id', site.id).order('sort_order')
      .then(r => setVideos(r.data || []));
    setYtUrl(''); setYtTitle(''); setVideoPreviewImageUrl(''); setVideoPreviewEmbedUrl('');
    toast.success(T('toast_video_added'));
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
        toast.success(T('toast_channel_verified'));
      } else {
        const allow = window.confirm(`${data?.message || T('toast_backlink_not_found')}\n\n${T('ed_verify_manual_confirm')}`);
        if (allow) {
          const res2 = await fetch('/api/verify-youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ youtubeUrl: ytVerifyUrl, siteSlug: site.slug, userId: user?.id, manualConfirm: true }),
          });
          const data2 = await res2.json();
          if (data2.verified) {
            await supabase.from('mini_sites').update({ is_verified: true, youtube_channel_id: data2.channelId }).eq('id', site.id);
            toast.success(T('toast_channel_verified_manual'));
          } else {
            toast.error(data2?.message || T('toast_verification_failed'));
          }
        } else {
          toast.error(T('toast_backlink_not_found'));
        }
      }
    } catch { toast.error(T('toast_verification_error')); }
    setVerifying(false);
  };

  /** Tem de ficar antes de qualquer return antecipado (Rules of Hooks). */
  const TABS = useMemo(
    () => [
      { id: 'profile' as const, label: T('ed_profile'), icon: Globe },
      { id: 'theme' as const, label: T('ed_theme'), icon: ImageIcon },
      { id: 'links' as const, label: T('ed_links'), icon: Link2 },
      { id: 'cv' as const, label: T('ed_cv'), icon: FileText },
      { id: 'feed' as const, label: T('ed_feed'), icon: ChevronDown },
      { id: 'pages' as const, label: T('ed_pages'), icon: LayoutTemplate },
      { id: 'seo' as const, label: T('ed_seo'), icon: Search },
      { id: 'verify' as const, label: T('ed_verify'), icon: Shield },
    ],
    [T],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth?redirect=%2Feditor');
    }
  }, [authLoading, user, router]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading || siteLoading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  );
  if (!user) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  );
  if (editorSiteId && !site) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4 card p-8">
          <h1 className="font-black text-xl text-[var(--text)]">{T('ed_site_not_found_title')}</h1>
          <p className="text-sm text-[var(--text2)]">{T('ed_site_not_found_body')}</p>
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Link href="/editor" className="btn-primary text-sm">{T('ed_open_default_editor')}</Link>
            {(user?.email || '').toLowerCase() === 'arytcf@gmail.com' && (
              <Link href="/admin" className="btn-secondary text-sm">{T('ed_back_admin_sites')}</Link>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (!site) {
    const createSlugClean = newSiteSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const slugPreview = createSlugClean || '(slug)';
    const createSlugKey = normalizeSlugKey(createSlugClean);
    const createSlugKeyLen = createSlugKey.length;
    const createSlugOkLen = createSlugKeyLen >= 2;
    const createReserved =
      createSlugKeyLen > 0 && !isAdminBypass && isSlugReservedAdminOnly(createSlugClean);
    const createDue =
      createSlugOkLen && !createReserved
        ? slugRegistrationDueUsd(createSlugClean, isAdminBypass ? 0 : userSlugRegCount)
        : 0;
    const createTierUsd = createSlugOkLen ? slugLengthTierUsd(createSlugClean) : 0;
    const tierPreviewUsd =
      createSlugKeyLen >= 1 && createSlugKeyLen <= 7 ? slugLengthTierByLenOnly(createSlugKeyLen) : 0;
    const createIsWorldFirst = createSlugOkLen && isWorldFirstNameSlug(createSlugKey);
    const createSlugUnavailable =
      createSlugTaken && !createSlugOwnedByUser && !createSlugHasMiniMine;
    const createCanOpenPay =
      createSlugOkLen &&
      !createReserved &&
      !createSlugChecking &&
      !createSlugHasMiniMine &&
      createDue > 0 &&
      !createSlugOwnedByUser &&
      !createSlugUnavailable;
    const createCanSubmitMini =
      !!newSiteName.trim() &&
      createSlugOkLen &&
      !createReserved &&
      !createSlugChecking &&
      !createSlugHasMiniMine &&
      !createSlugUnavailable &&
      (isAdminBypass || createDue === 0 || createSlugOwnedByUser);
    const tierRows = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ n, usd: slugLengthTierByLenOnly(n) }));
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-14">
          <div className="card p-6 space-y-4">
            <h1 className="font-black text-xl text-[var(--text)] mb-1">{T('ed_create_title')}</h1>
            <p className="text-sm text-[var(--text2)]">{T('ed_create_body')}</p>
            <div>
              <label className="text-xs font-bold text-[var(--text2)] block mb-1">{T('ed_label_site_name')}</label>
              <input
                value={newSiteName}
                onChange={e => setNewSiteName(e.target.value)}
                className="input w-full"
                placeholder={T('ed_placeholder_portfolio')}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text2)] block mb-1">{T('ed_label_slug_username')}</label>
              <input
                value={newSiteSlug}
                onChange={e => setNewSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="input w-full font-mono"
                placeholder={T('ed_placeholder_slug_user')}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-brand mt-1 font-mono">
                {slugPreview}.trustbank.xyz
              </p>
              <p className="text-[10px] text-[var(--text2)] mt-1">{T('ed_create_slug_blocked_hint')}</p>

              <div className="mt-3 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/90 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-brand">{T('ed_create_slug_live_title')}</p>
                {createSlugKeyLen < 2 ? (
                  <p className="text-xs text-[var(--text2)]">{T('ed_create_slug_need_two')}</p>
                ) : null}
                {createSlugKeyLen >= 1 ? (
                  <p className="text-xs text-[var(--text)]">
                    {T('ed_create_slug_key_len').replace('{n}', String(createSlugKeyLen))}
                  </p>
                ) : null}
                {createSlugKeyLen === 1 ? (
                  <p className="text-xs text-amber-400/95">
                    {T('editor_slug_premium_hint')} ${tierPreviewUsd.toLocaleString()} USD ({T('slug_char_one')})
                  </p>
                ) : null}
                {createSlugChecking && createSlugOkLen ? (
                  <p className="text-xs text-[var(--text2)] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    {T('ed_create_slug_checking')}
                  </p>
                ) : null}
                {createSlugHasMiniMine ? (
                  <p className="text-xs font-semibold text-amber-400">{T('ed_create_slug_has_minisite')}</p>
                ) : null}
                {createSlugUnavailable ? (
                  <p className="text-xs font-semibold text-red-400">{T('ed_create_slug_taken')}</p>
                ) : null}
                {createSlugOwnedByUser && !createSlugHasMiniMine ? (
                  <p className="text-xs font-semibold text-emerald-400">{T('ed_create_slug_you_own')}</p>
                ) : null}
                {createReserved ? (
                  <p className="text-xs font-semibold text-amber-500">{T('err_slug_reserved')}</p>
                ) : null}
                {createSlugOkLen && !createReserved ? (
                  <>
                    <p className="text-xs text-[var(--text)] pt-1 border-t border-[var(--border)]/60">
                      <span className="text-[var(--text2)]">{T('ed_create_slug_price_label')} </span>
                      <span className="font-black tabular-nums">
                        {createDue > 0 ? `$${createDue.toLocaleString()} USD` : T('ed_create_slug_price_free')}
                      </span>
                    </p>
                    {createDue > 0 ? (
                      <p className="text-xs text-amber-400/95">
                        ⚡{' '}
                        {createTierUsd > 0
                          ? `${T('editor_slug_premium_hint')} $${createTierUsd.toLocaleString()} USD`
                          : `${T('editor_slug_extra_hint')} $${SLUG_EXTRA_REGISTRATION_USD} USD`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[var(--text2)]">{T('slug_tier_included_first')}</p>
                    )}
                    {createIsWorldFirst ? (
                      <p className="text-[10px] text-[var(--text2)]">{T('slug_tier_names')}</p>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/80 p-3">
                <p className="text-[11px] font-bold text-[var(--text)] mb-2">{T('ed_create_slug_price_table')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[10px] font-mono text-[var(--text2)]">
                  {tierRows.map(({ n, usd }) => (
                    <span key={n}>
                      {n} → ${usd.toLocaleString()}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text2)] mt-2">{T('slug_table_cell_8')} · {T('slug_rules_blurb')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                {T('ed_reload')}
              </button>
              {createCanOpenPay ? (
                <button
                  type="button"
                  onClick={() => {
                    const clean = createSlugClean;
                    addToCart({
                      id: `slug_${clean}`,
                      label: `${clean}.trustbank.xyz`,
                      price: createDue,
                      type: 'slug',
                    });
                    openCart();
                    toast.message(T('ed_create_pay_slug_toast'));
                  }}
                  className="btn-primary bg-amber-600 hover:bg-amber-500 border-0"
                >
                  {T('ed_create_checkout_slug_btn').replace('${price}', String(createDue))}
                </button>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  if (!user?.id) return;
                  const clean = createSlugClean;
                  if (normalizeSlugKey(clean).length < 2) {
                    toast.error(T('err_slug_min_2'));
                    return;
                  }
                  const nameTrim = newSiteName.trim();
                  if (!nameTrim) {
                    toast.error(T('err_site_name_required'));
                    return;
                  }
                  if (createReserved && !isAdminBypass) {
                    toast.error(T('err_slug_reserved'));
                    return;
                  }
                  if (createSlugChecking) {
                    toast.message(T('ed_create_slug_checking'));
                    return;
                  }
                  if (createSlugHasMiniMine) {
                    toast.error(T('ed_create_slug_has_minisite'));
                    return;
                  }
                  if (createSlugUnavailable) {
                    toast.error(T('ed_create_slug_taken'));
                    return;
                  }
                  const due = slugRegistrationDueUsd(clean, isAdminBypass ? 0 : userSlugRegCount);
                  if (!isAdminBypass && due > 0 && !createSlugOwnedByUser) {
                    addToCart({
                      id: `slug_${clean}`,
                      label: `${clean}.trustbank.xyz`,
                      price: due,
                      type: 'slug',
                    });
                    openCart();
                    toast.message(T('ed_create_pay_slug_toast'));
                    return;
                  }
                  setCreatingSite(true);
                  try {
                    if (!isAdminBypass && due === 0) {
                      const { data: reg } = await (supabase as any)
                        .from('slug_registrations')
                        .select('user_id')
                        .eq('slug', clean)
                        .maybeSingle();
                      if (reg && (reg as { user_id: string }).user_id !== user.id) {
                        toast.error(T('err_slug_taken_toast').replace('{slug}', clean));
                        return;
                      }
                      if (!reg) {
                        const { error: regErr } = await (supabase as any).from('slug_registrations').insert({
                          user_id: user.id,
                          slug: clean,
                          status: 'active',
                          for_sale: false,
                          expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
                        });
                        if (regErr && !/duplicate|unique|23505/i.test(String(regErr.message || ''))) {
                          throw new Error(regErr.message || T('err_create_failed'));
                        }
                        setUserSlugRegCount((c) => c + 1);
                      }
                    }
                    await save({
                      site_name: nameTrim,
                      slug: clean,
                      bio: '',
                      published: false,
                    } as any);
                    toast.success(T('toast_mini_site_created'));
                    await reload();
                    const { data: row } = await supabase
                      .from('mini_sites')
                      .select('id')
                      .eq('user_id', user.id)
                      .eq('slug', clean)
                      .maybeSingle();
                    if (row?.id) {
                      router.replace(`/editor?site=${(row as { id: string }).id}`);
                    } else {
                      const { data: latest } = await supabase
                        .from('mini_sites')
                        .select('id')
                        .eq('user_id', user.id)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                      if (latest?.id) router.replace(`/editor?site=${(latest as { id: string }).id}`);
                      else router.replace('/editor');
                    }
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : T('err_create_failed');
                    const isSchemaColumnIssue =
                      /could not find.*column/i.test(msg) ||
                      /schema cache/i.test(msg) ||
                      /column .* does not exist/i.test(msg);
                    if (isSchemaColumnIssue) setShowSchemaHint(true);
                    toast.error(msg);
                  } finally {
                    setCreatingSite(false);
                  }
                }}
                className="btn-primary"
                disabled={creatingSite || !createCanSubmitMini}
              >
                {creatingSite ? T('ed_creating') : T('ed_create_site_btn')}
              </button>
              <Link href="/slugs" className="btn-secondary inline-flex items-center justify-center text-sm">
                {T('nav_slug_market')}
              </Link>
            </div>
            {showSchemaHint && (
              <p className="text-xs text-amber-400/90 border border-amber-500/30 rounded-xl p-3">
                {T('ed_schema_migration_hint')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
  const siteUrl = site?.slug ? `https://${site.slug}.trustbank.xyz` : null;
  const managePreviewUrl = site?.slug ? `/s/${site.slug}?manage=1` : null;
  const photoSizePx: Record<string, number> = { sm: 72, md: 96, lg: 128, xl: 192 };
  const avatarPx = photoSizePx[photoSize] || 96;
  const PREVIEW_BANNER_MAX_PX = 250;
  const previewBannerStripH = Math.min(200, PREVIEW_BANNER_MAX_PX);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <Header />
      <div className="flex flex-1 w-full min-w-0 min-h-0 flex flex-col min-h-0">
      {/* Top bar — mais espaço vertical e quebra de linha para caberem todos os separadores */}
      <div className="sticky top-16 z-40 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col gap-2">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 min-w-0 flex-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-brand text-white' : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'}`}>
              <tab.icon className="w-4 h-4 shrink-0" /> {tab.label}
            </button>
          ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pt-0.5 sm:pt-0 sm:pl-2 border-t border-[var(--border)]/60 sm:border-t-0">
            {isDirty.current
              ? <span className="text-xs text-amber-400 font-semibold">{T('ed_unsaved')}</span>
              : lastSaved && <span className="text-xs text-green-500">{T('ed_saved_at')} {lastSaved.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</span>}
            <button onClick={() => handleSave()} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border border-[var(--border)] hover:border-brand/50 transition-all">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {T('ed_save')}
            </button>
            {siteUrl && (
              <a href={managePreviewUrl || siteUrl || '#'} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border border-[var(--border)] hover:border-green-500/50 text-green-500 transition-all">
                <Eye className="w-3.5 h-3.5" /> {T('ed_preview')}
              </a>
            )}
            <button onClick={async () => {
              if (!user?.id) { toast.error(T('toast_sign_in_required')); return; }
              if (isAdminBypass) {
                await save({ published: true } as any);
                setPublished(true);
                markDirty();
                notifySearchEnginesPublished();
                toast.success(T('toast_published_admin'));
                return;
              }
              const { data: sub } = await supabase.from('subscriptions' as any).select('expires_at').eq('user_id', user.id).maybeSingle();
              const active = sub?.expires_at && new Date(sub.expires_at) > new Date();
              if (!active) {
                const currentTrial = (site as any)?.trial_publish_until ? new Date((site as any).trial_publish_until) : null;
                const trialStillValid = !!currentTrial && currentTrial > new Date();
                if (!trialStillValid) {
                  const trialEnd = new Date(Date.now() + trialHours * 60 * 60 * 1000).toISOString();
                  const graceEnd = new Date(Date.now() + (trialHours + graceDays * 24) * 60 * 60 * 1000).toISOString();
                  /** Trial = só editor; público fica offline até assinatura (Stripe → published: true). */
                  await save({ trial_publish_until: trialEnd, trial_grace_until: graceEnd, trial_notice_sent_at: null, published: false } as any);
                  setPublished(false);
                  markDirty();
                  toast.success(T('toast_trial_editor_offline'));
                  return;
                }
                toast.error(T('toast_trial_used'));
                router.push('/planos');
                return;
              }
              setPublished(true); markDirty();
              await handleSave(true);
              await save({ published: true } as any);
              notifySearchEnginesPublished();
              toast.success(T('toast_published_ok'));
            }} className="px-4 py-1.5 rounded-xl text-sm font-black text-white"
              style={{ background: published ? '#22c55e' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              {published ? T('ed_live') : T('ed_publish')}
            </button>
          </div>
          </div>
          {site?.id ? (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/60">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text2)] shrink-0">
                {T('ed_pages_bar_label')}
              </span>
              <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                {sitePages.map((page, idx) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => {
                      setActiveTab('pages');
                      setPagesEditorSelectedId(page.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      activeTab === 'pages' && pagesEditorSelectedId === page.id
                        ? 'border-brand bg-brand text-white'
                        : 'border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
                    }`}
                  >
                    {idx === 0
                      ? T('ed_page_name_home_ph')
                      : page.label?.trim() || T('ed_page_new_label').replace('{n}', String(idx + 1))}
                  </button>
                ))}
                {sitePages.length < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `p_${Date.now()}`;
                      setSitePages((prev) => [
                        ...prev,
                        { id: newId, label: T('ed_page_new_label').replace('{n}', String(prev.length + 1)) },
                      ]);
                      setPageModules((prev) => ({ ...prev, [newId]: [] }));
                      setPageColumns((prev) => ({ ...prev, [newId]: 1 }));
                      setModuleColumns((prev) => ({
                        ...prev,
                        [newId]: { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 },
                      }));
                      setPagesEditorSelectedId(newId);
                      setActiveTab('pages');
                      markDirty();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-brand/50 text-brand hover:bg-brand/10"
                  >
                    {T('ed_pages_bar_add').replace('{n}', String(sitePages.length + 1))}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {inGraceWindow && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm font-semibold text-amber-200">
              {T('ed_grace_banner').replace('{days}', String(graceDaysLeft))}
            </p>
            <a href="/planos" className="text-xs sm:text-sm font-black text-amber-300 underline underline-offset-2 hover:text-amber-200">
              {T('ed_grace_cta')}
            </a>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main panel ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-black text-lg text-[var(--text)]">{T('ed_profile_section')}</h2>
              {monetizationNeedsStripe && !stripePayoutsReady && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs font-bold text-amber-300">{T('ed_stripe_warn_title')}</p>
                  <p className="text-xs text-amber-200/90">{T('ed_stripe_warn_body')}</p>
                </div>
              )}
              {!walletAddr.trim() && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
                  <p className="text-xs font-bold text-[var(--text2)]">{T('ed_wallet_warn_title')}</p>
                  <p className="text-xs text-[var(--text2)]/90">{T('ed_wallet_warn_body')}</p>
                </div>
              )}

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
                        catch { toast.error(T('toast_upload_failed')); }
                        setUploadingAvatar(false);
                      }} />
                  </label>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="label block mb-1">{T('ed_label_display_name')}</label>
                    <input value={siteName} onChange={e => { setSiteName(e.target.value); markDirty(); }}
                      className="input" placeholder={T('ed_ph_display_name')} />
                  </div>
                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        markDirty();
                        toast.success(T('studio_avatar_removed'));
                      }}
                      className="inline-flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg border border-red-500/35 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {T('ed_profile_remove_avatar')}
                    </button>
                  ) : null}
                  <div>
                    <label className="label block mb-1">{T('ed_label_banner')}</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[var(--border)] cursor-pointer hover:border-brand/50 text-sm text-[var(--text2)] transition-all flex-1">
                        {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {bannerUrl ? T('ed_banner_change') : T('ed_banner_upload')}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner}
                          onChange={async e => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setUploadingBanner(true);
                            try { const url = await uploadToStorage(f, 'banners'); setBannerUrl(url); markDirty(); }
                            catch { toast.error(T('toast_upload_failed')); }
                            setUploadingBanner(false);
                          }} />
                      </label>
                      {bannerUrl && (
                        <button onClick={() => { setBannerUrl(''); markDirty(); }}
                          className="text-red-400 hover:opacity-70"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                    {bannerUrl && (
                      <>
                        <div
                          className="w-full max-h-[250px] h-44 rounded-xl mt-2 border border-[var(--border)] overflow-hidden"
                          style={{ background: '#07070a' }}
                        >
                          <img
                            alt=""
                            src={bannerUrl}
                            className="w-full h-full block"
                            style={{
                              objectFit: bannerFit,
                              objectPosition: `${bannerFocusX}% ${bannerFocusY}%`,
                              transform: `scale(${bannerZoom / 100})`,
                              transformOrigin: `${bannerFocusX}% ${bannerFocusY}%`,
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div>
                            <label className="label block mb-1 text-xs">Banner Focus X</label>
                            <input type="range" min={0} max={100} value={bannerFocusX}
                              onChange={e => { setBannerFocusX(Number(e.target.value)); markDirty(); }}
                              className="w-full" />
                          </div>
                          <div>
                            <label className="label block mb-1 text-xs">{T('ed_banner_focus_y')}</label>
                            <input type="range" min={0} max={100} value={bannerFocusY}
                              onChange={e => { setBannerFocusY(Number(e.target.value)); markDirty(); }}
                              className="w-full" />
                          </div>
                          <div>
                            <label className="label block mb-1 text-xs">{T('ed_banner_zoom')}</label>
                            <input type="range" min={50} max={150} value={bannerZoom}
                              onChange={e => { setBannerZoom(Number(e.target.value)); markDirty(); }}
                              className="w-full" />
                          </div>
                          <div>
                            <label className="label block mb-1 text-xs">{T('ed_banner_fit')}</label>
                            <select
                              value={bannerFit}
                              onChange={e => { setBannerFit(e.target.value as 'cover'|'contain'); markDirty(); }}
                              className="input py-1.5 text-xs"
                            >
                              <option value="cover">{T('ed_banner_fit_cover')}</option>
                              <option value="contain">{T('ed_banner_fit_contain')}</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                    {!bannerUrl && (
                      <div className="mt-2 rounded-xl border border-[var(--border)] p-3 bg-[var(--bg2)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--text2)]">{T('ed_banner_placeholder_toggle')}</span>
                          <button onClick={() => { setBannerPlaceholderEnabled(v => !v); markDirty(); }}
                            className={`relative w-10 h-5 rounded-full transition-colors ${bannerPlaceholderEnabled ? 'bg-brand' : 'bg-[var(--border)]'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${bannerPlaceholderEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="color" value={bannerPlaceholderColor}
                            onChange={e => { setBannerPlaceholderColor(e.target.value); markDirty(); }}
                            className="w-8 h-8 rounded border border-[var(--border)] p-0.5" />
                          <input value={bannerPlaceholderColor}
                            onChange={e => { setBannerPlaceholderColor(e.target.value); markDirty(); }}
                            className="input py-1.5 text-xs font-mono"
                            placeholder="#1f2937" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-2">
                <p className="text-sm font-bold text-[var(--text)]">{T('ed_layout_profile_photo_align')}</p>
                <div className="flex flex-wrap gap-2">
                  {(['center', 'left', 'right'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setProfilePhotoAlign(v);
                        markDirty();
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        profilePhotoAlign === v
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)]'
                      }`}
                    >
                      {v === 'center'
                        ? T('ed_layout_profile_photo_center')
                        : v === 'left'
                          ? T('ed_layout_profile_photo_left')
                          : T('ed_layout_profile_photo_right')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label block mb-1">{T('ed_label_bio')}</label>
                <textarea value={bio} onChange={e => { setBio(e.target.value); markDirty(); }}
                  className="input resize-none" rows={3} placeholder={T('ed_ph_bio')} />
              </div>

              <div>
                <label className="label block mb-1">{T('ed_label_username_slug')}</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text2)] flex-shrink-0"></span>
                  <input value={slug} onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')); markDirty(); }}
                    className="input flex-1 font-mono" placeholder={T('ed_ph_slug')} />
                </div>
                {slug && <p className="text-xs text-brand mt-1">✓ {slug}.trustbank.xyz</p>}
                {slug && slug !== site?.slug && !isAdminBypass && isSlugReservedAdminOnly(slug) && (
                  <p className="text-xs text-amber-500 mt-1">{T('err_slug_reserved')}</p>
                )}
                {slug && slug !== site?.slug && (isAdminBypass || !isSlugReservedAdminOnly(slug)) && slugRegistrationDueUsd(slug, isAdminBypass ? 0 : userSlugRegCount) > 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⚡ {slugLengthTierUsd(slug) > 0
                      ? `${T('editor_slug_premium_hint')} $${slugLengthTierUsd(slug)} USD`
                      : `${T('editor_slug_extra_hint')} $${SLUG_EXTRA_REGISTRATION_USD} USD`}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">{T('ed_stripe_section_title')}</p>
                  <p className="text-xs text-[var(--text2)] mt-1">{T('ed_stripe_section_body')}</p>
                </div>
                {stripePayoutsReady ? (
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> {T('ed_stripe_ok')}
                  </p>
                ) : (site as any)?.stripe_connect_account_id ? (
                  <p className="text-xs text-amber-200/90">{T('ed_stripe_pending')}</p>
                ) : (
                  <p className="text-xs text-[var(--text2)]">{T('ed_stripe_none')}</p>
                )}
                <button
                  type="button"
                  disabled={stripeOnboarding || !user || !site?.id}
                  onClick={async () => {
                    if (!site?.id) {
                      toast.error('Salve o mini-site antes de conectar Stripe.');
                      return;
                    }
                    setStripeOnboarding(true);
                    try {
                      const buildHeaders = async () => {
                        const { data: authData } = await supabase.auth.getSession();
                        let token = authData.session?.access_token || '';
                        if (!token) {
                          const refreshed = await supabase.auth.refreshSession();
                          token = refreshed.data.session?.access_token || '';
                        }
                        const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
                        if (token) reqHeaders.Authorization = `Bearer ${token}`;
                        return reqHeaders;
                      };

                      const doRequest = async () => fetch('/api/stripe/connect/onboard', {
                        method: 'POST',
                        headers: await buildHeaders(),
                        body: JSON.stringify({ siteId: site?.id || null }),
                      });

                      let res = await doRequest();
                      if (res.status === 401) {
                        res = await doRequest();
                      }
                      const data = await res.json().catch(() => ({} as { error?: string; url?: string }));
                      if (!res.ok) throw new Error(data.error || T('err_stripe_generic'));
                      if (!data.url) throw new Error(T('err_stripe_generic'));
                      window.location.href = data.url;
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : T('err_stripe_generic'));
                      setStripeOnboarding(false);
                    }
                  }}
                  className="btn-primary w-full justify-center gap-2 text-sm py-2.5"
                  style={{ background: accentColor }}
                >
                  {stripeOnboarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {T('ed_stripe_btn')}
                </button>
              </div>

              <div>
                <label className="label block mb-1">{T('ed_label_polygon')}</label>
                <input value={walletAddr} onChange={e => { setWalletAddr(e.target.value); markDirty(); }}
                  className="input font-mono text-sm" placeholder={T('ed_ph_polygon')} />
              </div>

              <div>
                <label className="label block mb-1">{T('ed_label_contact_email')}</label>
                <input value={contactEmail} onChange={e => { setContactEmail(e.target.value); markDirty(); }}
                  className="input" type="email" placeholder={T('ed_ph_contact_email')} />
              </div>

              <div>
                <label className="label block mb-1">{T('ed_whatsapp_public_label')}</label>
                <input
                  value={contactWhatsapp}
                  onChange={(e) => {
                    setContactWhatsapp(e.target.value);
                    markDirty();
                  }}
                  className="input font-mono text-sm"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={T('ed_whatsapp_public_ph')}
                />
                <p className="text-xs text-[var(--text2)] mt-1">{T('ed_whatsapp_public_hint')}</p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--text)]">{T('ed_ticker_title')}</p>
                  <button onClick={() => { setTickerEnabled(v => !v); markDirty(); }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${tickerEnabled ? 'bg-brand' : 'bg-[var(--border)]'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${tickerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-xs text-[var(--text2)]">{T('ed_ticker_hint')}</p>
                {tickerEnabled && (
                  <div className="space-y-2">
                    {tickerItems.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2">
                        <input
                          value={it.label}
                          onChange={e => {
                            setTickerItems(prev => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x));
                            markDirty();
                          }}
                          className="input col-span-5 py-2 text-xs"
                          placeholder={T('ed_ticker_label_ph')}
                        />
                        <input
                          value={it.url}
                          onChange={e => {
                            setTickerItems(prev => prev.map((x, i) => i === idx ? { ...x, url: e.target.value } : x));
                            markDirty();
                          }}
                          className="input col-span-6 py-2 text-xs"
                          placeholder="https://..."
                        />
                        <button
                          onClick={() => { setTickerItems(prev => prev.filter((_, i) => i !== idx)); markDirty(); }}
                          className="col-span-1 text-red-400 hover:opacity-70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setTickerItems(prev => [...prev, { label: '', url: '' }]); markDirty(); }}
                      className="btn-secondary w-full justify-center text-sm"
                    >
                      <Plus className="w-4 h-4" /> {T('ed_ticker_add')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* THEME */}
          {activeTab === 'theme' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-black text-lg text-[var(--text)]">{T('ed_theme_section_title')}</h2>

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
                      <p style={{ fontSize:9, fontWeight:700, color:t.text, margin:0 }}>{t.emoji} {T(`ed_theme_${t.id}`)}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label className="label block mb-2">{T('ed_accent_color')}</label>
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
                <label className="label block mb-2">{T('ed_photo_size')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    ['sm', 'ed_photo_sz_sm'],
                    ['md', 'ed_photo_sz_md'],
                    ['lg', 'ed_photo_sz_lg'],
                    ['xl', 'ed_photo_sz_xl'],
                  ] as const).map(([v, key]) => (
                    <button key={v} onClick={() => { setPhotoSize(v); markDirty(); }}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all leading-snug ${photoSize===v ? 'bg-brand text-white' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}>{T(key)}</button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text2)] mt-1.5 leading-relaxed">{T('ed_photo_size_layout_hint')}</p>
              </div>

              <div>
                <label className="label block mb-2">{T('ed_photo_shape')}</label>
                <div className="flex gap-2">
                  {([
                    ['round', 'ed_shape_round'],
                    ['square', 'ed_shape_square'],
                    ['rounded', 'ed_shape_rounded'],
                  ] as const).map(([v, key]) => (
                    <button key={v} onClick={() => { setPhotoShape(v); markDirty(); }}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${photoShape===v ? 'bg-brand text-white' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}>{T(key)}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label block mb-2">{T('ed_font_style')}</label>
                <div className="flex gap-2">
                  {([
                    ['sans', 'ed_font_modern'],
                    ['serif', 'ed_font_elegant'],
                    ['mono', 'ed_font_code'],
                  ] as const).map(([v, key]) => (
                    <button key={v} onClick={() => { setFontStyle(v); markDirty(); }}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${fontStyle===v ? 'bg-brand text-white' : 'bg-[var(--bg2)] text-[var(--text2)]'}`}
                      style={{ fontFamily: v==='serif'?'Georgia,serif':v==='mono'?'monospace':'system-ui' }}>{T(key)}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label block mb-2">{T('ed_text_color_override')} <span className="text-[var(--text2)] text-xs font-normal">{T('ed_optional_paren')}</span></label>
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
                  {textColor && <button onClick={() => { setTextColor(''); markDirty(); }} className="text-xs text-brand hover:underline">{T('ed_reset')}</button>}
                </div>
                <p className="text-xs text-[var(--text2)] mt-1">{T('ed_text_color_override_hint')}</p>
              </div>
            </div>
          )}

          {/* LINKS */}
          {activeTab === 'links' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-black text-lg text-[var(--text)]">{T('ed_links_section_title')}</h2>

              <div>
                <label className="label block mb-2">{T('ed_social_network')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(BRAND_COLORS).map(([icon, color]) => (
                    <button key={icon} onClick={() => {
                      setLinkIcon(icon);
                      if (icon !== 'link') setLinkTitle(icon.charAt(0).toUpperCase() + icon.slice(1));
                      if (!linkUrl.trim()) setLinkUrl(SOCIAL_URL_TEMPLATES[icon] || 'https://');
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
                  <label className="label block mb-1">{T('ed_link_title_label')}</label>
                  <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} className="input" placeholder={T('ed_link_title_ph')} />
                </div>
                <div>
                  <label className="label block mb-1">{T('ed_url_label')}</label>
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="input" placeholder={T('ed_ticker_url_ph')} />
                </div>
              </div>

              <div>
                <label className="label block mb-2">{T('ed_button_color')} <span className="text-[var(--text2)] text-xs font-normal">{T('ed_optional_paren')}</span></label>
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
                <Plus className="w-4 h-4" /> {T('ed_add_link')}
              </button>

              {links.length > 0 && (
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <p className="text-xs font-bold text-[var(--text2)] uppercase tracking-wide">{T('ed_links_reorder_hint')}</p>
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
              <h2 className="font-black text-lg text-[var(--text)]">{T('ed_videos_section_title')}</h2>
              <div className="space-y-3">
                <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} className="input" placeholder={T('ed_yt_url_ph')} />
                <input value={ytTitle} onChange={e => setYtTitle(e.target.value)} className="input" placeholder={T('ed_yt_title_ph')} />
                <div className="space-y-2 rounded-xl border border-[var(--border)] p-3 bg-[var(--bg2)]/40">
                  <p className="text-xs font-bold text-[var(--text)]">Preview cover (optional)</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={videoPreviewImageUrl}
                      onChange={e => setVideoPreviewImageUrl(e.target.value)}
                      className="input"
                      placeholder="https://.../cover.jpg"
                    />
                    <label className="px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-xs cursor-pointer">
                      {uploadingVideoCover ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingVideoCover}
                        onChange={async e => {
                          const f = e.target.files?.[0]; if (!f) return;
                          setUploadingVideoCover(true);
                          try {
                            const url = await uploadToStorage(f, 'videos');
                            setVideoPreviewImageUrl(url);
                          } catch {
                            toast.error(T('toast_upload_failed'));
                          } finally {
                            setUploadingVideoCover(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    value={videoPreviewEmbedUrl}
                    onChange={e => setVideoPreviewEmbedUrl(e.target.value)}
                    className="input"
                    placeholder="Preview embed URL (YouTube/Vimeo/Rumble) optional"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-[var(--bg2)] rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{T('ed_paywall_title')}</p>
                    <p className="text-xs text-[var(--text2)]">{T('ed_paywall_hint')}</p>
                  </div>
                  <button onClick={() => setPaywallEnabled(p => !p)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${paywallEnabled ? 'bg-brand' : 'bg-[var(--border)]'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${paywallEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {paywallEnabled && (
                  <div>
                    <label className="label block mb-1">{T('ed_price_usdc')}</label>
                    <input value={paywallPrice} onChange={e => setPaywallPrice(e.target.value)} className="input" type="number" step="0.01" min="0.5" />
                  </div>
                )}
                <button onClick={addVideo} disabled={!ytUrl} className="btn-primary w-full justify-center gap-2">
                  <Plus className="w-4 h-4" /> {T('ed_add_video')}
                </button>
              </div>
              {videos.length > 0 && (
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  {videos.map(v => (
                    <div key={v.id} className="flex items-center gap-3 p-3 bg-[var(--bg2)] rounded-xl">
                      <img
                        src={v.preview_image_url || `https://img.youtube.com/vi/${v.youtube_video_id}/default.jpg`}
                        className="w-14 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text)] truncate">{v.title}</p>
                        {v.paywall_enabled && <p className="text-xs text-amber-400">🔒 ${v.paywall_price} USD</p>}
                        {v.preview_embed_url && <p className="text-[10px] text-[var(--text2)] truncate">Preview embed configured</p>}
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
            <div className="card p-2 overflow-hidden">
              <CVEditor
                data={{
                  show_cv: showCv,
                  cv_free: cvFree,
                  cv_contact_locked: cvContactLocked,
                  cv_price: parseFloat(cvPrice) || PLATFORM_USD.cvUnlockDefault,
                  cv_headline: cvHeadline,
                  cv_location: cvLocation,
                  cv_content: cvContent,
                  cv_skills: cvSkills.split(',').map(s => s.trim()).filter(Boolean),
                  cv_experience: cvExperience,
                  cv_education: cvEducation,
                  cv_projects: cvProjects,
                  cv_languages: cvLanguages,
                  cv_certificates: cvCertificates,
                  contact_email: contactEmail,
                  cv_contact_whatsapp: cvContactWhatsapp,
                  cv_hire_price: cvHirePrice,
                  cv_hire_currency: cvHireCurrency,
                  cv_hire_type: cvHireType,
                  section_order: sectionOrder as any,
                } as CVData}
                onChange={(d) => {
                  if (typeof d.show_cv === 'boolean') setShowCv(d.show_cv);
                  if (typeof d.cv_free === 'boolean') setCvFree(d.cv_free);
                  if (typeof d.cv_contact_locked === 'boolean') setCvContactLocked(d.cv_contact_locked);
                  if (typeof d.cv_price === 'number') setCvPrice(String(d.cv_price));
                  if (typeof d.cv_headline === 'string') setCvHeadline(d.cv_headline);
                  if (typeof d.cv_location === 'string') setCvLocation(d.cv_location);
                  if (typeof d.cv_content === 'string') setCvContent(d.cv_content);
                  if (Array.isArray(d.cv_skills)) setCvSkills(d.cv_skills.join(', '));
                  if (Array.isArray(d.cv_experience)) setCvExperience(d.cv_experience);
                  if (Array.isArray(d.cv_education)) setCvEducation(d.cv_education);
                  if (Array.isArray(d.cv_projects)) setCvProjects(d.cv_projects);
                  if (Array.isArray(d.cv_languages)) setCvLanguages(d.cv_languages);
                  if (Array.isArray(d.cv_certificates)) setCvCertificates(d.cv_certificates);
                  if (typeof d.contact_email === 'string') setContactEmail(d.contact_email);
                  if (typeof d.cv_contact_whatsapp === 'string') setCvContactWhatsapp(d.cv_contact_whatsapp);
                  if (typeof d.cv_hire_price === 'number') setCvHirePrice(d.cv_hire_price);
                  if (typeof d.cv_hire_currency === 'string') setCvHireCurrency(d.cv_hire_currency);
                  if (typeof d.cv_hire_type === 'string') setCvHireType(d.cv_hire_type);
                  if (Array.isArray(d.section_order)) setSectionOrder(d.section_order);
                  markDirty();
                }}
                onSave={async () => { await handleSave(); }}
                saving={saving}
              />
            </div>
          )}

          {/* FEED */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-4">{T('ed_feed_settings_title')}</h2>
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-sm font-bold text-[var(--text)]">{T('ed_feed_show_title')}</p>
                    <p className="text-xs text-[var(--text2)]">{T('ed_feed_show_hint')}</p></div>
                  <button onClick={() => { setShowFeed(p=>!p); markDirty(); }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${showFeed ? 'bg-brand' : 'bg-[var(--border)]'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${showFeed ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {showFeed && (
                  <div>
                    <label className="label block mb-2">{T('ed_feed_columns')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([1,2,3] as const).map(n => (
                        <button key={n} onClick={() => { setFeedCols(n); markDirty(); }}
                          className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${feedCols===n ? 'border-brand bg-brand/10 text-brand' : 'border-[var(--border)] text-[var(--text2)]'}`}>
                          {n === 1 ? T('ed_feed_1col') : n === 2 ? T('ed_feed_2col') : T('ed_feed_3col')}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed">{T('ed_feed_layout_hint')}</p>
                  </div>
                )}
              </div>

              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-1">{T('ed_sponsor_dir_title')}</h2>
                <p className="text-xs text-[var(--text2)] mb-4">
                  {T('ed_sponsor_dir_hint')}
                </p>
                {site?.id && user?.id ? (
                  <button
                    type="button"
                    onClick={() => setScriptsAdsDialogOpen(true)}
                    className="mb-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {T('ed_open_scripts_ads_dialog')}
                  </button>
                ) : null}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-bold text-[var(--text2)]">{T('ed_min_price_week')}</label>
                      {editorIaApiEnabled ? (
                        <button
                          type="button"
                          disabled={suggestingPrice || !site?.id}
                          onClick={() => void runSuggestAdPrice()}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-brand/40 text-brand hover:bg-brand/10 disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {suggestingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          {T('ed_suggest_pricing')}
                        </button>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={adAskingPrice}
                      onChange={e => { setAdAskingPrice(e.target.value); markDirty(); }}
                      className="input w-full mt-1"
                      placeholder={T('ed_price_placeholder')}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={adShowPricePublic}
                      onChange={e => { setAdShowPricePublic(e.target.checked); markDirty(); }}
                    />
                    {T('ed_show_price_public')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-[var(--text2)]">{T('ed_directory_profile_type')}</label>
                      <select
                        value={directoryProfileSlug}
                        onChange={e => { setDirectoryProfileSlug(e.target.value); markDirty(); }}
                        className="input w-full mt-1"
                      >
                        <option value="">—</option>
                        <option value="creator">{T('sites_prof_creator')}</option>
                        <option value="influencer">{T('sites_prof_influencer')}</option>
                        <option value="actor">{T('sites_prof_actor')}</option>
                        <option value="actress">{T('sites_prof_actress')}</option>
                        <option value="athlete">{T('sites_prof_athlete')}</option>
                        <option value="entrepreneur">{T('sites_prof_entrepreneur')}</option>
                        <option value="automotive">{T('sites_prof_automotive')}</option>
                        <option value="services">{T('sites_prof_services')}</option>
                        <option value="other">{T('sites_prof_other')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text2)]">{T('ed_site_category_label')}</label>
                      <select
                        value={siteCategorySlug}
                        onChange={e => { setSiteCategorySlug(e.target.value); markDirty(); }}
                        className="input w-full mt-1"
                      >
                        <option value="">—</option>
                        <option value="creator">{T('sites_cat_creator')}</option>
                        <option value="services">{T('sites_cat_services')}</option>
                        <option value="tech">{T('sites_cat_tech')}</option>
                        <option value="business">{T('sites_cat_business')}</option>
                        <option value="local">{T('sites_cat_local')}</option>
                        <option value="other">{T('sites_cat_other')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-1">{T('ed_module_order_title')}</h2>
                <p className="text-xs text-[var(--text2)] mb-4">{T('ed_module_order_hint')}</p>
                <div className="space-y-2">
                  {moduleOrder.map((mod, idx) => {
                    const labels: Record<string,string> = {
                      pages: `📑 ${modLab.pages}`,
                      links: '🔗 Links',
                      videos: `🎬 ${modLab.videos}`,
                      cv: '📄 CV',
                      feed: '📝 Feed',
                      ads: '📣 Ads',
                      mystic: `🔮 ${modLab.mystic}`,
                      slug_market: '🏷️ Slugs',
                      classified: `🚗 ${modLab.classified}`,
                      booking: `📅 ${modLab.booking}`,
                    };
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
                          const normalized = normalizeModuleList(next);
                          setModuleOrder(normalized);
                          setPageModules((prev) => ({ ...prev, home: normalized }));
                          setDragOverMod(null);
                          markDirty();
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-grab transition-all ${dragOverMod===mod ? 'border-brand bg-brand/5' : 'border-[var(--border)] bg-[var(--bg2)]'}`}>
                        <GripVertical className="w-4 h-4 text-[var(--text2)]" />
                        <span className="text-sm font-bold text-[var(--text)]">{labels[mod] ?? modLab[mod as keyof typeof modLab] ?? mod}</span>
                        <span className="text-xs text-[var(--text2)] ml-auto">#{idx+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-3">{T('ed_feed_existing')}</h2>
                {feedPosts.length === 0 ? (
                  <p className="text-sm text-[var(--text2)]">{T('ed_feed_empty')}</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {feedPosts.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text)] truncate">{p.text || '(media post)'}</p>
                          <p className="text-xs text-[var(--text2)]">{new Date(p.created_at).toLocaleString('en-US')}</p>
                        </div>
                        <button
                          onClick={async () => {
                            await (supabase as any).from('feed_posts').delete().eq('id', p.id).eq('site_id', site?.id);
                            setFeedPosts(prev => prev.filter(x => x.id !== p.id));
                            toast.success(T('toast_post_deleted'));
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400"
                        >
                          {T('ed_feed_delete_post')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}


          {/* PAGES TAB */}
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="font-black text-base text-[var(--text)] mb-1">{T('ed_site_pages_title')}</h2>
                <p className="text-xs text-[var(--text2)] mb-4">{T('ed_site_pages_blurb')}</p>
                <p className="text-xs font-bold text-[var(--text)] mb-2">{T('ed_pages_select_hint')}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {sitePages.map((page, idx) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setPagesEditorSelectedId(page.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        pagesEditorSelectedId === page.id
                          ? 'border-brand bg-brand text-white'
                          : 'border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
                      }`}
                    >
                      {idx === 0 ? T('ed_page_name_home_ph') : (page.label?.trim() || T('ed_page_new_label').replace('{n}', String(idx + 1)))}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 mb-3">
                  {sitePages.map((page, idx) => (
                    <div key={page.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand/10 flex items-center justify-center text-xs font-black text-brand">{idx + 1}</div>
                      <input
                        value={page.label}
                        onChange={(e) => {
                          setSitePages((prev) => prev.map((p) => (p.id === page.id ? { ...p, label: e.target.value } : p)));
                          markDirty();
                        }}
                        className="input flex-1 py-1.5 text-sm"
                        placeholder={idx === 0 ? T('ed_page_name_home_ph') : T('ed_page_name_n_ph').replace('{n}', String(idx + 1))}
                      />
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const removedId = page.id;
                            setSitePages((prev) => prev.filter((p) => p.id !== page.id));
                            setPageContents((prev) => {
                              const next = { ...prev };
                              delete next[page.id];
                              return next;
                            });
                            setPageModules((prev) => {
                              const next = { ...prev };
                              delete next[page.id];
                              return next;
                            });
                            setPageColumns((prev) => {
                              const next = { ...prev };
                              delete next[page.id];
                              return next;
                            });
                            setModuleColumns((prev) => {
                              const next = { ...prev };
                              delete next[page.id];
                              return next;
                            });
                            if (pagesEditorSelectedId === removedId) setPagesEditorSelectedId('home');
                            markDirty();
                          }}
                          className="text-red-400 hover:opacity-70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {sitePages.map((page) => (
                    <div key={`${page.id}_template`} className="grid grid-cols-2 gap-2">
                      <span className="text-xs text-[var(--text2)] self-center">{T('ed_page_template_row').replace('{label}', page.label)}</span>
                      <select
                        className="input py-1.5 text-sm"
                        value={page.template || 'default'}
                        onChange={(e) => {
                          const template = e.target.value as 'default' | 'videos_3' | 'videos_4';
                          setSitePages((prev) => prev.map((p) => (p.id === page.id ? { ...p, template } : p)));
                          markDirty();
                        }}
                      >
                        <option value="default">{T('ed_template_default')}</option>
                        <option value="videos_3">{T('ed_template_videos_3')}</option>
                        <option value="videos_4">{T('ed_template_videos_4')}</option>
                      </select>
                    </div>
                  ))}
                </div>
                {sitePages.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `p_${Date.now()}`;
                      setSitePages((prev) => [...prev, { id: newId, label: T('ed_page_new_label').replace('{n}', String(prev.length + 1)) }]);
                      setPageModules((prev) => ({ ...prev, [newId]: [] }));
                      setPageColumns((prev) => ({ ...prev, [newId]: 1 }));
                      setModuleColumns((prev) => ({
                        ...prev,
                        [newId]: { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 },
                      }));
                      setPagesEditorSelectedId(newId);
                      markDirty();
                    }}
                    className="btn-secondary w-full justify-center text-sm mt-3"
                  >
                    <Plus className="w-4 h-4" /> {T('ed_add_page')}
                  </button>
                )}
              </div>
              {sitePages
                .filter((p) => p.id === pagesEditorSelectedId)
                .map((page) => (
                  <div key={page.id} className="card p-5 mt-3">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="font-black text-sm text-[var(--text)]">✏️ {T('ed_content_heading').replace('{label}', page.label)}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          if (!clearAllArmed[page.id]) {
                            setClearAllArmed((prev) => ({ ...prev, [page.id]: true }));
                            setTimeout(() => setClearAllArmed((prev) => ({ ...prev, [page.id]: false })), 4000);
                            return;
                          }
                          setPageContents((prev) => ({ ...prev, [page.id]: '' }));
                          setClearAllArmed((prev) => ({ ...prev, [page.id]: false }));
                          markDirty();
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${clearAllArmed[page.id] ? 'border-red-500/50 text-red-400' : 'border-[var(--border)] text-[var(--text2)]'}`}
                      >
                        {clearAllArmed[page.id] ? T('ed_clear_all_confirm') : T('ed_clear_all')}
                      </button>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-[var(--text2)] font-bold mb-2">{T('ed_modules_on_page')}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-[var(--text2)]">{T('ed_columns')}</span>
                        <select
                          value={pageColumns[page.id] || 1}
                          onChange={(e) => {
                            const cols = Number(e.target.value) as 1 | 2 | 3;
                            setPageColumns((prev) => ({ ...prev, [page.id]: cols }));
                            markDirty();
                          }}
                          className="input py-1 text-xs max-w-[160px]"
                        >
                          <option value={1}>{T('ed_col_option_1')}</option>
                          <option value={2}>{T('ed_col_option_2')}</option>
                          <option value={3}>{T('ed_col_option_3')}</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            'pages',
                            'links',
                            'videos',
                            'cv',
                            'feed',
                            'ads',
                            'mystic',
                            'slug_market',
                            'classified',
                            'booking',
                          ] as const
                        ).map((mod) => {
                          const currentModules = pageModules[page.id] || (page.id === 'home' ? moduleOrder : []);
                          const enabled = currentModules.includes(mod);
                          return (
                            <div key={mod} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const current = pageModules[page.id] || (page.id === 'home' ? moduleOrder : []);
                                  const next = enabled ? current.filter((m) => m !== mod) : [...current, mod];
                                  const final = page.id === 'home' ? normalizeModuleList(next) : next;
                                  setPageModules((prev) => ({ ...prev, [page.id]: final }));
                                  if (page.id === 'home') setModuleOrder(final);
                                  markDirty();
                                }}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${enabled ? 'border-brand text-brand bg-brand/10' : 'border-[var(--border)] text-[var(--text2)]'}`}
                              >
                                {modLab[mod] || mod.toUpperCase()}
                              </button>
                              {(pageColumns[page.id] || 1) > 1 && (
                                <select
                                  value={moduleColumns[page.id]?.[mod] || 1}
                                  onChange={(e) => {
                                    const col = Number(e.target.value) as 1 | 2 | 3;
                                    setModuleColumns((prev) => ({
                                      ...prev,
                                      [page.id]: {
                                        ...(prev[page.id] || { pages: 1, links: 1, videos: 1, cv: 1, feed: 1, ads: 1, mystic: 1, slug_market: 1, classified: 1, booking: 1 }),
                                        [mod]: col,
                                      },
                                    }));
                                    markDirty();
                                  }}
                                  className="input py-1 text-xs min-w-[6.5rem]"
                                >
                                  <option value={1}>{T('ed_module_col_1')}</option>
                                  <option value={2}>{T('ed_module_col_2')}</option>
                                  <option value={3}>{T('ed_module_col_3')}</option>
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs text-[var(--text2)] font-bold whitespace-nowrap">{T('ed_width')}</span>
                      <input
                        type="range"
                        min={320}
                        max={1010}
                        value={Math.min(1010, pageWidth)}
                        onChange={(e) => {
                          setPageWidth(Math.min(1010, Number(e.target.value)));
                          markDirty();
                        }}
                        className="flex-1"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span className="text-xs text-[var(--text2)] font-mono w-14">{pageWidth}px</span>
                    </div>
                    <PageRichEditor
                      key={page.id}
                      editorKey={page.id}
                      value={pageContents[page.id] || ''}
                      onChange={(v: string) => {
                        setPageContents((prev) => ({ ...prev, [page.id]: v }));
                        markDirty();
                      }}
                      placeholder={T('ed_richtext_ph').replace('{label}', page.label)}
                    />
                    <p className="text-xs text-[var(--text2)] mt-2">{T('ed_page_visitor_note').replace('{label}', page.label)}</p>
                  </div>
                ))}
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="card p-6 space-y-5">
              <div>
                <h2 className="font-black text-lg text-[var(--text)]">{T('ed_seo_panel_title')}</h2>
                <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed border-l-2 border-brand/50 pl-3 py-0.5">
                  {T('ed_seo_pro_tip')}
                </p>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="label block mb-0">{T('ed_seo_meta_title')}</label>
                  <button
                    type="button"
                    onClick={() => {
                      setSeoTitle(buildDefaultSeoTitle(slug, siteName));
                      markDirty();
                    }}
                    disabled={!slug.trim()}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-brand/40 text-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {T('ed_seo_suggest_slug')}
                  </button>
                </div>
                <input
                  value={seoTitle}
                  onChange={(e) => {
                    setSeoTitle(e.target.value.slice(0, 70));
                    markDirty();
                  }}
                  className="input"
                  maxLength={70}
                  placeholder={T('ed_seo_ph_title')}
                />
                <SeoTrafficMeter length={seoTitle.length} max={70} idealMax={60} minComfort={12} />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="label block mb-0">{T('ed_seo_meta_desc')}</label>
                  {editorIaApiEnabled ? (
                    <button
                      type="button"
                      onClick={() => void runMagicDescription()}
                      disabled={magicDescLoading || !site?.id}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-violet-500/50 text-violet-300 hover:bg-violet-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                    >
                      {magicDescLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                      {magicDescLoading ? T('ed_seo_magic_write_busy') : T('ed_seo_magic_write')}
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={seoDescription}
                  onChange={(e) => {
                    setSeoDescription(e.target.value.slice(0, 160));
                    markDirty();
                  }}
                  className="input resize-none"
                  rows={4}
                  maxLength={160}
                  placeholder={T('ed_seo_ph_desc')}
                />
                <SeoTrafficMeter length={seoDescription.length} max={160} idealMax={140} minComfort={40} />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="label block mb-0">{T('ed_seo_search_tags_label')}</label>
                  {editorIaApiEnabled ? (
                    <button
                      type="button"
                      onClick={() => void runSuggestSearchTags()}
                      disabled={suggestTagsLoading || !site?.id}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-brand/40 text-brand hover:bg-brand/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                    >
                      {suggestTagsLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      {suggestTagsLoading ? T('ed_seo_suggest_keywords_busy') : T('ed_seo_suggest_keywords')}
                    </button>
                  ) : null}
                </div>
                {editorIaApiEnabled ? (
                  <div className="flex flex-wrap justify-end gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => void runSeoPack()}
                      disabled={seoPackLoading || !site?.id || !slug.trim()}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                    >
                      {seoPackLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                      {seoPackLoading ? T('ed_seo_pack_busy') : T('ed_seo_pack_btn')}
                    </button>
                  </div>
                ) : null}
                <p className="text-[11px] text-[var(--text2)] mb-2 leading-relaxed">{T('ed_seo_search_tags_hint')}</p>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                  {seoSearchTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-lg text-[11px] font-semibold bg-[var(--bg2)] border border-[var(--border)] text-[var(--text)]"
                    >
                      {t}
                      <button
                        type="button"
                        className="p-0.5 rounded hover:bg-white/10 text-[var(--text2)]"
                        aria-label={T('ed_seo_remove_tag')}
                        onClick={() => {
                          setSeoSearchTags((prev) => prev.filter((x) => x !== t));
                          markDirty();
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={seoTagDraft}
                  onChange={(e) => setSeoTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const t = seoTagDraft.trim();
                    if (!t || seoSearchTags.includes(t) || seoSearchTags.length >= 16) return;
                    if (t.length > 48) return;
                    setSeoSearchTags([...seoSearchTags, t]);
                    setSeoTagDraft('');
                    markDirty();
                  }}
                  className="input"
                  placeholder={T('ed_seo_tag_input_ph')}
                  maxLength={48}
                />
              </div>
              <div>
                <label className="label block mb-1">{T('ed_seo_json_ld_label')}</label>
                <p className="text-[11px] text-[var(--text2)] mb-2 leading-relaxed">{T('ed_seo_json_ld_hint')}</p>
                <textarea
                  value={seoJsonLd}
                  onChange={(e) => {
                    setSeoJsonLd(e.target.value);
                    markDirty();
                  }}
                  className="input resize-none font-mono text-xs leading-relaxed"
                  rows={8}
                  spellCheck={false}
                  placeholder={T('ed_seo_json_ld_ph')}
                />
              </div>
              <div>
                <label className="label block mb-1">{T('ed_seo_og_label')}</label>
                <input
                  value={seoOgImage}
                  onChange={(e) => {
                    setSeoOgImage(e.target.value);
                    markDirty();
                  }}
                  className="input"
                  placeholder={T('ed_seo_og_ph')}
                />
                <p className="text-[11px] text-[var(--text2)] mt-2 leading-relaxed">{T('ed_seo_og_auto_hint')}</p>
                {slug.trim() ? (
                  <div className="mt-3 rounded-xl border border-[var(--border)] overflow-hidden max-w-lg bg-[var(--bg2)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/og/site?slug=${encodeURIComponent(slug.trim())}`}
                      alt=""
                      className="w-full h-auto block"
                      width={1200}
                      height={630}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {activeTab === 'ia' && (
            <div className="space-y-6">
          {site?.id && user?.id ? (
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/12 to-[var(--bg2)] px-4 py-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-[var(--text)]">{T('ed_ia_master_title')}</h3>
                  <p className="text-xs text-[var(--text2)] mt-1.5 leading-relaxed max-w-2xl">{T('ed_ia_master_sub')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editorIaApiEnabled}
                  onClick={() => setEditorIaApiEnabledPersist(!editorIaApiEnabled)}
                  className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
                    editorIaApiEnabled ? 'bg-emerald-500' : 'bg-[var(--border)]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      editorIaApiEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {!editorIaApiEnabled ? (
                <p className="text-xs font-semibold text-amber-400/95 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  {T('ed_ia_genesis_hidden_note')}
                </p>
              ) : null}
            </div>
          ) : null}
          {site?.id && user?.id ? (
            <div className="rounded-2xl border-2 border-violet-500/45 bg-gradient-to-br from-violet-500/15 to-[var(--bg2)] px-4 py-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-[var(--text)] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-violet-400 shrink-0" />
                    {T('ed_lively_public_master_title')}
                  </h3>
                  <p className="text-xs text-[var(--text2)] mt-1.5 leading-relaxed max-w-2xl">
                    {T('ed_lively_public_master_sub')}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={livelyAvatarEnabled}
                  onClick={() => {
                    setLivelyAvatarEnabled(!livelyAvatarEnabled);
                    markDirty();
                  }}
                  className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
                    livelyAvatarEnabled ? 'bg-violet-500' : 'bg-[var(--border)]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      livelyAvatarEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {!livelyAvatarEnabled ? (
                <p className="text-xs font-semibold text-amber-400/95 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  {T('ed_lively_public_off_note')}
                </p>
              ) : null}
            </div>
          ) : null}
          {site?.id && user?.id ? (
            <div className="rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-500/10 to-transparent px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--text2)] leading-relaxed max-w-xl">
                {T('ed_dialog_scripts_intro')}
              </p>
              <button
                type="button"
                onClick={() => setScriptsAdsDialogOpen(true)}
                className="inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-brand hover:opacity-90 shadow-lg border border-white/10"
              >
                <MessageCircle className="w-4 h-4" />
                <Megaphone className="w-4 h-4 opacity-90" />
                {T('ed_open_scripts_ads_dialog')}
              </button>
            </div>
          ) : null}
          {site?.id && user?.id ? (
            <CreatorStudioPanel
              avatarUrl={avatarUrl}
              setAvatarUrl={setAvatarUrl}
              livelyAvatarWelcome={livelyAvatarWelcome}
              setLivelyAvatarWelcome={setLivelyAvatarWelcome}
              livelyAgentInstructions={livelyAgentInstructions}
              setLivelyAgentInstructions={setLivelyAgentInstructions}
              uploadToStorage={uploadToStorage}
              onMarkDirty={markDirty}
              T={T}
              previewSlug={site?.slug}
              accentColor={accentColor}
            />
          ) : null}
          {site?.id && user?.id ? (
            <AvatarCharacterInspirationPanel
              T={T}
              onAppendInstructions={(line) => {
                setLivelyAgentInstructions((prev) => `${prev.trim() ? `${prev.trim()}\n` : ''}${line}`.slice(0, 2000));
                markDirty();
              }}
            />
          ) : null}
          {site?.id && user?.id ? (
            <div className="card p-6 space-y-3 border border-amber-500/20 bg-amber-500/[0.04]">
              <h3 className="font-black text-sm text-[var(--text)]">{T('ed_avatar_sponsored_title')}</h3>
              <p className="text-xs text-[var(--text2)] leading-relaxed">{T('ed_avatar_sponsored_body')}</p>
            </div>
          ) : null}
          {site?.id && user?.id && (
            <div className="card p-6 space-y-5 border border-violet-500/25 bg-violet-500/[0.04]">
              <h2 className="font-black text-lg text-[var(--text)] flex items-center gap-2">
                <Cpu className="w-5 h-5 text-violet-400" /> {T('ed_ia_profile_title')}
              </h2>
              <p className="text-xs text-[var(--text2)] leading-relaxed">{T('ed_ia_profile_intro')}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={livelyProfileAsAvatar}
                  onChange={(e) => {
                    setLivelyProfileAsAvatar(e.target.checked);
                    markDirty();
                  }}
                  className="rounded border-[var(--border)] w-4 h-4"
                />
                <span className="text-sm font-semibold text-[var(--text)]">{T('ed_ia_as_avatar')}</span>
              </label>
              <p className="text-[11px] text-[var(--text2)] pl-7 -mt-2">{T('ed_ia_photo_hint')}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={livelyProfileSpeakOnEntry}
                  onChange={(e) => {
                    setLivelyProfileSpeakOnEntry(e.target.checked);
                    markDirty();
                  }}
                  disabled={!livelyProfileAsAvatar}
                  className="rounded border-[var(--border)] w-4 h-4 disabled:opacity-40"
                />
                <span className="text-sm font-semibold text-[var(--text)]">{T('ed_ia_speak_entry')}</span>
              </label>
              <div>
                <label className="label block mb-1">{T('ed_ia_speech_tap')}</label>
                <textarea
                  value={livelyProfileSpeechTap}
                  onChange={(e) => {
                    setLivelyProfileSpeechTap(e.target.value.slice(0, 400));
                    markDirty();
                  }}
                  disabled={!livelyProfileAsAvatar}
                  className="input resize-none text-sm disabled:opacity-40"
                  rows={2}
                  placeholder={T('ed_ia_speech_tap_ph')}
                />
              </div>
              <div>
                <label className="label block mb-1">{T('ed_ia_speech_before_reply')}</label>
                <textarea
                  value={livelyProfileSpeechBeforeReply}
                  onChange={(e) => {
                    setLivelyProfileSpeechBeforeReply(e.target.value.slice(0, 400));
                    markDirty();
                  }}
                  className="input resize-none text-sm"
                  rows={2}
                  placeholder={T('ed_ia_speech_before_reply_ph')}
                />
              </div>
            </div>
          )}

            <div className="card p-6 space-y-5">
              <div>
                <h2 className="font-black text-lg text-[var(--text)]">{T('ed_lively_title')}</h2>
                <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed border-l-2 border-violet-500/40 pl-3 py-0.5">
                  {T('ed_lively_intro')}
                </p>
                <p className="text-[11px] text-violet-400/90 mt-2 font-semibold">
                  {T('ed_lively_enable_hint_top')}
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={livelyCentralMagic}
                  onChange={(e) => {
                    setLivelyCentralMagic(e.target.checked);
                    markDirty();
                  }}
                  className="rounded border-[var(--border)] w-4 h-4"
                />
                <span className="text-sm font-semibold text-[var(--text)]">{T('ed_lively_central_magic')}</span>
              </label>
              <p className="text-xs text-[var(--text2)] leading-relaxed rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 mb-2">
                {T('ed_lively_floating_profile_hint')}
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={livelyFloatingExpressive}
                  onChange={(e) => {
                    setLivelyFloatingExpressive(e.target.checked);
                    markDirty();
                  }}
                  className="rounded border-[var(--border)] w-4 h-4"
                />
                <span className="text-sm font-semibold text-[var(--text)]">{T('ed_lively_expressive_gestures')}</span>
              </label>
              <p className="text-[10px] text-[var(--text2)] pl-7 -mt-2 mb-1">{T('ed_lively_expressive_gestures_hint')}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={livelyDualAgent}
                  onChange={(e) => {
                    setLivelyDualAgent(e.target.checked);
                    markDirty();
                  }}
                  className="rounded border-[var(--border)] w-4 h-4"
                />
                <span className="text-sm font-semibold text-[var(--text)]">{T('ed_lively_dual')}</span>
              </label>
              <div>
                <label className="label block mb-1">{T('ed_lively_model')}</label>
                <select
                  value={livelyAvatarModel}
                  onChange={(e) => {
                    setLivelyAvatarModel(e.target.value);
                    markDirty();
                  }}
                  className="input"
                >
                  {LIVELY_AVATAR_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {String(lang).startsWith('en') ? m.label.en : m.label.pt}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--text2)] mt-1">{T('ed_lively_model_hint')}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="label block mb-0">{T('ed_lively_welcome')}</label>
                  {editorIaApiEnabled ? (
                    <button
                      type="button"
                      disabled={livelySuggestWelcomeBusy || !site?.slug}
                      onClick={() => void runSuggestLivelyWelcome()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg2)] hover:bg-[var(--bg3)] disabled:opacity-40"
                    >
                      {livelySuggestWelcomeBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      {T('ed_lively_suggest_welcome')}
                    </button>
                  ) : null}
                </div>
                <textarea
                  value={livelyAvatarWelcome}
                  onChange={(e) => {
                    setLivelyAvatarWelcome(e.target.value.slice(0, 500));
                    markDirty();
                  }}
                  className="input resize-none"
                  rows={3}
                  placeholder={T('ed_lively_welcome_ph')}
                />
                <p className="text-[10px] text-[var(--text2)] mt-1">{T('ed_lively_suggest_hint')}</p>
              </div>
              <div>
                <label className="label block mb-1">{T('ed_lively_instructions')}</label>
                <textarea
                  value={livelyAgentInstructions}
                  onChange={(e) => {
                    setLivelyAgentInstructions(e.target.value.slice(0, 2000));
                    markDirty();
                  }}
                  className="input resize-none font-mono text-xs"
                  rows={4}
                  placeholder={T('ed_lively_instructions_ph')}
                />
                <p className="text-[10px] text-[var(--text2)] mt-1 leading-relaxed">{T('ed_lively_assistant_behavior_hint')}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-1">{T('ed_lively_eleven_owner')}</label>
                  <input
                    value={livelyElevenOwner}
                    onChange={(e) => {
                      setLivelyElevenOwner(e.target.value);
                      markDirty();
                    }}
                    className="input font-mono text-xs"
                    placeholder="voice_id"
                  />
                </div>
                <div>
                  <label className="label block mb-1">{T('ed_lively_eleven_agent')}</label>
                  <input
                    value={livelyElevenAgent}
                    onChange={(e) => {
                      setLivelyElevenAgent(e.target.value);
                      markDirty();
                    }}
                    className="input font-mono text-xs"
                    placeholder="voice_id"
                  />
                </div>
              </div>
              <div>
                <label className="label block mb-1">{T('ed_lively_tts_provider')}</label>
                <select
                  value={livelyTtsProvider}
                  onChange={(e) => {
                    setLivelyTtsProvider(e.target.value as LivelyTtsProvider);
                    markDirty();
                  }}
                  className="input text-sm max-w-md"
                >
                  <option value="auto">{T('ed_lively_tts_auto')}</option>
                  <option value="openai">{T('ed_lively_tts_openai')}</option>
                  <option value="elevenlabs">{T('ed_lively_tts_eleven')}</option>
                </select>
                <p className="text-[10px] text-[var(--text2)] mt-1 leading-relaxed">{T('ed_lively_tts_hint')}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 p-4 space-y-3 bg-emerald-500/[0.06]">
                <div className="flex items-start gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-[var(--text)]">{T('ed_byok_title')}</p>
                    <p className="text-xs text-[var(--text2)] leading-relaxed">{T('ed_byok_intro')}</p>
                  </div>
                </div>
                <a
                  href="https://platform.deepseek.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline"
                >
                  {T('ed_byok_open_console')}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-[11px] font-semibold text-[var(--text2)]">
                  {byokDeepseekConfigured === true
                    ? T('ed_byok_status_on')
                    : byokDeepseekConfigured === false
                      ? T('ed_byok_status_off')
                      : '…'}
                </p>
                <label className="label block">{T('ed_byok_field_label')}</label>
                <input
                  type="password"
                  autoComplete="off"
                  value={byokDeepseekKeyDraft}
                  onChange={(e) => setByokDeepseekKeyDraft(e.target.value)}
                  className="input font-mono text-xs"
                  placeholder="sk-…"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveByokDeepseek()}
                    disabled={byokDeepseekSaving}
                    className="btn-primary text-sm gap-2"
                  >
                    {byokDeepseekSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {T('ed_byok_save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeByokDeepseek()}
                    disabled={byokDeepseekSaving || !byokDeepseekConfigured}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)] disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                    {T('ed_byok_remove')}
                  </button>
                </div>
                <div className="pt-1">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
                    <span className="text-xs text-[var(--text2)]">
                      Use my DeepSeek key for live assistant replies
                    </span>
                    <input
                      type="checkbox"
                      checked={livelyUseDeepseekByok}
                      onChange={(e) => {
                        setLivelyUseDeepseekByok(e.target.checked);
                        markDirty();
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-2 bg-[var(--bg2)]/40">
                <p className="text-sm font-bold text-[var(--text)]">{T('ed_lively_credits_title')}</p>
                <p className="text-xs text-[var(--text2)] leading-relaxed">{T('ed_lively_credits_hint')}</p>
                <p className="text-lg font-black text-brand tabular-nums flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span>
                    US${iaBudget.freeUsd.toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-[var(--text2)]">{T('ed_identity_ia_free_label')}</span>
                  </span>
                  <span className="text-[var(--text2)] text-sm">·</span>
                  <span>
                    US${iaBudget.paidUsd.toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-[var(--text2)]">{T('ed_identity_ia_paid_label')}</span>
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--bg2)]/50">
                <p className="text-sm font-bold text-[var(--text)]">{T('ed_lively_nft_title')}</p>
                <p className="text-xs text-[var(--text2)] leading-relaxed">{T('ed_lively_nft_body')}</p>
                {(site as any)?.lively_avatar_nft_verified_at ? (
                  <p className="text-xs font-bold text-green-400">{T('ed_lively_nft_verified_at')}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void runVerifyLivelyNft()}
                    disabled={livelyNftVerifyLoading}
                    className="btn-primary gap-2 text-sm"
                  >
                    {livelyNftVerifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {T('ed_lively_verify')}
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-violet-500/30 p-4 space-y-3 bg-violet-500/5">
                <p className="text-sm font-bold text-[var(--text)]">{T('ed_lively_premium_title')}</p>
                <p className="text-xs text-[var(--text2)] leading-relaxed">{T('ed_lively_premium_body')}</p>
                {(site as any)?.lively_premium_nft_verified_at ? (
                  <p className="text-xs font-bold text-green-400">{T('ed_lively_premium_ok_label')}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void runVerifyPremiumNft()}
                    disabled={livelyPremiumVerifyLoading}
                    className="btn-primary gap-2 text-sm border-violet-500/50"
                  >
                    {livelyPremiumVerifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {T('ed_lively_premium_verify')}
                  </button>
                )}
              </div>
            </div>

          {site?.id && user?.id && (
            <div className="space-y-4">
              <IdentityLabPanel
                siteId={site.id}
                slug={slug.trim()}
                iaApiEnabled={editorIaApiEnabled}
                aiFreeUsd={iaBudget.freeUsd}
                aiPaidUsd={iaBudget.paidUsd}
                identityPortraitUrl={identityPortraitUrl}
                setIdentityPortraitUrl={setIdentityPortraitUrl}
                identityStylePreset={identityStylePreset}
                setIdentityStylePreset={setIdentityStylePreset}
                identityVoiceEffect={identityVoiceEffect}
                setIdentityVoiceEffect={setIdentityVoiceEffect}
                identityCloneVoiceId={typeof (site as any)?.identity_clone_voice_id === 'string' ? (site as any).identity_clone_voice_id : ''}
                setAvatarUrl={setAvatarUrl}
                uploadToStorage={uploadToStorage}
                onMarkDirty={markDirty}
                onReload={reload}
                T={T}
              />
              <div className="card p-4 border border-amber-500/25 bg-amber-500/5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={magicPortraitEnabled}
                    onChange={(e) => {
                      setMagicPortraitEnabled(e.target.checked);
                      markDirty();
                    }}
                    className="rounded border-[var(--border)] w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-[var(--text)]">{T('ed_magic_portrait_enable')}</span>
                </label>
                <p className="text-[11px] text-[var(--text2)] mt-2 pl-7 leading-relaxed">{T('ed_magic_portrait_hint')}</p>
                {!magicPortraitEnabled ? (
                  <p className="text-[11px] text-amber-400/95 mt-2 pl-7 leading-relaxed font-semibold">{T('ed_magic_portrait_off_note')}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/80 p-4 space-y-2">
                <p className="text-xs font-black text-[var(--text)]">{T('ed_studio_tiers_title')}</p>
                <p className="text-[11px] text-[var(--text2)] leading-relaxed">{T('ed_studio_tiers_body')}</p>
              </div>
            </div>
          )}
            </div>
          )}

          {/* VERIFY */}
          {activeTab === 'verify' && (
            <div className="card p-6 space-y-4">
              <h2 className="font-black text-lg text-[var(--text)]">{T('ed_verify_yt_title')}</h2>
              <p className="text-sm text-[var(--text2)]">
                {T('ed_verify_yt_intro_before')}{' '}
                <code className="text-brand">{siteUrl || T('ed_mini_site_url_placeholder')}</code>{' '}
                {T('ed_verify_yt_intro_after')}
              </p>
              <input value={ytVerifyUrl} onChange={e => setYtVerifyUrl(e.target.value)} className="input" placeholder={T('ed_verify_yt_ph')} />
              <button onClick={verifyYouTube} disabled={verifying || !ytVerifyUrl} className="btn-primary gap-2">
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔍'} {T('ed_verify_channel_btn')}
              </button>
              {site && (site as any).is_verified && (
                <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                  <span>✓</span><span>{T('ed_verified_badge')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar: Live Preview (mini-site | Google) ── */}
        <div>
          <div className="card p-4 sticky top-36">
            <p className="text-xs text-[var(--text2)] font-semibold uppercase tracking-wider mb-2">{T('ed_preview')}</p>
            <div className="flex rounded-xl border border-[var(--border)] p-1 mb-3 gap-0.5 bg-[var(--bg2)]">
              <button
                type="button"
                onClick={() => setLivePreviewTab('minisite')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  livePreviewTab === 'minisite' ? 'bg-brand text-white shadow-sm' : 'text-[var(--text2)] hover:text-[var(--text)]'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5 opacity-90 flex-shrink-0" />
                {T('ed_preview_minisite')}
              </button>
              <button
                type="button"
                onClick={() => setLivePreviewTab('google')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  livePreviewTab === 'google' ? 'bg-brand text-white shadow-sm' : 'text-[var(--text2)] hover:text-[var(--text)]'
                }`}
              >
                <Search className="w-3.5 h-3.5 opacity-90 flex-shrink-0" />
                {T('ed_preview_google')}
              </button>
            </div>

            {livePreviewTab === 'google' ? (
              <GoogleSerpPreview
                slug={slug}
                siteName={siteName}
                seoTitle={seoTitle}
                seoDescription={seoDescription}
                bio={bio}
                cvHeadline={cvHeadline}
                avatarUrl={avatarUrl}
              />
            ) : (
            <div className="rounded-2xl overflow-hidden border border-[var(--border)]" style={{ background: currentTheme.bg }}>
              {/* Banner preview */}
              {bannerUrl && (
                <div style={{
                  width:'100%',
                  maxHeight: PREVIEW_BANNER_MAX_PX,
                  height: previewBannerStripH,
                  overflow:'hidden',
                  position:'relative',
                  background: '#07070a',
                }}>
                  <img src={bannerUrl} alt="" style={{
                    width:'100%',
                    height:'100%',
                    objectFit: bannerFit,
                    objectPosition:`${bannerFocusX}% ${bannerFocusY}%`,
                    transform:`scale(${bannerZoom / 100})`,
                    transformOrigin:`${bannerFocusX}% ${bannerFocusY}%`,
                    display:'block',
                  }} />
                </div>
              )}
              {!bannerUrl && bannerPlaceholderEnabled && (
                <div style={{
                  width:'100%',
                  maxHeight: PREVIEW_BANNER_MAX_PX,
                  height: Math.min(72, previewBannerStripH),
                  overflow:'hidden',
                  position:'relative',
                  background: bannerPlaceholderColor || '#1f2937',
                }} />
              )}
              <div style={{
                padding: '16px 16px 16px',
                textAlign:'center',
                background: currentTheme.bg,
              }}>
                {/* Avatar — separado do banner; nunca sobrepõe a faixa */}
                <div style={{ display:'inline-block', marginBottom: 10, marginTop: 0 }}>
                  {avatarUrl
                    ? <img src={avatarUrl} style={{ width:avatarPx, height:avatarPx, borderRadius: photoShape==='round'?'50%':photoShape==='square'?8:Math.round(avatarPx*0.2), objectFit:'cover', border:`2px solid ${accentColor}`, display:'block' }} />
                    : <div style={{ width:avatarPx, height:avatarPx, borderRadius:'50%', background:accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:Math.round(avatarPx*0.4), fontWeight:900, color:'#fff' }}>{siteName?.[0] || '?'}</div>}
                </div>
                <p style={{ fontSize:15, fontWeight:900, color:textColor||currentTheme.text, margin:'0 0 3px',
                  fontFamily: fontStyle==='serif'?'Georgia,serif':fontStyle==='mono'?'monospace':'system-ui',
                  opacity: siteName ? 1 : 0.35 }}>{siteName || T('ed_preview_name_placeholder')}</p>
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
                  <div style={{ width:'100%', padding:'7px 10px', borderRadius:10, border:`1px dashed ${accentColor}55`, fontSize:10, fontWeight:600, color:currentTheme.text, textAlign:'center', opacity:0.45 }}>
                    {T('ed_preview_links_hint')}
                  </div>
                )}
              </div>
              {site?.slug && <p style={{ textAlign:'center', fontSize:9, color:currentTheme.text, opacity:0.35, padding:'0 0 8px', fontFamily:'monospace' }}>{site.slug}.trustbank.xyz</p>}
            </div>
            )}

            {user && <div className="mt-3"><EarningsWidget userId={user.id} accentColor={accentColor} compact /></div>}

            {siteUrl && (
              <a href={siteUrl} target="_blank" rel="noopener" className="btn-secondary w-full justify-center mt-3 text-sm py-2 gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> {T('ed_open_full_site')}
              </a>
            )}
          </div>
        </div>
      </div>
      </div>

      {user ? <ApiHubDrawer siteId={site?.id || null} /> : null}

      {site?.id && user?.id ? (
        <EditorScriptsAndAdsDialog
          open={scriptsAdsDialogOpen}
          onOpenChange={setScriptsAdsDialogOpen}
          T={T}
          lang={lang}
          siteName={siteName}
          livelyProfileAsAvatar={livelyProfileAsAvatar}
          livelyAvatarWelcome={livelyAvatarWelcome}
          setLivelyAvatarWelcome={setLivelyAvatarWelcome}
          livelyProfileSpeechTap={livelyProfileSpeechTap}
          setLivelyProfileSpeechTap={setLivelyProfileSpeechTap}
          livelyProfileSpeechBeforeReply={livelyProfileSpeechBeforeReply}
          setLivelyProfileSpeechBeforeReply={setLivelyProfileSpeechBeforeReply}
          runSuggestLivelyWelcome={() => void runSuggestLivelyWelcome()}
          livelySuggestWelcomeBusy={livelySuggestWelcomeBusy}
          siteSlug={site.slug}
          adAskingPrice={adAskingPrice}
          setAdAskingPrice={setAdAskingPrice}
          adShowPricePublic={adShowPricePublic}
          setAdShowPricePublic={setAdShowPricePublic}
          onSuggestAdPrice={() => void runSuggestAdPrice()}
          suggestingPrice={suggestingPrice}
          markDirty={markDirty}
          showIaSuggestButtons={editorIaApiEnabled}
        />
      ) : null}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      }
    >
      <EditorPageInner />
    </Suspense>
  );
}
