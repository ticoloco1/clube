'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Flame,
  Layers,
  Link2,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useT, useI18n } from '@/lib/i18n';
import { genesisMdToCvHtml } from '@/lib/genesisMdToHtml';
import type { GenesisPack } from '@/lib/genesisPackTypes';

type Msg = { role: 'user' | 'assistant'; content: string };
type HubMode = 'dialog' | 'forge';

const LS_OPEN = 'tb_genesis_hub_open';

type OrbPhase = 'idle' | 'think' | 'triumph';

function LivingOrb({
  phase,
  tiltX,
  tiltY,
}: {
  phase: OrbPhase;
  tiltX: number;
  tiltY: number;
}) {
  const fast = phase === 'think';
  const triumph = phase === 'triumph';

  return (
    <div
      className="relative w-[7.25rem] h-[7.25rem] mx-auto select-none"
      style={{
        transform: `perspective(520px) rotateY(${tiltX * 14}deg) rotateX(${-tiltY * 12}deg) scale(${triumph ? 1.08 : 1})`,
        transition: 'transform 0.2s ease-out',
      }}
    >
      <div
        className="absolute -inset-3 rounded-full opacity-60 blur-xl pointer-events-none"
        style={{
          background: fast
            ? 'radial-gradient(circle, rgba(34,211,238,0.45), rgba(139,92,246,0.35), transparent 70%)'
            : 'radial-gradient(circle, rgba(34,211,238,0.2), rgba(139,92,246,0.25), transparent 70%)',
          animation: fast ? 'genesis-glow 0.9s ease-in-out infinite' : 'genesis-glow 2.8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute inset-0 rounded-full border-2 border-cyan-400/25"
        style={{ animation: `genesis-spin ${fast ? 4 : 14}s linear infinite` }}
      />
      <div
        className="absolute inset-2 rounded-full border border-violet-400/35 border-dashed"
        style={{ animation: `genesis-spin ${fast ? 5.5 : 11}s linear infinite reverse` }}
      />
      <div
        className="absolute inset-4 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,238,0.95) 0%, rgba(99,102,241,0.85) 45%, rgba(139,92,246,0.95) 100%)',
          boxShadow: fast
            ? '0 0 28px rgba(34,211,238,0.65), inset 0 0 20px rgba(255,255,255,0.25)'
            : '0 0 18px rgba(139,92,246,0.45), inset 0 0 14px rgba(255,255,255,0.15)',
          animation: 'genesis-core 2.4s ease-in-out infinite',
        }}
      >
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
            animation: 'genesis-scan 3s linear infinite',
          }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Zap className={`w-9 h-9 text-white drop-shadow-lg ${fast ? 'animate-pulse' : ''}`} style={{ opacity: 0.92 }} />
      </div>
    </div>
  );
}

