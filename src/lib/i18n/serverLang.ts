/**
 * Apenas em Server Components / rotas `app/`.
 * Não importar via `@/lib/i18n` (barrel) — usa `next/headers` e falha no bundle cliente.
 */
import { cookies } from 'next/headers';
import type { Lang } from './types';
import { LOCALE_CODES } from './types';
import { DEFAULT_LANG, STORAGE_KEY } from './constants';

/** Idioma para RSC (cookie espelhado pelo LanguageSwitcher / setLang). */
export function getServerLang(): Lang {
  try {
    const raw = cookies().get(STORAGE_KEY)?.value;
    if (raw && (LOCALE_CODES as readonly string[]).includes(raw)) return raw as Lang;
  } catch {
    /* build ou ambiente sem cookies */
  }
  return DEFAULT_LANG;
}
