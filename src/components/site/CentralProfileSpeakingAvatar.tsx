'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { resolveLivelyModel } from '@/lib/livelyAvatarModels';
import { buildVisemeKeyframes, visemeAtTime, type VisemeShape } from '@/lib/visemesFromText';
import { defaultElevenVoice } from '@/lib/elevenLabsTts';

const MOUTH: Record<VisemeShape, { ry: number; rx: number; cy: number }> = {
  sil: { ry: 3, rx: 14, cy: 52 },
  neutral: { ry: 5, rx: 18, cy: 51 },
  open: { ry: 14, rx: 16, cy: 54 },
  round: { ry: 11, rx: 12, cy: 53 },
  smile: { ry: 4, rx: 22, cy: 50 },
  fricative: { ry: 5, rx: 20, cy: 51 },
  plosive: { ry: 2, rx: 16, cy: 51 },
  wide: { ry: 7, rx: 20, cy: 52 },
};

type Props = {
  slug: string;
  siteName: string;
  welcome: string;
  speakOnEntry: boolean;
  speechTap: string;
  modelId?: string | null;
  accent: string;
  voiceAgent: string;
  size: number;
  borderRadius: string;
  border: string;
  pageBg: string;
};

export function CentralProfileSpeakingAvatar({
  slug,
  siteName,
  welcome,
  speakOnEntry,
  speechTap,
  modelId,
  accent,
  voiceAgent,
  size,
  borderRadius,
  border,
  pageBg,
}: Props) {
  const model = resolveLivelyModel(modelId || undefined);
  const [mouth, setMouth] = useState<VisemeShape>('sil');
  const [speaking, setSpeaking] = useState(false);
  const entryPlayed = useRef(false);
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

  const playAudioWithVisemes = useCallback(
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

  const playLine = useCallback(
    async (text: string) => {
      const t = text.replace(/\s+/g, ' ').trim().slice(0, 2500);
      if (!t) return;
      const vid = voiceAgent.trim() || defaultElevenVoice('agent');
      try {
        if (vid) {
          const res = await fetch('/api/lively-avatar/tts-eleven', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, text: t, voiceId: vid }),
          });
          if (res.ok && res.headers.get('Content-Type')?.includes('audio')) {
            const buf = await res.arrayBuffer();
            await playAudioWithVisemes(t, buf);
            return;
          }
        }
        const res2 = await fetch('/api/lively-avatar/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, text: t }),
        });
        if (res2.ok && res2.headers.get('Content-Type')?.includes('audio')) {
          const buf = await res2.arrayBuffer();
          await playAudioWithVisemes(t, buf);
        }
      } catch {
        stopLipSync();
      }
    },
    [slug, voiceAgent, playAudioWithVisemes, stopLipSync],
  );

  const entryText =
    welcome.trim() ||
    (typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en')
      ? `Hi! I'm ${siteName}'s assistant. Tap the chat to talk.`
      : `Olá! Sou o assistente de ${siteName}. Abre o chat para falares comigo.`);

  useEffect(() => {
    if (!speakOnEntry || entryPlayed.current) return;
    entryPlayed.current = true;
    void playLine(entryText);
  }, [speakOnEntry, entryText, playLine]);

  const onTap = () => {
    const tap = speechTap.trim();
    if (tap) void playLine(tap);
  };

  const m = MOUTH[mouth];
  const svgSize = Math.min(size, 200);

  return (
    <button
      type="button"
      onClick={onTap}
      className="relative inline-block cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={
        {
          borderRadius,
          border,
          background: pageBg,
          padding: 4,
          boxShadow: speaking ? `0 0 0 2px ${accent}88` : undefined,
        } as CSSProperties
      }
      aria-label={speechTap.trim() ? 'Avatar — tocar para ouvir' : 'Avatar animado'}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 100 100"
        aria-hidden
        style={{ display: 'block', borderRadius: 'inherit' }}
      >
        <defs>
          <linearGradient id="cp-lg-face" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={model.skin} />
            <stop offset="100%" stopColor={model.accent} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="44" fill="url(#cp-lg-face)" stroke={model.accent} strokeWidth="2" />
        <ellipse cx="38" cy="42" rx="5" ry="7" fill={model.mouthStroke} opacity="0.85" />
        <ellipse cx="62" cy="42" rx="5" ry="7" fill={model.mouthStroke} opacity="0.85" />
        <ellipse cx="50" cy={m.cy} rx={m.rx * 0.45} ry={m.ry * 0.45} fill={model.mouthStroke} />
      </svg>
      {speechTap.trim() ? (
        <span
          className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${accent}33`, color: accent }}
        >
          ▶
        </span>
      ) : null}
    </button>
  );
}
