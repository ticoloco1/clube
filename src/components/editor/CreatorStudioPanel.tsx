'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Camera, ExternalLink, Loader2, Mic, MicOff, Smartphone, Upload } from 'lucide-react';
import { resolveLivelyModel } from '@/lib/livelyAvatarModels';
import { toast } from 'sonner';

type DictateTarget = 'welcome' | 'instructions';

/** Subconjunto da Web Speech API (webkit em vários browsers). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { resultIndex: number; results: SpeechRecognitionResultListLike }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionResultListLike = {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
};

type Props = {
  avatarUrl: string;
  setAvatarUrl: (v: string) => void;
  livelyAvatarWelcome: string;
  setLivelyAvatarWelcome: Dispatch<SetStateAction<string>>;
  livelyAgentInstructions: string;
  setLivelyAgentInstructions: Dispatch<SetStateAction<string>>;
  uploadToStorage: (file: File, folder: string) => Promise<string>;
  onMarkDirty: () => void;
  T: (key: string) => string;
  /** Mini-site slug → “see on site” link */
  previewSlug?: string | null;
  accentColor?: string;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function CreatorStudioPanel({
  avatarUrl,
  setAvatarUrl,
  livelyAvatarWelcome,
  setLivelyAvatarWelcome,
  livelyAgentInstructions,
  setLivelyAgentInstructions,
  uploadToStorage,
  onMarkDirty,
  T,
  previewSlug,
  accentColor = '#818cf8',
}: Props) {
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [camBusy, setCamBusy] = useState(false);
  const [avatarUploadBusy, setAvatarUploadBusy] = useState(false);

  const [dictTarget, setDictTarget] = useState<DictateTarget>('welcome');
  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOpen(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    return () => {
      try {
        recogRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const openCamera = async () => {
    setCamBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOpen(true);
      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          void v.play().catch(() => {});
        }
      });
    } catch {
      toast.error(T('studio_err_camera'));
    } finally {
      setCamBusy(false);
    }
  };

  const captureFrame = async () => {
    const v = videoRef.current;
    if (!v || v.videoWidth < 2) {
      toast.error(T('studio_err_camera_ready'));
      return;
    }
    setAvatarUploadBusy(true);
    try {
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('blob');
      stopCamera();
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadToStorage(file, 'avatars');
      setAvatarUrl(url);
      onMarkDirty();
      toast.success(T('studio_toast_avatar'));
    } catch {
      toast.error(T('toast_upload_failed'));
    } finally {
      setAvatarUploadBusy(false);
    }
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !f.type.startsWith('image/')) {
      toast.error(T('id_err_image'));
      return;
    }
    setAvatarUploadBusy(true);
    try {
      const url = await uploadToStorage(f, 'avatars');
      setAvatarUrl(url);
      onMarkDirty();
      toast.success(T('studio_toast_avatar'));
    } catch {
      toast.error(T('toast_upload_failed'));
    } finally {
      setAvatarUploadBusy(false);
    }
  };

  const startDictation = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error(T('studio_err_speech_api'));
      return;
    }
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
    const lang = typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en-US' : 'pt-BR';
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (ev) => {
      let chunk = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (!ev.results[i].isFinal) continue;
        chunk += ev.results[i][0].transcript;
      }
      if (!chunk.trim()) return;
      if (dictTarget === 'welcome') {
        setLivelyAvatarWelcome((prev) => `${prev} ${chunk}`.trim().slice(0, 500));
      } else {
        setLivelyAgentInstructions((prev) => `${prev} ${chunk}`.trim().slice(0, 2000));
      }
      onMarkDirty();
    };
    r.onerror = () => {
      setListening(false);
    };
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
    toast.message(T('studio_dictate_started'));
  };

  const stopDictation = () => {
    try {
      recogRef.current?.stop();
    } catch {
      /* ignore */
    }
    recogRef.current = null;
    setListening(false);
  };

  const model = resolveLivelyModel('neo');

  return (
    <div className="card p-6 space-y-6 border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.08] via-[var(--bg)] to-violet-500/[0.06] shadow-lg shadow-cyan-500/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-black text-lg text-[var(--text)] tracking-tight">{T('studio_title')}</h2>
          <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed max-w-xl">{T('studio_intro')}</p>
        </div>
        {previewSlug ? (
          <a
            href={`/s/${encodeURIComponent(previewSlug)}?manage=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border border-cyan-500/35 text-cyan-200 hover:bg-cyan-500/10 shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5" />
            {T('studio_preview_on_site')}
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_200px] gap-6 items-start">
        {/* Avatar + actions */}
        <div className="rounded-2xl border border-[var(--border)] p-4 space-y-4 bg-[var(--bg2)]/40">
          <p className="text-sm font-bold text-[var(--text)]">{T('studio_avatar_section')}</p>
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-offset-2 ring-offset-[var(--bg2)]"
              style={{
                boxShadow: `0 0 0 2px ${accentColor}, 0 12px 40px ${accentColor}33`,
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-lg font-black text-white/90"
                  style={{
                    background: `linear-gradient(135deg, ${model.skin}, ${model.accent})`,
                  }}
                >
                  ?
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onAvatarFile(e)} />
              <button
                type="button"
                disabled={camBusy || avatarUploadBusy}
                onClick={() => void openCamera()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold hover:border-cyan-500/50 bg-[var(--bg)]/80"
              >
                {camBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {T('studio_open_camera')}
              </button>
              <button
                type="button"
                disabled={avatarUploadBusy}
                onClick={() => avatarFileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold hover:border-cyan-500/50 bg-[var(--bg)]/80"
              >
                <Upload className="w-4 h-4" />
                {T('studio_upload_file')}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text2)] leading-relaxed">{T('studio_avatar_ring_hint')}</p>
        </div>

        {/* Phone frame preview */}
        <div className="flex justify-center lg:justify-end">
          <div
            className="relative w-[168px] rounded-[2rem] border-[3px] border-[var(--border)] bg-zinc-950 p-2 shadow-2xl"
            style={{ boxShadow: `0 24px 60px -12px ${accentColor}44` }}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-zinc-700 z-10" />
            <div className="mt-4 rounded-[1.35rem] overflow-hidden bg-zinc-900 aspect-[9/16] flex flex-col">
              <div className="h-14 shrink-0 bg-gradient-to-r from-zinc-800 to-zinc-900 border-b border-white/5" />
              <div className="flex-1 flex flex-col items-center justify-center p-3 gap-2">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden border-2"
                  style={{ borderColor: accentColor }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: `linear-gradient(135deg, ${model.skin}, ${model.accent})` }}
                    />
                  )}
                </div>
                <p className="text-[8px] text-zinc-500 text-center leading-tight px-1">{T('studio_phone_mock_hint')}</p>
                <div
                  className="mt-auto w-full py-1.5 rounded-full text-[8px] font-black text-center text-white"
                  style={{ background: `linear-gradient(90deg, ${accentColor}, ${model.accent})` }}
                >
                  AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dictation → assistant texts */}
      <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--bg2)]/50">
        <p className="text-sm font-bold text-[var(--text)]">{T('studio_dictate_section')}</p>
        <p className="text-[11px] text-[var(--text2)]">{T('studio_dictate_hint')}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs font-semibold text-[var(--text2)]">{T('studio_dictate_where')}</label>
          <select
            className="input py-1.5 text-sm max-w-xs"
            value={dictTarget}
            onChange={(e) => setDictTarget(e.target.value as DictateTarget)}
            disabled={listening}
          >
            <option value="welcome">{T('studio_dictate_welcome')}</option>
            <option value="instructions">{T('studio_dictate_instructions')}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {!listening ? (
            <button
              type="button"
              onClick={startDictation}
              className="flex items-center gap-2 btn-primary text-sm"
            >
              <Mic className="w-4 h-4" />
              {T('studio_dictate_start')}
            </button>
          ) : (
            <button type="button" onClick={stopDictation} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-sm font-semibold">
              <MicOff className="w-4 h-4" />
              {T('studio_dictate_stop')}
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
          <div className="rounded-lg border border-[var(--border)] p-2 max-h-24 overflow-y-auto bg-[var(--bg)]/80">
            <span className="font-bold text-[var(--text2)]">{T('studio_preview_welcome')}</span>
            <p className="text-[var(--text)] mt-1 whitespace-pre-wrap">{livelyAvatarWelcome || '—'}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-2 max-h-24 overflow-y-auto bg-[var(--bg)]/80">
            <span className="font-bold text-[var(--text2)]">{T('studio_preview_instructions')}</span>
            <p className="text-[var(--text)] mt-1 whitespace-pre-wrap">{livelyAgentInstructions || '—'}</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text2)] border-t border-[var(--border)] pt-4">{T('studio_identity_down_hint')}</p>

      {camOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          role="dialog"
          aria-modal
        >
          <div className="max-w-lg w-full rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg)] space-y-3">
            <p className="text-sm font-bold text-[var(--text)]">{T('studio_camera_title')}</p>
            <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black aspect-[4/3] object-cover" />
            <div className="flex flex-wrap gap-2 justify-end">
              <button type="button" className="btn-secondary text-sm" onClick={stopCamera}>
                {T('studio_camera_cancel')}
              </button>
              <button
                type="button"
                disabled={avatarUploadBusy}
                onClick={() => void captureFrame()}
                className="btn-primary text-sm gap-2"
              >
                {avatarUploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {T('studio_camera_capture')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
