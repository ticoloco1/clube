import { NextResponse } from 'next/server';
import { MT_TARGET_PAIR } from '@/lib/i18n/constants';
import { isMachineLang } from '@/lib/i18n/types';

const MAX_LEN = 450;
const BAD_MT_PATTERN = /mymemory|translated\.net|usage limits|available free translations|you used all available free translations/i;

/** Tradução em lote (EN → idioma). Usa MyMemory (grátis, com limites); cache no cliente. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const target = body?.target as string | undefined;
  const entries = body?.entries as { id: string; text: string }[] | undefined;

  if (!target || !isMachineLang(target) || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (entries.length > 40) {
    return NextResponse.json({ error: 'Too many entries' }, { status: 400 });
  }

  const langpair = MT_TARGET_PAIR[target];
  const translations: Record<string, string> = {};

  const run = async (id: string, text: string) => {
    const q = (text || '').slice(0, MAX_LEN);
    if (!q.trim()) {
      translations[id] = text;
      return;
    }
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${langpair}`;
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      const data = await res.json();
      const out = data?.responseData?.translatedText as string | undefined;
      const candidate = (out || '').trim();
      translations[id] =
        candidate && candidate !== q && !BAD_MT_PATTERN.test(candidate)
          ? candidate
          : text;
    } catch {
      translations[id] = text;
    }
  };

  const concurrency = 4;
  for (let i = 0; i < entries.length; i += concurrency) {
    const slice = entries.slice(i, i + concurrency);
    await Promise.all(slice.map(({ id, text }) => run(id, text)));
  }

  return NextResponse.json({ translations });
}
