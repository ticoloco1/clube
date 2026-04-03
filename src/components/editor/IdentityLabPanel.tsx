'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Mic, Sparkles, Upload, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  IDENTITY_STYLE_PRESETS,
  VOICE_EFFECT_IDS,
  type IdentityStyleId,
  type VoiceEffectId,
} from '@/lib/identityStylePresets';
import { playBufferWithVoiceEffect } from '@/lib/browserVoiceEffects';

type Props = {
  siteId: string;
  slug: string;
  aiFreeUsd: number;
  aiPaidUsd: number;
  identityPortraitUrl: string;
  setIdentityPortraitUrl: (v: string) => void;
  identityStylePreset: IdentityStyleId;
  setIdentityStylePreset: (v: IdentityStyleId) => void;
  identityVoiceEffect: VoiceEffectId;
  setIdentityVoiceEffect: (v: VoiceEffectId) => void;
  identityCloneVoiceId: string;
  setAvatarUrl: (v: string) => void;
  uploadToStorage: (file: File, folder: string) => Promise<string>;
  onMarkDirty: () => void;
  onReload: () => Promise<void>;
  T: (key: string) => string;
};

const LANGS = [
  { id: 'pt', labelKey: 'id_lang_pt' },
  { id: 'en', labelKey: 'id_lang_en' },
  { id: 'ja', labelKey: 'id_lang_ja' },
  { id: 'ko', labelKey: 'id_lang_ko' },
] as const;

function effectLabelKey(id: VoiceEffectId): string {
  const map: Record<VoiceEffectId, string> = {
    neutral: 'id_voice_effect_neutral',
    buccaneer: 'id_voice_effect_buccaneer',
    glitch: 'id_voice_effect_glitch',
    manga_hero: 'id_voice_effect_manga',
    galactic_knight: 'id_voice_effect_galactic',
  };
  return map[id];
}

