'use client';

import {
  STORAGE_KEY,
  DEFAULT_LANG,
  HTML_LANG_ATTR,
  MT_CACHE_VERSION,
  MT_CACHE_KEY_PREFIX,
} from './constants';
import type { Lang } from './types';
import { LOCALE_CODES } from './types';
import { MESSAGES } from './messages';

export { STORAGE_KEY, DEFAULT_LANG, MT_CACHE_VERSION, MT_CACHE_KEY_PREFIX } from './constants';

function isValidLang(x: string): x is Lang {
  return (LOCALE_CODES as readonly string[]).includes(x);
}

/** Sem preferência guardada → sempre `DEFAULT_LANG` (en). Não inferimos idioma do browser. */
export function getLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isValidLang(saved)) return saved;
    if (saved) localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = HTML_LANG_ATTR[lang] || lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function setLang(lang: Lang) {
  if (typeof window === 'undefined') return;
  if (!isValidLang(lang)) return;
  localStorage.setItem(STORAGE_KEY, lang);
  try {
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(lang)};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
  applyDocumentLang(lang);
  window.dispatchEvent(new Event('lang-change'));
}

/** Resolução só com strings curadas (sem MT). */
export function tCurated(key: string, lang: Lang): string {
  const row = MESSAGES[key as keyof typeof MESSAGES];
  if (!row) return key;
  if (lang === 'pt') return row.pt;
  return row.en;
}
