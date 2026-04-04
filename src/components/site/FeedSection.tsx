'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { youtubeWatchUrlToEmbedUrl } from '@/lib/embedHtml';
import { Image as ImageIcon, X, Pin, Loader2, Send } from 'lucide-react';

interface FeedSectionProps {
  siteId: string;
  /** Dono, admin ou e-mail de contacto do site — quem pode publicar no feed público. */
  canPost: boolean;
  accentColor?: string;
  isDark?: boolean;
  textColor?: string;
  onPost?: () => void;
}

export function FeedSection({ siteId, canPost, accentColor = '#818cf8', isDark = true, textColor, onPost }: FeedSectionProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
  const [pinning, setPinning] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const T = useT();
  if (!canPost) return null;

  const toEmbedUrl = (raw: string) => {
    const value = raw.trim();
    if (!value) return '';
    if (/youtu/i.test(value)) return youtubeWatchUrlToEmbedUrl(value);
    if (value.includes('vimeo.com/')) {
      const id = value.split('vimeo.com/')[1]?.split('?')[0];
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }
    return value.includes('/embed/') ? value : '';
  };

  const maxFeedImages = 3;
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).slice(0, maxFeedImages - imageFiles.length);
    if (!picked.length) return;
    const oversized = picked.some(file => file.size > 5 * 1024 * 1024);
    if (oversized) { toast.error(T('err_image_max_5mb')); return; }
    setImageFiles(prev => [...prev, ...picked].slice(0, maxFeedImages));
    picked.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setImagePreviews(prev => [...prev, reader.result as string].slice(0, maxFeedImages));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0 && fileRef.current) fileRef.current.value = '';
      return next;
    });
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const post = async (pinIt: boolean) => {
    if (!text.trim() && imageFiles.length === 0 && !videoEmbedUrl.trim()) return;
    if (!user) {
      toast.error(T('rte_image_login'));
      return;
    }

    setPosting(true);
    if (pinIt) setPinning(true);

    try {
      const uploaded = await Promise.all(imageFiles.map(file => uploadFile(file, 'feed', user.id)));
      const embedUrl = toEmbedUrl(videoEmbedUrl);

      const expiresAt = pinIt
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

      const { error } = await (supabase as any).from('feed_posts').insert({
        site_id: siteId,
        user_id: user.id,
        text: text.trim() || null,
        image_url: uploaded[0] || null,
        media_urls: uploaded,
        video_embed_url: embedUrl || null,
        pinned: pinIt,
        expires_at: expiresAt,
      });

      if (error) throw error;

      // Charge $10 for pin
      if (pinIt) {
        // Add to cart for payment
        toast.success(T('toast_post_pinned_trial'));
      } else {
        toast.success(T('toast_post_published_week'));
      }

      setText('');
      setImageFiles([]);
      setImagePreviews([]);
      setVideoEmbedUrl('');
      if (fileRef.current) fileRef.current.value = '';
      onPost?.();
    } catch (err: any) {
      toast.error(err.message || T('toast_post_publish_error'));
    } finally {
      setPosting(false);
      setPinning(false);
    }
  };

  return (
    <div style={{
      padding: '16px',
      borderRadius: 16,
      border: `1.5px solid rgba(255,255,255,0.08)`,
      background: 'rgba(255,255,255,0.04)',
      marginBottom: 20,
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: accentColor, opacity: 0.8 }}>
        New post
      </p>

      {/* Text input */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={T('fd_post_placeholder')}
        maxLength={500}
        rows={3}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
          color: textColor || (isDark ? '#e6edf3' : '#1a1a2e'), fontSize: 14, fontFamily: 'inherit',
          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          lineHeight: 1.6,
        }}
      />

      {/* Image preview — até 3 por post */}
      {imagePreviews.length > 0 && (
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: `repeat(${Math.min(imagePreviews.length, maxFeedImages)}, minmax(0,1fr))`, gap: 8 }}>
          {imagePreviews.map((preview, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={preview} style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 10, objectFit: 'cover', display: 'block' }} />
              <button onClick={() => removeImage(i)}
                style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        value={videoEmbedUrl}
        onChange={e => setVideoEmbedUrl(e.target.value)}
        className="input"
        placeholder="Video embed link (YouTube/Vimeo)"
        style={{ marginTop: 8 }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        {/* Image upload */}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={imageFiles.length >= maxFeedImages}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: imageFiles.length >= maxFeedImages ? 'not-allowed' : 'pointer', opacity: imageFiles.length >= maxFeedImages ? 0.45 : 1 }}>
          <ImageIcon style={{ width: 14, height: 14 }} />
          Photo ({imageFiles.length}/{maxFeedImages})
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImage} />

        <div style={{ flex: 1 }} />

        {/* Pin button - $10 USD (Stripe) */}
        <button onClick={() => post(true)} disabled={posting || (!text.trim() && imageFiles.length === 0 && !videoEmbedUrl.trim())}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (posting || (!text.trim() && imageFiles.length === 0 && !videoEmbedUrl.trim())) ? 0.4 : 1 }}>
          {pinning ? <Loader2 style={{ width: 13, height: 13, animation: 'spin .8s linear infinite' }} /> : <Pin style={{ width: 13, height: 13 }} />}
          📌 Pin · $10
        </button>

        {/* Post button */}
        <button onClick={() => post(false)} disabled={posting || (!text.trim() && imageFiles.length === 0 && !videoEmbedUrl.trim())}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, background: accentColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (posting || (!text.trim() && imageFiles.length === 0 && !videoEmbedUrl.trim())) ? 0.4 : 1 }}>
          {posting && !pinning ? <Loader2 style={{ width: 13, height: 13, animation: 'spin .8s linear infinite' }} /> : <Send style={{ width: 13, height: 13 }} />}
          Publish
        </button>
      </div>

      <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
        Posts expire in 7 days · Pinned posts stay for 365 days for $10 USD (Stripe)
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
