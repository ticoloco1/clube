'use client';

import { useEffect, useRef, useState } from 'react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { mergePageRichContent, splitPageRichContent } from '@/lib/embedHtml';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { Image as ImgIcon, Loader2, X } from 'lucide-react';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|svg)$/i;

function isLikelyImageFile(f: File): boolean {
  if (f.type.startsWith('image/')) return true;
  if (!f.type && IMAGE_EXT.test(f.name)) return true;
  return false;
}

function normalizeHttpsUrl(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('//')) t = `https:${t}`;
  return t;
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editorKey: string;
};

export function PageRichEditor({ value, onChange, placeholder, editorKey }: Props) {
  const T = useT();
  const skipNextPropSync = useRef(false);
  const [body, setBody] = useState('');
  const [img0, setImg0] = useState('');
  const [img1, setImg1] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<0 | 1 | null>(null);
  const latestRef = useRef({ body: '', img0: '', img1: '', videoUrl: '' });
  latestRef.current = { body, img0, img1, videoUrl };

  const emit = (b: string, i0: string, i1: string, v: string) => {
    skipNextPropSync.current = true;
    onChange(mergePageRichContent(b, [i0, i1], v));
  };

  useEffect(() => {
    if (skipNextPropSync.current) {
      skipNextPropSync.current = false;
      return;
    }
    const p = splitPageRichContent(value || '');
    setBody(p.body);
    setImg0(p.images[0] || '');
    setImg1(p.images[1] || '');
    setVideoUrl(p.videoEmbedUrl || '');
  }, [value]);

  const uploadToSlot = async (file: File, slot: 0 | 1) => {
    if (!isLikelyImageFile(file)) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error(T('err_image_max_5mb'));
      return;
    }
    setUploadingSlot(slot);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error(T('rte_image_login'));
        return;
      }
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
      const path = `${session.user.id}/pages/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('platform-assets').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
      });
      if (upErr) {
        toast.error(upErr.message || T('rte_image_upload_fail'));
        return;
      }
      const { data: pub } = supabase.storage.from('platform-assets').getPublicUrl(path);
      const url = normalizeHttpsUrl(pub.publicUrl || '');
      if (!/^https:\/\//i.test(url)) {
        toast.error(T('rte_image_upload_fail'));
        return;
      }
      const cur = latestRef.current;
      if (slot === 0) {
        setImg0(url);
        emit(cur.body, url, cur.img1, cur.videoUrl);
      } else {
        setImg1(url);
        emit(cur.body, cur.img0, url, cur.videoUrl);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : T('rte_image_upload_fail'));
    } finally {
      setUploadingSlot(null);
    }
  };

  return (
    <div className="space-y-3">
      <RichTextEditor
        showToolbarMedia={false}
        editorKey={editorKey}
        value={body}
        onChange={(b) => {
          setBody(b);
          emit(b, img0, img1, videoUrl);
        }}
        placeholder={placeholder}
      />
      <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg2)] p-4 space-y-3">
        <p className="text-xs font-bold text-[var(--text2)] uppercase tracking-wide">{T('ed_page_media_block_title')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([0, 1] as const).map((slot) => (
            <div key={slot} className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="text-[11px] font-bold text-[var(--text2)] mb-2">
                {T('ed_page_media_slot').replace('{n}', String(slot + 1))}
              </p>
              {(slot === 0 ? img0 : img1) ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={slot === 0 ? img0 : img1}
                    alt=""
                    className="w-full max-h-48 object-cover rounded-lg block"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (slot === 0) {
                        setImg0('');
                        emit(body, '', img1, videoUrl);
                      } else {
                        setImg1('');
                        emit(body, img0, '', videoUrl);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black/90"
                    aria-label={T('ed_page_media_remove')}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center min-h-[100px] rounded-lg border border-dashed border-[var(--border)] cursor-pointer hover:border-brand/40 transition-colors">
                  {uploadingSlot === slot ? (
                    <Loader2 className="animate-spin text-[var(--text2)]" size={22} />
                  ) : (
                    <ImgIcon className="text-[var(--text2)]" size={22} />
                  )}
                  <span className="text-[10px] text-[var(--text2)] mt-1 text-center px-1">{T('ed_page_media_add_photo')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingSlot !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void uploadToSlot(f, slot);
                    }}
                  />
                </label>
              )}
            </div>
          ))}
        </div>
        <div>
          <label className="label block text-xs mb-1">{T('ed_page_media_video_label')}</label>
          <input
            className="input text-sm"
            value={videoUrl}
            onChange={(e) => {
              const v = e.target.value;
              setVideoUrl(v);
              emit(body, img0, img1, v);
            }}
            placeholder={T('rte_embed_ph')}
          />
        </div>
      </div>
    </div>
  );
}