export function IdentityLabPanel({
  siteId,
  slug,
  aiFreeUsd,
  aiPaidUsd,
  identityPortraitUrl,
  setIdentityPortraitUrl,
  identityStylePreset,
  setIdentityStylePreset,
  identityVoiceEffect,
  setIdentityVoiceEffect,
  identityCloneVoiceId,
  setAvatarUrl,
  uploadToStorage,
  onMarkDirty,
  onReload,
  T,
}: Props) {
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [greetingBusy, setGreetingBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [greetingLang, setGreetingLang] = useState<(typeof LANGS)[number]['id']>('pt');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCloneInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [camBusy, setCamBusy] = useState(false);
  const [sourceCaptureBusy, setSourceCaptureBusy] = useState(false);

  const stopSourceCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOpen(false);
  }, []);

  useEffect(() => () => stopSourceCamera(), [stopSourceCamera]);

  const onPickSource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) {
      toast.error(T('id_err_image'));
      return;
    }
    try {
      const url = await uploadToStorage(f, 'identity-source');
      setSourcePreview(url);
      onMarkDirty();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T('id_err_upload'));
    }
    e.target.value = '';
  };

  const openSourceCamera = async () => {
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

  const captureSourcePhoto = async () => {
    const v = videoRef.current;
    if (!v || v.videoWidth < 2) {
      toast.error(T('studio_err_camera_ready'));
      return;
    }
    setSourceCaptureBusy(true);
    try {
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('blob');
      stopSourceCamera();
      const file = new File([blob], `identity-source-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadToStorage(file, 'identity-source');
      setSourcePreview(url);
      onMarkDirty();
      toast.success(T('id_toast_source_ok'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : T('id_err_upload'));
    } finally {
      setSourceCaptureBusy(false);
    }
  };

  const onPickAudioClone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !f.type.startsWith('audio/')) {
      toast.error(T('id_err_audio_type'));
      return;
    }
    if (f.size < 5000) {
      toast.error(T('id_err_audio_short'));
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      toast.error(T('id_err_audio_large'));
      return;
    }
    setCloneBusy(true);
    try {
      const fd = new FormData();
      fd.append('siteId', siteId);
      fd.append('file', f);
      const res = await fetch('/api/identity/voice-clone', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('id_err_clone'));
        return;
      }
      toast.success(T('id_toast_clone_ok'));
      await onReload();
    } catch {
      toast.error(T('id_err_clone'));
    } finally {
      setCloneBusy(false);
    }
  };

  const runGeneratePortrait = async () => {
    if (!sourcePreview) {
      toast.error(T('id_err_need_photo'));
      return;
    }
    setPortraitBusy(true);
    try {
      const res = await fetch('/api/identity/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          imageUrl: sourcePreview,
          stylePreset: identityStylePreset,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('id_err_generic'));
        return;
      }
      const u = typeof data.portraitUrl === 'string' ? data.portraitUrl : '';
      if (u) {
        setIdentityPortraitUrl(u);
        onMarkDirty();
        toast.success(T('id_toast_portrait_ok'));
        await onReload();
      }
    } catch {
      toast.error(T('id_err_generic'));
    } finally {
      setPortraitBusy(false);
    }
  };

  const usePortraitAsAvatar = () => {
    if (!identityPortraitUrl) return;
    setAvatarUrl(identityPortraitUrl);
    onMarkDirty();
    toast.success(T('id_toast_avatar_ok'));
  };

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
      mediaRef.current = mr;
      mr.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch {
      toast.error(T('id_err_mic'));
    }
  };

  const stopRecordAndClone = async () => {
    const mr = mediaRef.current;
    if (!mr || mr.state === 'inactive') {
      setRecording(false);
      return;
    }
    setRecording(false);
    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];
    if (blob.size < 5000) {
      toast.error(T('id_err_audio_short'));
      return;
    }
    setCloneBusy(true);
    try {
      const fd = new FormData();
      fd.append('siteId', siteId);
      fd.append('file', new File([blob], 'voice-sample.webm', { type: 'audio/webm' }));
      const res = await fetch('/api/identity/voice-clone', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : T('id_err_clone'));
        return;
      }
      toast.success(T('id_toast_clone_ok'));
      await onReload();
    } catch {
      toast.error(T('id_err_clone'));
    } finally {
      setCloneBusy(false);
    }
  };

  const playGreetingPreview = async () => {
    if (!slug) return;
    setGreetingBusy(true);
    try {
      const res = await fetch('/api/identity/greeting-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, lang: greetingLang }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === 'string' ? data.error : T('id_err_greeting'));
        return;
      }
      const buf = await res.arrayBuffer();
      const ctx = new AudioContext();
      const audioBuf = await ctx.decodeAudioData(buf.slice(0));
      await playBufferWithVoiceEffect(ctx, audioBuf, identityVoiceEffect);
    } catch {
      toast.error(T('id_err_greeting'));
    } finally {
      setGreetingBusy(false);
    }
  };

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-black text-lg text-[var(--text)] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          {T('ed_identity_title')}
        </h2>
        <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed border-l-2 border-amber-500/40 pl-3 py-0.5">
          {T('ed_identity_intro')}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--bg2)]/40">
        <p className="text-sm font-bold text-[var(--text)]">{T('ed_identity_credits_title')}</p>
        <p className="text-sm text-[var(--text)] tabular-nums">
          <span className="font-bold text-brand">US${aiFreeUsd.toFixed(2)}</span>
          <span className="text-[var(--text2)]"> {T('ed_identity_ia_free_label')} </span>
          <span className="text-[var(--text2)]">·</span>
          <span className="font-bold text-brand"> US${aiPaidUsd.toFixed(2)}</span>
          <span className="text-[var(--text2)]"> {T('ed_identity_ia_paid_label')}</span>
        </p>
        <p className="text-[11px] text-[var(--text2)]">{T('ed_identity_credits_hint')}</p>
        <a href="/creditos" className="text-xs font-semibold text-brand hover:underline">
          {T('ed_identity_credits_link')}
        </a>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-[var(--text)]">{T('ed_identity_image_block')}</p>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickSource} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-sm" onClick={() => fileInputRef.current?.click()}>
            {T('ed_identity_upload_source')}
          </button>
          <button
            type="button"
            disabled={camBusy}
            onClick={() => void openSourceCamera()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold hover:border-amber-500/50"
          >
            {camBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {T('ed_identity_cam_open')}
          </button>
        </div>
        {sourcePreview ? (
          <div className="flex gap-4 items-start flex-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourcePreview} alt="" className="w-28 h-28 rounded-xl object-cover border border-[var(--border)]" />
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="label block">{T('ed_identity_style')}</label>
              <select
                className="input"
                value={identityStylePreset}
                onChange={(e) => {
                  setIdentityStylePreset(e.target.value as IdentityStyleId);
                  onMarkDirty();
                }}
              >
                {IDENTITY_STYLE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {T(p.labelKey)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={portraitBusy}
                onClick={() => void runGeneratePortrait()}
                className="btn-primary gap-2 text-sm mt-2"
              >
                {portraitBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {portraitBusy ? T('ed_identity_generating') : T('ed_identity_generate')}
              </button>
            </div>
          </div>
        ) : null}

        {identityPortraitUrl ? (
          <div className="rounded-xl border border-[var(--border)] p-4 flex flex-wrap gap-4 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={identityPortraitUrl} alt="" className="w-32 h-32 rounded-xl object-cover border border-[var(--border)]" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--text2)]">{T('ed_identity_portrait')}</p>
              <button type="button" onClick={usePortraitAsAvatar} className="btn-primary text-sm">
                {T('ed_identity_use_avatar')}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-[var(--border)] pt-6">
        <p className="text-sm font-bold text-[var(--text)]">{T('ed_identity_voice_title')}</p>
        <p className="text-[11px] text-[var(--text2)]">{T('ed_identity_record_hint')}</p>
        <input
          ref={audioCloneInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
          className="hidden"
          onChange={(ev) => void onPickAudioClone(ev)}
        />
        <div className="flex flex-wrap gap-2 items-center">
          {!recording ? (
            <button
              type="button"
              disabled={cloneBusy}
              onClick={() => void startRecord()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold hover:border-brand/50"
            >
              <Mic className="w-4 h-4" />
              {T('ed_identity_record_start')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopRecordAndClone()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-sm font-semibold"
            >
              {T('ed_identity_record_stop')}
            </button>
          )}
          <button
            type="button"
            disabled={cloneBusy || recording}
            onClick={() => audioCloneInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold hover:border-brand/50"
          >
            <Upload className="w-4 h-4" />
            {T('ed_identity_upload_audio')}
          </button>
          {cloneBusy ? <Loader2 className="w-5 h-5 animate-spin text-brand" /> : null}
        </div>
        {identityCloneVoiceId ? (
          <p className="text-xs font-mono text-green-400 break-all">
            {T('ed_identity_clone_voice_ok')}: {identityCloneVoiceId.slice(0, 12)}…
          </p>
        ) : (
          <p className="text-xs text-amber-400/90">{T('ed_identity_clone_missing')}</p>
        )}
      </div>

      <div className="space-y-3 border-t border-[var(--border)] pt-6">
        <label className="label block">{T('ed_identity_effect')}</label>
        <select
          className="input"
          value={identityVoiceEffect}
          onChange={(e) => {
            setIdentityVoiceEffect(e.target.value as VoiceEffectId);
            onMarkDirty();
          }}
        >
          {VOICE_EFFECT_IDS.map((id) => (
            <option key={id} value={id}>
              {T(effectLabelKey(id))}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[var(--text2)]">{T('ed_identity_effect_hint')}</p>

        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="label block text-xs">{T('ed_identity_lang')}</label>
            <select className="input" value={greetingLang} onChange={(e) => setGreetingLang(e.target.value as typeof greetingLang)}>
              {LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {T(l.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={greetingBusy || !identityCloneVoiceId}
            onClick={() => void playGreetingPreview()}
            className="flex items-center gap-2 btn-primary text-sm"
          >
            {greetingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            {T('ed_identity_play_greeting')}
          </button>
        </div>
      </div>

      {camOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          role="dialog"
          aria-modal
        >
          <div className="max-w-lg w-full rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg)] space-y-3">
            <p className="text-sm font-bold text-[var(--text)]">{T('ed_identity_cam_title')}</p>
            <video ref={videoRef} playsInline muted className="w-full rounded-xl bg-black aspect-[4/3] object-cover" />
            <div className="flex flex-wrap gap-2 justify-end">
              <button type="button" className="btn-secondary text-sm" onClick={stopSourceCamera}>
                {T('ed_identity_cam_cancel')}
              </button>
              <button
                type="button"
                disabled={sourceCaptureBusy}
                onClick={() => void captureSourcePhoto()}
                className="btn-primary text-sm gap-2"
              >
                {sourceCaptureBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {T('ed_identity_cam_capture')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
