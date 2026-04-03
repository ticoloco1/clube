import type { Lang, MachineLang } from './types';

export const STORAGE_KEY = 'i18n-lang';
/** UI inicial em inglês; outro idioma só após escolha explícita (sem deteção por browser). */
export const DEFAULT_LANG: Lang = 'en';

/** Versão do cache MT: incrementar quando alterar MESSAGES de forma relevante. */
export const MT_CACHE_VERSION = 4;
export const MT_CACHE_KEY_PREFIX = 'i18n-mt-v1-';

/** Idiomas na UI. Inglês primeiro; `mt: true` = tradutor + cache a partir do EN. */
export const LANGS: { code: Lang; label: string; flag: string; mt?: boolean }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸', mt: true },
  { code: 'fr', label: 'Français', flag: '🇫🇷', mt: true },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', mt: true },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', mt: true },
  { code: 'zh', label: '中文', flag: '🇨🇳', mt: true },
  { code: 'ja', label: '日本語', flag: '🇯🇵', mt: true },
  { code: 'ko', label: '한국어', flag: '🇰🇷', mt: true },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', mt: true },
];

/** Atributo `lang` do `<html>` (BCP 47). */
export const HTML_LANG_ATTR: Record<Lang, string> = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  zh: 'zh-Hans',
  ja: 'ja',
  ko: 'ko',
  ar: 'ar',
};

/** Par `langpair` MyMemory: sempre EN → idioma (texto fonte = `row.en`). */
export const MT_TARGET_PAIR: Record<MachineLang, string> = {
  es: 'en|es',
  fr: 'en|fr',
  de: 'en|de',
  it: 'en|it',
  zh: 'en|zh-CN',
  ja: 'en|ja',
  ko: 'en|ko',
  ar: 'en|ar',
};

export function isMachineTranslatedLang(lang: Lang): boolean {
  return lang !== 'pt' && lang !== 'en';
}
