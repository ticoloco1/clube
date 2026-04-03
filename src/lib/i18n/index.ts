export type { Lang, MessageRow, CuratedLang, MachineLang } from './types';
export type { MessageKey } from './messages';
export { LOCALE_CODES, MACHINE_LANGS, CURATED_LANGS, isMachineLang } from './types';
export { MESSAGES } from './messages';
export {
  LANGS,
  STORAGE_KEY,
  DEFAULT_LANG,
  MT_CACHE_VERSION,
  HTML_LANG_ATTR,
  isMachineTranslatedLang,
} from './constants';
export { getLang, setLang, applyDocumentLang, tCurated } from './core';
/** Servidor apenas: importar de `@/lib/i18n/serverLang` — não reexportar aqui (quebra client + `next/headers`). */
export { I18nProvider, useI18n, useT } from './I18nContext';
