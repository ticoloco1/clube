'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { resolveLivelyModel } from '@/lib/livelyAvatarModels';
import { buildVisemeKeyframes, visemeAtTime, type VisemeShape } from '@/lib/visemesFromText';
import { defaultElevenVoice } from '@/lib/elevenLabsTts';
import type { LivelyTtsProvider } from '@/lib/livelyTtsPreference';

/** Boca desenhada no rosto cartoon (SVG). */
const CARTOON_MOUTH: Record<VisemeShape, { ry: number; rx: number; cy: number }> = {
  sil: { ry: 3, rx: 14, cy: 52 },
  neutral: { ry: 5, rx: 18, cy: 51 },
  open: { ry: 14, rx: 16, cy: 54 },
  round: { ry: 11, rx: 12, cy: 53 },
  smile: { ry: 4, rx: 22, cy: 50 },
  fricative: { ry: 5, rx: 20, cy: 51 },
  plosive: { ry: 2, rx: 16, cy: 51 },
  wide: { ry: 7, rx: 20, cy: 52 },
};

/** Boca sobreposta à foto real (coordenadas % do viewBox). */
const PHOTO_MOUTH: Record<VisemeShape, { ry: number; rx: number; cy: number }> = {
  sil: { ry: 1.4, rx: 7.5, cy: 71 },
  neutral: { ry: 2.2, rx: 9.5, cy: 71 },
  open: { ry: 10, rx: 11, cy: 73 },
  round: { ry: 8, rx: 9, cy: 72.5 },
  smile: { ry: 2.8, rx: 12, cy: 70 },
  fricative: { ry: 2.8, rx: 11, cy: 71 },
  plosive: { ry: 1.2, rx: 9, cy: 71 },
  wide: { ry: 5, rx: 11, cy: 71.5 },
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
  /** Preferência de TTS (guardada no mini-site). */
  ttsProvider?: LivelyTtsProvider;
  /** Foto de perfil ou retrato — quando existe, mostra a foto a “falar” em vez do rosto redondo cartoon. */
  photoSrc?: string | null;
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
  ttsProvider = 'auto',
  photoSrc,
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const usePhoto = Boolean(photoSrc && photoSrc.trim());
  const mouthMap = usePhoto ? PHOTO_MOUTH : CARTOON_MOUTH;
  const m = mouthMap[mouth];

  const stopLipSync = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lipSyncRef.current = null;
    setMouth('sil');
    setSpeaking(false);
  }, []);

  useEffect(() => () => stopLipSync(), [stopLipSync]);

  const onMovePhoto = useCallback((e: MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const nx = (e.clientX - cx) / Math.max(r.width * 0.5, 1);
    const ny = (e.clientY - cy) / Math.max(r.height * 0.5, 1);
    setTilt({
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    });
  }, []);

  useEffect(() => {
    if (!usePhoto) return;
    window.addEventListener('mousemove', onMovePhoto);
    return () => window.removeEventListener('mousemove', onMovePhoto);
  }, [usePhoto, onMovePhoto]);

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

  const fetchOpenAiTts = useCallback(
    async (t: string) => {
      const res = await fetch('/api/lively-avatar/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, text: t }),
      });
      if (!res.ok || !res.headers.get('Content-Type')?.includes('audio')) return null;
      return res.arrayBuffer();
    },
    [slug],
  );

  const fetchElevenTts = useCallback(
    async (t: string, voiceId: string) => {
      const res = await fetch('/api/lively-avatar/tts-eleven', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, text: t, voiceId }),
      });
      if (!res.ok || !res.headers.get('Content-Type')?.includes('audio')) return null;
      return res.arrayBuffer();
    },
    [slug],
  );

  const playLine = useCallback(
    async (text: string) => {
      const t = text.replace(/\s+/g, ' ').trim().slice(0, 2500);
      if (!t) return;
      const vid = voiceAgent.trim() || defaultElevenVoice('agent');
      try {
        if (ttsProvider === 'openai') {
          const buf = await fetchOpenAiTts(t);
          if (buf) await playAudioWithVisemes(t, buf);
          return;
        }
        if (ttsProvider === 'elevenlabs') {
          if (vid) {
            const buf = await fetchElevenTts(t, vid);
            if (buf) {
              await playAudioWithVisemes(t, buf);
              return;
            }
          }
          const fallback = await fetchOpenAiTts(t);
          if (fallback) await playAudioWithVisemes(t, fallback);
          return;
        }
        // auto: ElevenLabs se houver voice id e API ok, senão OpenAI
        if (vid) {
          const buf = await fetchElevenTts(t, vid);
          if (buf) {
            await playAudioWithVisemes(t, buf);
            return;
          }
        }
        const buf2 = await fetchOpenAiTts(t);
        if (buf2) await playAudioWithVisemes(t, buf2);
      } catch {
        stopLipSync();
      }
    },
    [voiceAgent, ttsProvider, fetchOpenAiTts, fetchElevenTts, playAudioWithVisemes, stopLipSync],
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

  const svgSize = Math.min(size, 320);

  const photoInner = usePhoto ? (
    <div
      ref={wrapRef}
      className="relative overflow-hidden"
      style={{
        width: svgSize,
        height: svgSize,
        borderRadius: 'inherit',
        transform: `perspective(480px) rotateY(${tilt.x * 10}deg) rotateX(${-tilt.y * 8}deg)`,
        transition: 'transform 0.14s ease-out',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoSrc!.trim()}
        alt=""
        width={svgSize}
        height={svgSize}
        draggable={false}
        className="block w-full h-full object-cover"
        style={{
          objectPosition: '50% 28%',
          transform: speaking ? 'scale(1.03)' : 'scale(1)',
          transition: 'transform 0.15s ease-out',
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
        style={{ mixBlendMode: 'multiply' }}
      >
        <ellipse
          cx={50}
          cy={m.cy}
          rx={m.rx}
          ry={m.ry}
          fill="rgba(35,18,22,0.62)"
          style={{ transition: 'none' }}
        />
      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/25 to-transparent opacity-80"
        aria-hidden
      />
    </div>
  ) : (
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
  );

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
      {photoInner}
      {speechTap.trim() ? (
        <span
          className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full z-10"
          style={{ background: `${accent}44`, color: accent }}
        >
          ▶
        </span>
      ) : null}
    </button>
  );
}
