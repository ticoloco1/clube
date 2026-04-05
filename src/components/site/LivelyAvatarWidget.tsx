'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT, getLang } from '@/lib/i18n';
import { livelyDefaultVisitorGreeting } from '@/lib/aiVisitorLanguage';
import { resolveLivelyModel } from '@/lib/livelyAvatarModels';
import { defaultElevenVoice } from '@/lib/elevenLabsTts';
import { buildVisemeKeyframes, visemeAtTime, type VisemeShape } from '@/lib/visemesFromText';
import { FloatingAgentCharacter } from '@/components/site/FloatingAgentCharacter';
import { LivelyFaceSvg } from '@/components/site/LivelyFaceSvg';
import { MessageCircle, X, Send, Loader2, Volume2 } from 'lucide-react';
import type { LivelyTtsProvider } from '@/lib/livelyTtsPreference';

type Msg = { role: 'user' | 'assistant'; content: string };
type AnimState = 'idle' | 'thinking' | 'interaction';

type VoicePair = { owner: string; agent: string };

export function LivelyAvatarWidget({
  slug,
  siteName,
  welcome,
  modelId,
  floatingImageUrl,
  dualAgent,
  isOwner,
  openBeta,
  nftVerified,
  accent,
  pageBg,
  textColor,
  speechBeforeReply,
  elevenAgentVoiceId,
  floatingExpressiveGestures = false,
  /** Retrato gerado no Identity Lab (URL pública). Só usado no painel quando o retrato mágico está ligado no site. */
  identityPortraitUrl,
  /** Se false, a foto redonda do chat usa só `floatingImageUrl` (avatar), nunca o retrato de identidade. */
  magicPortraitEnabled = true,
  /** Incrementa (ex.: 1,2,3…) para abrir o painel a partir do botão no perfil. */
  requestOpen = 0,
  /** Voz: automática, só OpenAI TTS, ou só ElevenLabs (com fallback OpenAI se falhar). */
  ttsProvider = 'auto' as LivelyTtsProvider,
}: {
  slug: string;
  siteName: string;
  welcome?: string | null;
  modelId?: string | null;
  /** Foto de perfil ou retrato para o boneco 3D no canto. */
  floatingImageUrl: string | null;
  dualAgent: boolean;
  isOwner: boolean;
  openBeta: boolean;
  nftVerified: boolean;
  accent: string;
  pageBg: string;
  textColor: string;
  /** Falado antes de enviar cada pergunta ao modelo (opcional). */
  speechBeforeReply?: string | null;
  elevenAgentVoiceId?: string | null;
  /** Polegar + movimento extra no agente flutuante após respostas (mini-site). */
  floatingExpressiveGestures?: boolean;
  identityPortraitUrl?: string | null;
  magicPortraitEnabled?: boolean;
  requestOpen?: number;
  ttsProvider?: LivelyTtsProvider;
}) {
  const T = useT();
  const uiLang = getLang();
  const model = resolveLivelyModel(modelId || undefined);
  const livelyGate = nftVerified || openBeta;
  const previewOnly = isOwner && !livelyGate;
  const idPortrait = typeof identityPortraitUrl === 'string' ? identityPortraitUrl.trim() : '';
  const flImg = typeof floatingImageUrl === 'string' ? floatingImageUrl.trim() : '';
  const portraitSrc = magicPortraitEnabled ? idPortrait || flImg : flImg;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>(() => {
    const w = (welcome || '').trim();
    if (w) return [{ role: 'assistant', content: w }];
    return [{ role: 'assistant', content: livelyDefaultVisitorGreeting(siteName, uiLang) }];
  });
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [mouth, setMouth] = useState<VisemeShape>('sil');
  const [animState, setAnimState] = useState<AnimState>('idle');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [interactionKey, setInteractionKey] = useState(0);
  const [speechEndKey, setSpeechEndKey] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const lipSyncRef = useRef<{ keys: ReturnType<typeof buildVisemeKeyframes>; start: number; end: number } | null>(
    null,
  );

  const stopLipSync = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lipSyncRef.current = null;
    setMouth('sil');
    setSpeaking(false);
  }, []);

  useEffect(() => () => stopLipSync(), [stopLipSync]);

  const ensureAudioCtx = useCallback(async () => {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AC();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }, []);

  useEffect(() => {
    if (requestOpen <= 0) return;
    void ensureAudioCtx().then(() => setOpen(true));
  }, [requestOpen, ensureAudioCtx]);

  const runLipSync = useCallback(
    (keyframes: ReturnType<typeof buildVisemeKeyframes>, durationSec: number) => {
      stopLipSync();
      setSpeaking(true);
      const start = performance.now() / 1000;
      lipSyncRef.current = { keys: keyframes, start, end: start + durationSec };
      const tick = () => {
        const cur = lipSyncRef.current;
        if (!cur) return;
        const now = performance.now() / 1000;
        const t = now - cur.start;
        if (t >= cur.end - 0.02) {
          stopLipSync();
          return;
        }
        setMouth(visemeAtTime(cur.keys, Math.max(0, t)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stopLipSync],
  );

  const playAudioWithVisemesAsync = useCallback(
    async (text: string, arrayBuffer: ArrayBuffer): Promise<void> => {
      const ctx = await ensureAudioCtx();
      const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const dur = buf.duration;
      const keys = buildVisemeKeyframes(text, dur);
      runLipSync(keys, dur);
      await new Promise<void>((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.onended = () => {
          stopLipSync();
          resolve();
        };
        try {
          src.start(0);
        } catch {
          resolve();
        }
      });
    },
    [ensureAudioCtx, runLipSync, stopLipSync],
  );

  const playClientTts = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) return Promise.resolve();
      stopLipSync();
      const est = Math.max(1.2, text.length * 0.072);
      const keys = buildVisemeKeyframes(text, est);
      runLipSync(keys, est);
      return new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = uiLang === 'pt' ? 'pt-BR' : 'en-US';
        u.onend = () => {
          stopLipSync();
          resolve();
        };
        u.onerror = () => {
          stopLipSync();
          resolve();
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      });
    },
    [uiLang, runLipSync, stopLipSync],
  );

  const speakWithOpenAiOrClient = useCallback(
    async (text: string) => {
      const res = await fetch('/api/lively-avatar/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, text }),
      });
      if (res.status === 402) {
        setPaywallOpen(true);
        return;
      }
      if (res.headers.get('Content-Type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.clientTTS && data.text) {
          await playClientTts(String(data.text));
        }
        return;
      }
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      await playAudioWithVisemesAsync(text, buf);
    },
    [slug, playAudioWithVisemesAsync, playClientTts],
  );

  const speakWithEleven = useCallback(
    async (text: string, voiceId: string) => {
      if (!voiceId) {
        await speakWithOpenAiOrClient(text);
        return;
      }
      const res = await fetch('/api/lively-avatar/tts-eleven', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, text, voiceId }),
      });
      if (res.status === 402) {
        setPaywallOpen(true);
        return;
      }
      if (!res.ok) {
        await speakWithOpenAiOrClient(text);
        return;
      }
      const buf = await res.arrayBuffer();
      await playAudioWithVisemesAsync(text, buf);
    },
    [slug, playAudioWithVisemesAsync, speakWithOpenAiOrClient],
  );

  const speakPreferred = useCallback(
    async (text: string, voiceId: string) => {
      const t = text.replace(/\s+/g, ' ').trim();
      if (!t) return;
      if (ttsProvider === 'openai') {
        await speakWithOpenAiOrClient(t);
        return;
      }
      await speakWithEleven(t, voiceId);
    },
    [ttsProvider, speakWithOpenAiOrClient, speakWithEleven],
  );

  const speakDual = useCallback(
    async (turns: { speaker: 'owner' | 'agent'; text: string }[], voices: VoicePair) => {
      if (ttsProvider === 'openai') {
        for (const t of turns) {
          await speakWithOpenAiOrClient(t.text.replace(/\s+/g, ' ').trim());
        }
        return;
      }
      for (const t of turns) {
        const vid = t.speaker === 'owner' ? voices.owner : voices.agent;
        await speakWithEleven(t.text, vid);
      }
    },
    [ttsProvider, speakWithOpenAiOrClient, speakWithEleven],
  );

  const triggerInteraction = useCallback(() => {
    setInteractionKey((k) => k + 1);
    setAnimState('interaction');
    window.setTimeout(() => setAnimState('idle'), 550);
  }, []);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    triggerInteraction();
    setLoading(true);
    setAnimState('thinking');
    const nextMsgs: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(nextMsgs);
    try {
      try {
        const pre = (speechBeforeReply || '').trim();
        if (pre) {
          const vid = (elevenAgentVoiceId || '').trim() || defaultElevenVoice('agent');
          await speakPreferred(pre, vid);
        }
      } catch {
        /* pré-fala opcional: não bloqueia o chat */
      }

      const res = await fetch('/api/lively-avatar/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, messages: nextMsgs, uiLang: getLang() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setPaywallOpen(true);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: typeof data.error === 'string' ? data.error : T('lively_paywall_msg'),
          },
        ]);
        return;
      }
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: typeof data.error === 'string' ? data.error : T('lively_error'),
          },
        ]);
        return;
      }

      const voices: VoicePair = {
        owner: String(data.voices?.owner || ''),
        agent: String(data.voices?.agent || ''),
      };

      const runReplyTts = async (fn: () => Promise<void>) => {
        try {
          await fn();
        } catch (e) {
          console.warn('[LivelyAvatarWidget] TTS da resposta falhou (texto já exibido)', e);
        } finally {
          setSpeechEndKey((k) => k + 1);
        }
      };

      if (data.dual && Array.isArray(data.turns) && data.turns.length) {
        const turns = data.turns as { speaker: string; text: string }[];
        const labelOwner = uiLang === 'pt' ? 'Dono' : 'Owner';
        const labelAgent = uiLang === 'pt' ? 'Assistente' : 'Assistant';
        const block = turns
          .map((t) => {
            const sp = t.speaker === 'owner' ? labelOwner : labelAgent;
            return `${sp}: ${String(t.text || '').trim()}`;
          })
          .join('\n\n');
        setMessages((m) => [...m, { role: 'assistant', content: block }]);
        setNudgeKey((k) => k + 1);
        setLoading(false);
        setAnimState('idle');
        void runReplyTts(async () => {
          await speakDual(
            turns.map((t) => ({
              speaker: t.speaker === 'owner' ? 'owner' : 'agent',
              text: String(t.text || '').trim(),
            })),
            voices,
          );
        });
      } else {
        const reply = String(data.reply || '').trim();
        if (reply) {
          setMessages((m) => [...m, { role: 'assistant', content: reply }]);
          setNudgeKey((k) => k + 1);
        }
        setLoading(false);
        setAnimState('idle');
        if (reply) {
          void runReplyTts(async () => {
            await speakPreferred(reply, voices.agent || voices.owner);
          });
        }
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: T('lively_error') }]);
    } finally {
      setLoading(false);
      setAnimState('idle');
    }
  };

  return (
    <>
      <FloatingAgentCharacter
        imageUrl={floatingImageUrl}
        animState={loading ? 'thinking' : animState}
        accent={accent}
        visible
        nudgeKey={nudgeKey}
        speechEndKey={speechEndKey}
        expressiveGestures={floatingExpressiveGestures}
        speaking={speaking}
      />

      {paywallOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          role="dialog"
          aria-modal
        >
          <div
            className="max-w-md w-full rounded-2xl border p-6 shadow-2xl"
            style={{ background: pageBg, borderColor: `${accent}55`, color: textColor }}
          >
            <h3 className="text-lg font-black mb-2">{T('lively_paywall_title')}</h3>
            <p className="text-sm opacity-90 leading-relaxed mb-4">{T('lively_paywall_body')}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-bold border border-white/20"
                onClick={() => setPaywallOpen(false)}
              >
                {T('lively_close')}
              </button>
              <a
                href="/planos"
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: accent }}
              >
                {T('lively_paywall_cta')}
              </a>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-5 right-5 z-[95] flex flex-col items-end gap-2"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {open && (
          <div
            className="w-[min(100vw-2rem,360px)] rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[min(72vh,520px)]"
            style={{
              background: pageBg,
              borderColor: `${accent}55`,
              color: textColor,
              boxShadow: `0 20px 50px rgba(0,0,0,0.35), 0 0 0 1px ${accent}22`,
            }}
          >
            {previewOnly && (
              <div className="text-[10px] font-bold px-3 py-2 bg-amber-500/20 text-amber-200 border-b border-amber-500/30">
                {T('lively_preview_owner')}
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-xs font-black flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 opacity-80" />
                {dualAgent ? T('lively_title_dual') : T('lively_title')}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10"
                aria-label={T('lively_close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative flex justify-center py-4 bg-black/20">
              {portraitSrc ? (
                <div
                  className="relative w-[120px] h-[120px] rounded-full overflow-hidden ring-2 ring-white/15 shadow-lg"
                  style={
                    speaking
                      ? { boxShadow: `0 0 0 3px ${accent}88, 0 12px 28px rgba(0,0,0,0.35)` }
                      : { boxShadow: '0 12px 28px rgba(0,0,0,0.35)' }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={portraitSrc}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white/90" aria-hidden />
                    </div>
                  )}
                </div>
              ) : (
                <LivelyFaceSvg
                  model={model}
                  mouthShape={mouth}
                  speaking={speaking}
                  thinking={loading}
                  interactionKey={interactionKey}
                  replyPulse={nudgeKey}
                  speechDoneKey={speechEndKey}
                  accent={accent}
                />
              )}
              {speaking && (
                <span
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-70 z-[2]"
                  style={{ color: accent }}
                >
                  {T('lively_listen')}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm leading-relaxed min-h-[120px] max-h-[220px] whitespace-pre-wrap">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 ${msg.role === 'user' ? 'ml-6 bg-white/10' : 'mr-4 bg-black/25'}`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {T('lively_thinking')}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void send()}
                className="flex-1 rounded-xl px-3 py-2 text-sm bg-black/30 border border-white/15 outline-none focus:border-white/30"
                placeholder={T('lively_placeholder')}
                maxLength={2000}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="rounded-xl px-3 py-2 font-bold text-white disabled:opacity-40"
                style={{ background: accent }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => void ensureAudioCtx().then(() => setOpen((o) => !o))}
          className="flex items-center gap-2 rounded-full px-4 py-3 font-black text-sm text-white shadow-lg border border-white/20"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${model.accent})`,
          }}
        >
          <MessageCircle className="w-5 h-5" />
          {T('lively_open')}
        </button>
      </div>
    </>
  );
}
