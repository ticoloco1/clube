/**
 * Gera uma linha do tempo de "visemes" simplificados no cliente a partir do texto
 * e da duração real do áudio (após decode), sem renderização de vídeo no servidor.
 */

export type VisemeShape = 'sil' | 'open' | 'round' | 'smile' | 'fricative' | 'plosive' | 'wide' | 'neutral';

export type VisemeKeyframe = { time: number; shape: VisemeShape };

/** Mapeamento aproximado (grafema ASCII pós-NFD → forma da boca). */
function shapeForChar(ch: string): VisemeShape {
  if (ch === 'a') return 'open';
  if ('ei'.includes(ch)) return 'smile';
  if (ch === 'y') return 'smile';
  if ('ou'.includes(ch)) return 'round';
  if ('fv'.includes(ch)) return 'fricative';
  if ('bmp'.includes(ch)) return 'plosive';
  if ('cdgkqrstzx'.includes(ch)) return 'wide';
  if ('hnl'.includes(ch)) return 'neutral';
  return 'neutral';
}

export function buildVisemeKeyframes(text: string, durationSec: number): VisemeKeyframe[] {
  const d = Math.max(0.05, durationSec);
  const raw = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ');
  const letters = raw.replace(/\s+/g, '');
  if (!letters.length) {
    return [
      { time: 0, shape: 'sil' },
      { time: d, shape: 'sil' },
    ];
  }
  const step = d / letters.length;
  const out: VisemeKeyframe[] = [{ time: 0, shape: 'sil' }];
  let i = 0;
  for (const ch of letters) {
    const t = Math.min(d, (i + 1) * step);
    out.push({ time: t, shape: shapeForChar(ch) });
    i++;
  }
  out.push({ time: d, shape: 'sil' });
  return out;
}

export function visemeAtTime(keyframes: VisemeKeyframe[], t: number): VisemeShape {
  let cur: VisemeShape = 'sil';
  for (const k of keyframes) {
    if (k.time <= t) cur = k.shape;
    else break;
  }
  return cur;
}
