/**
 * Div invisível entre o HTML do editor e o bloco de mídia.
 * Comentários HTML (`<!-- -->`) podem ser removidos ao guardar/rehidratar e partiam o split.
 */
export const PAGE_MEDIA_SPLIT_HTML =
  '<div class="tb-page-split" data-trustbank-page-media="1" aria-hidden="true" style="display:none">&#8203;</div>';

/** Legado — ainda aceite em splitPageRichContent. */
export const PAGE_MEDIA_MARKER = '<!--trustbank-page-media-->';

function normalizeHttpsUrl(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('//')) t = `https:${t}`;
  return t;
}

/** src seguro para iframe: só https. */
export function safeIframeSrc(raw: string): string | null {
  const t = normalizeHttpsUrl(raw);
  if (!t) return null;
  try {
    const u = t.includes('://') ? new URL(t) : new URL(`https://${t}`);
    if (u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** YouTube / Vimeo / URL já em formato embed. */
export function resolveVideoEmbedUrl(raw: string): string {
  let url = raw.trim().replace(/^\/\//, 'https://');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (/youtu\.?be|youtube\.com/i.test(url)) return youtubeWatchUrlToEmbedUrl(url);
  if (/vimeo\.com/i.test(url)) {
    const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    if (id) return `https://player.vimeo.com/video/${id}`;
  }
  return url;
}

/** Converte URLs de visualização YouTube para /embed/ (iframe). */
export function youtubeWatchUrlToEmbedUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  const lower = u.toLowerCase();
  if (!lower.includes('youtu')) return u;
  const id =
    u.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1] ||
    u.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    u.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    u.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    u.match(/youtube\.com\/live\/([A-Za-z0-9_-]{6,})/)?.[1];
  if (!id) return u;
  if (lower.includes('youtube-nocookie.com')) return `https://www.youtube-nocookie.com/embed/${id}`;
  return `https://www.youtube.com/embed/${id}`;
}

/** Normaliza iframes YouTube no HTML (aspas simples ou duplas). */
export function normalizeRichEmbeds(html?: string): string {
  if (!html) return '';
  const fixIframes = (s: string, q: '"' | "'") => {
    const re =
      q === '"'
        ? /<iframe([^>]*?)\bsrc\s*=\s*"([^"]*)"/gi
        : /<iframe([^>]*?)\bsrc\s*=\s*'([^']*)'/gi;
    return s.replace(re, (full, attrs: string, src: string) => {
      if (!/youtu/i.test(src)) return full;
      const embed = youtubeWatchUrlToEmbedUrl(src);
      return `<iframe${attrs}src=${q}${embed}${q}`;
    });
  };
  let out = fixIframes(html, '"');
  out = fixIframes(out, "'");
  return out;
}

/**
 * Conteúdo “válido” para mostrar o bloco rich: texto OU media (img/iframe/video).
 * Antes, só imagens/iframes sem texto eram tratados como vazio e a página 2/3 ficava em branco.
 */
export function hasDisplayableRichHtml(html?: string): boolean {
  if (!html?.trim()) return false;
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
  const text = stripped.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\u200b/g, '').trim();
  if (text.length > 0) return true;
  if (/\btb-page-media\b|data-trustbank-page-media/i.test(stripped)) return true;
  return /<(img|iframe|picture|video|figure)\b/i.test(stripped);
}

function parseMediaTail(tail: string): { images: string[]; videoEmbedUrl: string } {
  const images: string[] = [];
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(tail)) !== null && images.length < 2) {
    images.push(m[1]);
  }
  let videoEmbedUrl = '';
  const iframeMatch = tail.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch) videoEmbedUrl = iframeMatch[1];
  return { images, videoEmbedUrl };
}

export function splitPageRichContent(html: string): { body: string; images: string[]; videoEmbedUrl: string } {
  let idx = html.indexOf(PAGE_MEDIA_SPLIT_HTML);
  let splitLen = PAGE_MEDIA_SPLIT_HTML.length;
  if (idx < 0) {
    idx = html.indexOf(PAGE_MEDIA_MARKER);
    splitLen = PAGE_MEDIA_MARKER.length;
  }
  const body = (idx >= 0 ? html.slice(0, idx) : html).trimEnd();
  const tail = idx >= 0 ? html.slice(idx + splitLen) : '';
  const { images, videoEmbedUrl } = parseMediaTail(tail);
  return { body, images, videoEmbedUrl };
}

export function mergePageRichContent(body: string, images: string[], videoEmbedUrl: string): string {
  const esc = (s: string) => s.replace(/"/g, '&quot;');
  const imgs = images.map((u) => u.trim()).filter(Boolean).slice(0, 2);
  const vRaw = videoEmbedUrl.trim();
  const resolved = vRaw ? resolveVideoEmbedUrl(vRaw) : '';
  const safeVideo = resolved ? safeIframeSrc(resolved) : null;
  let inner = '';
  if (imgs.length) {
    const cols = imgs.length === 1 ? '1fr' : 'repeat(2,1fr)';
    inner += `<div class="tb-page-media-grid" style="display:grid;grid-template-columns:${cols};gap:12px;">`;
    for (const url of imgs) {
      inner += `<img src="${esc(url)}" alt="" class="tb-page-media-img" style="width:100%;max-width:100%;height:auto;border-radius:12px;display:block;object-fit:contain;vertical-align:middle;background:rgba(0,0,0,0.06);" loading="lazy" />`;
    }
    inner += `</div>`;
  }
  if (safeVideo) {
    inner += `<div class="trust-video-wrapper" style="position:relative;padding-bottom:56.25%;height:0;margin:20px 0 0;border-radius:16px;overflow:hidden;">
      <iframe src="${esc(safeVideo)}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy"></iframe>
    </div>`;
  }
  if (!inner) return body || '';
  return `${body || ''}${PAGE_MEDIA_SPLIT_HTML}<div class="tb-page-media" style="margin-top:16px;">${inner}</div>`;
}
