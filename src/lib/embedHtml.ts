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
  const text = stripped.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (text.length > 0) return true;
  return /<(img|iframe|picture|video|figure)\b/i.test(stripped);
}