export function TrustGenesisHub({
  siteId,
  snapshot,
  markDirty,
  setBio,
  setCvHeadline,
  setCvContent,
  setSeoTitle,
  setSeoDescription,
  setShowCv,
  onPrefillLink,
  onNavigateTab,
  onAppendLivelyInstructions,
  iaApiEnabled = true,
}: {
  siteId: string;
  snapshot: Record<string, unknown>;
  markDirty: () => void;
  setBio: (s: string) => void;
  setCvHeadline: (s: string) => void;
  setCvContent: (s: string) => void;
  setSeoTitle: (s: string) => void;
  setSeoDescription: (s: string) => void;
  setShowCv: (v: boolean) => void;
  onPrefillLink: (title: string, url: string) => void;
  onNavigateTab: (tabId: string) => void;
  onAppendLivelyInstructions: (s: string) => void;
  /** false = sem chamadas automáticas / à API (evita toasts de orçamento). */
  iaApiEnabled?: boolean;
}) {
  const T = useT();
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(LS_OPEN) !== '0';
    } catch {
      return true;
    }
  });
  const [mode, setMode] = useState<HubMode>('dialog');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const bootSiteKeyRef = useRef<string>('');
  const listRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;

  const [brief, setBrief] = useState('');
  const [pack, setPack] = useState<GenesisPack | null>(null);
  const [forgeBusy, setForgeBusy] = useState(false);
  const [forgeStep, setForgeStep] = useState(0);
  const [triumph, setTriumph] = useState(false);

  const persistOpen = useCallback((open: boolean) => {
    setExpanded(open);
    try {
      localStorage.setItem(LS_OPEN, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const callCoach = useCallback(
    async (msgs: Msg[]) => {
      if (!iaApiEnabled) return null;
      setCoachLoading(true);
      try {
        const res = await fetch('/api/editor/site-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, messages: msgs, snapshot: snapRef.current }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof data.error === 'string' ? data.error : T('ed_neo_fail'));
          return null;
        }
        const reply = typeof data.reply === 'string' ? data.reply.trim() : '';
        if (!reply) {
          toast.error(T('ed_neo_empty'));
          return null;
        }
        return reply;
      } catch {
        toast.error(T('ed_neo_fail'));
        return null;
      } finally {
        setCoachLoading(false);
      }
    },
    [siteId, iaApiEnabled, T],
  );

  useEffect(() => {
    if (!siteId) return;
    if (!iaApiEnabled) {
      bootSiteKeyRef.current = '';
      setMessages([{ role: 'assistant', content: T('ed_ia_hub_off_hint') }]);
      return;
    }
    const key = siteId;
    if (bootSiteKeyRef.current === key) return;
    bootSiteKeyRef.current = key;
    (async () => {
      const reply = await callCoach([{ role: 'user', content: '___BOOTSTRAP___' }]);
      if (reply) {
        setMessages([{ role: 'assistant', content: reply }]);
        scrollBottom();
      }
    })();
  }, [siteId, iaApiEnabled, callCoach, scrollBottom, T]);

  const sendCoach = useCallback(async () => {
    if (!iaApiEnabled) {
      toast.message(T('ed_ia_master_off_hint'));
      return;
    }
    const q = input.trim();
    if (!q || coachLoading) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    scrollBottom();
    const reply = await callCoach(next);
    if (reply) {
      setMessages([...next, { role: 'assistant', content: reply }]);
      scrollBottom();
    }
  }, [input, coachLoading, messages, callCoach, scrollBottom, iaApiEnabled, T]);

  useEffect(() => {
    if (!forgeBusy) return;
    const id = window.setInterval(() => setForgeStep((s) => (s + 1) % 4), 480);
    return () => clearInterval(id);
  }, [forgeBusy]);

  useEffect(() => {
    if (!triumph) return;
    const t = window.setTimeout(() => setTriumph(false), 1400);
    return () => clearTimeout(t);
  }, [triumph]);

  const onMouseMoveOrb = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setTilt({
      x: (e.clientX - cx) / Math.max(r.width / 2, 1),
      y: (e.clientY - cy) / Math.max(r.height / 2, 1),
    });
  }, []);

  const runForge = useCallback(async () => {
    if (!iaApiEnabled) {
      toast.message(T('ed_ia_master_off_hint'));
      return;
    }
    if (!siteId || forgeBusy) return;
    setForgeBusy(true);
    setPack(null);
    try {
      const res = await fetch('/api/editor/genesis-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, brief, snapshot: snapRef.current, uiLang: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('gen_fail'));
        return;
      }
      const p = data.pack as GenesisPack | undefined;
      if (!p?.bio && !p?.cv_headline) {
        toast.error(T('gen_fail'));
        return;
      }
      setPack(p);
      toast.success(T('gen_ok'));
    } catch {
      toast.error(T('gen_fail'));
    } finally {
      setForgeBusy(false);
    }
  }, [siteId, forgeBusy, brief, lang, iaApiEnabled, T]);

  const applyAll = useCallback(
    (p: GenesisPack) => {
      setBio(p.bio.slice(0, 900));
      setCvHeadline(p.cv_headline);
      setCvContent(genesisMdToCvHtml(p.cv_body_markdown));
      setSeoTitle(p.seo_title.slice(0, 70));
      setSeoDescription(p.seo_description.slice(0, 160));
      setShowCv(true);
      if (p.paywall_pitch.trim()) {
        onAppendLivelyInstructions(`— Pitch paywall (Génesis):\n${p.paywall_pitch.trim()}`);
      }
      markDirty();
      setTriumph(true);
      toast.success(T('gen_applied_all'));
    },
    [
      setBio,
      setCvHeadline,
      setCvContent,
      setSeoTitle,
      setSeoDescription,
      setShowCv,
      onAppendLivelyInstructions,
      markDirty,
      T,
    ],
  );

  const thinking = coachLoading || forgeBusy;
  const orbPhase: OrbPhase = triumph ? 'triumph' : thinking ? 'think' : 'idle';

  const forgeLabels = [T('gen_step_1'), T('gen_step_2'), T('gen_step_3'), T('gen_step_4')];

  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden relative"
      style={{
        boxShadow: '0 0 0 1px rgba(34,211,238,0.28), 0 0 48px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.07)',
        background: 'linear-gradient(155deg, rgba(10,15,35,0.98) 0%, rgba(35,25,70,0.96) 42%, rgba(12,18,40,0.99) 100%)',
      }}
    >
      <style>{`
        @keyframes genesis-spin { to { transform: rotate(360deg); } }
        @keyframes genesis-core {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.03); filter: brightness(1.12); }
        }
        @keyframes genesis-glow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes genesis-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes neo-scan-bar {
          0% { transform: translateX(-120%); opacity: 0.3; }
          40% { opacity: 1; }
          100% { transform: translateX(280%); opacity: 0.3; }
        }
        @keyframes neo-brain {
          0%, 100% { transform: scale(0.9); opacity: 0.65; filter: drop-shadow(0 0 6px rgba(34,211,238,0.45)); }
          50% { transform: scale(1.12); opacity: 1; filter: drop-shadow(0 0 16px rgba(167,139,250,0.85)); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {thinking && (
        <div className="h-1 w-full overflow-hidden bg-slate-950/80 relative">
          <div
            className="absolute inset-y-0 w-2/5 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.95), rgba(167,139,250,0.9), transparent)',
              animation: 'neo-scan-bar 1.15s ease-in-out infinite',
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => persistOpen(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-cyan-500/20 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.3), rgba(139,92,246,0.4))',
              boxShadow: '0 0 22px rgba(34,211,238,0.3)',
            }}
          >
            <Layers className="w-5 h-5 text-cyan-100" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200">
              {T('gen_hub_title')}
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">{T('gen_hub_sub')}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-cyan-400/70 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-cyan-400/70 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 sm:p-5 space-y-5">
          <div ref={wrapRef} onMouseMove={onMouseMoveOrb} onMouseLeave={() => setTilt({ x: 0, y: 0 })} className="py-2">
            <LivingOrb phase={orbPhase} tiltX={tilt.x} tiltY={tilt.y} />
            {forgeBusy && (
              <p className="text-center text-[11px] font-bold text-violet-300/90 mt-3 tracking-widest uppercase animate-pulse">
                {forgeLabels[forgeStep % forgeLabels.length]}
              </p>
            )}
          </div>

          <div className="flex rounded-2xl border border-violet-500/25 p-1 gap-1 bg-black/40">
            <button
              type="button"
              onClick={() => setMode('dialog')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                mode === 'dialog'
                  ? 'bg-gradient-to-r from-cyan-600/50 to-violet-600/50 text-white shadow-lg border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {T('gen_mode_dialog')}
            </button>
            <button
              type="button"
              onClick={() => setMode('forge')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                mode === 'forge'
                  ? 'bg-gradient-to-r from-fuchsia-600/45 to-cyan-600/45 text-white shadow-lg border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              {T('gen_mode_forge')}
            </button>
          </div>

          {mode === 'dialog' && (
            <div className="space-y-3">
              {coachLoading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <Brain className="w-12 h-12 text-violet-300" style={{ animation: 'neo-brain 1.05s ease-in-out infinite' }} />
                  <p className="text-xs font-bold text-cyan-300/80 tracking-widest uppercase">{T('ed_neo_sync')}</p>
                </div>
              )}
              <div
                ref={listRef}
                className="max-h-[min(48vh,380px)] overflow-y-auto space-y-3 rounded-xl border border-violet-500/15 bg-black/40 p-3 text-[13px] leading-relaxed"
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 border ${
                      m.role === 'user'
                        ? 'border-cyan-500/25 bg-cyan-950/35 text-cyan-50 ml-3'
                        : 'border-violet-500/20 bg-violet-950/20 text-slate-100 mr-1'
                    }`}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">
                      {m.role === 'user' ? T('ed_neo_you') : T('ed_neo_ai')}
                    </span>
                    <div className="whitespace-pre-wrap break-words font-mono">{m.content}</div>
                  </div>
                ))}
                {coachLoading && messages.length > 0 && (
                  <div className="flex items-center gap-3 px-2 py-2 text-violet-300/90">
                    <Brain className="w-6 h-6 flex-shrink-0" style={{ animation: 'neo-brain 1s ease-in-out infinite' }} />
                    <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full w-1/3 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #22d3ee, #a78bfa)',
                          animation: 'neo-scan-bar 0.95s linear infinite',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void sendCoach()}
                  disabled={coachLoading || !iaApiEnabled}
                  className="flex-1 rounded-xl border border-cyan-500/25 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/50"
                  placeholder={T('ed_neo_placeholder')}
                />
                <button
                  type="button"
                  disabled={coachLoading || !input.trim() || !iaApiEnabled}
                  onClick={() => void sendCoach()}
                  className="rounded-xl px-4 py-2.5 font-bold text-slate-950 disabled:opacity-40 flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)',
                    boxShadow: '0 0 20px rgba(34,211,238,0.25)',
                  }}
                >
                  {coachLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'forge' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed border-l-2 border-cyan-500/40 pl-3">{T('gen_forge_intro')}</p>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value.slice(0, 2000))}
                disabled={forgeBusy || !iaApiEnabled}
                className="w-full rounded-xl border border-violet-500/25 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-100 min-h-[88px] outline-none focus:border-cyan-400/40"
                placeholder={T('gen_forge_ph')}
              />
              <button
                type="button"
                disabled={forgeBusy || !siteId || !iaApiEnabled}
                onClick={() => void runForge()}
                className="w-full rounded-xl py-3 font-black text-slate-950 flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #e879f9, #22d3ee, #6366f1)',
                  backgroundSize: '200% 200%',
                  animation: forgeBusy ? 'genesis-glow 1.2s ease infinite' : undefined,
                  boxShadow: '0 0 28px rgba(232,121,249,0.35)',
                }}
              >
                {forgeBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {forgeBusy ? T('gen_forge_busy') : T('gen_forge_cta')}
              </button>

              {pack && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => applyAll(pack)}
                    className="w-full py-3 rounded-xl font-black text-white border border-emerald-400/40 bg-emerald-600/25 hover:bg-emerald-600/35 transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    {T('gen_apply_all')}
                  </button>

                  {[
                    { k: 'bio', label: T('gen_card_bio'), v: pack.bio, onApply: () => setBio(pack.bio.slice(0, 900)) },
                    { k: 'cv', label: T('gen_card_cv'), v: pack.cv_headline + '\n…', onApply: () => { setCvHeadline(pack.cv_headline); setCvContent(genesisMdToCvHtml(pack.cv_body_markdown)); setShowCv(true); } },
                    { k: 'seo', label: T('gen_card_seo'), v: `${pack.seo_title}\n${pack.seo_description}`, onApply: () => { setSeoTitle(pack.seo_title.slice(0, 70)); setSeoDescription(pack.seo_description.slice(0, 160)); onNavigateTab('seo'); } },
                  ].map((c, i) => (
                    <div
                      key={c.k}
                      className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2"
                      style={{ animation: `card-in 0.5s ease-out ${i * 70}ms both` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300/90">{c.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            c.onApply();
                            markDirty();
                            toast.success(T('gen_applied_one'));
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-600/40 text-violet-100 hover:bg-violet-600/55"
                        >
                          {T('gen_apply_one')}
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-4">{c.v}</p>
                    </div>
                  ))}

                  {pack.link_ideas.length > 0 && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-3 space-y-2" style={{ animation: 'card-in 0.5s ease-out 280ms both' }}>
                      <p className="text-[10px] font-black uppercase text-cyan-300 flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5" /> {T('gen_card_links')}
                      </p>
                      <ul className="space-y-2">
                        {pack.link_ideas.map((li, j) => (
                          <li key={j} className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                            <span className="flex-1 min-w-0">{li.title}</span>
                            <button
                              type="button"
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-cyan-700/40 text-cyan-100 shrink-0"
                              onClick={() => {
                                onPrefillLink(li.title, li.url_hint || 'https://');
                                onNavigateTab('links');
                                toast.success(T('gen_link_prefill'));
                              }}
                            >
                              {T('gen_use_link')}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pack.feed_ideas.length > 0 && (
                    <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/10 p-3" style={{ animation: 'card-in 0.5s ease-out 350ms both' }}>
                      <p className="text-[10px] font-black uppercase text-fuchsia-300 mb-2">{T('gen_card_feed')}</p>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {pack.feed_ideas.map((f, j) => (
                          <li key={j}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pack.paywall_pitch.trim() ? (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-950/10 p-3 flex justify-between gap-2 items-start" style={{ animation: 'card-in 0.5s ease-out 420ms both' }}>
                      <p className="text-xs text-slate-300 flex-1">{pack.paywall_pitch}</p>
                      <button
                        type="button"
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-600/35 text-amber-100 shrink-0"
                        onClick={() => {
                          onAppendLivelyInstructions(`— Pitch paywall (Génesis):\n${pack.paywall_pitch.trim()}`);
                          markDirty();
                          toast.success(T('gen_pitch_added'));
                        }}
                      >
                        {T('gen_add_lively')}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-400" />
            {T('ed_neo_footer')}
          </p>
        </div>
      )}
    </div>
  );
}
