/** Converte markdown simples do pacote Génesis para HTML compatível com o CV (TipTap). */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function genesisMdToCvHtml(md: string): string {
  const t = md.trim();
  if (!t) return '';
  const parts: string[] = [];
  const blocks = t.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines[0].startsWith('## ')) {
      parts.push(`<h2>${inline(lines[0].slice(3))}</h2>`);
      for (const ln of lines.slice(1)) {
        if (ln.startsWith('- ')) parts.push(`<p>• ${inline(ln.slice(2))}</p>`);
        else parts.push(`<p>${inline(ln)}</p>`);
      }
      continue;
    }
    if (lines.every((l) => l.startsWith('- '))) {
      for (const ln of lines) {
        parts.push(`<p>• ${inline(ln.slice(2))}</p>`);
      }
      continue;
    }
    parts.push(`<p>${inline(lines.join(' '))}</p>`);
  }
  return parts.join('') || `<p>${inline(t)}</p>`;
}
