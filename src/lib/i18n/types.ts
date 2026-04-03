/** Idiomas com texto curado. Inglês (`en`) é a string canónica no código; `pt` é tradução curada. */
export const CURATED_LANGS = ['en', 'pt'] as const;
export type CuratedLang = (typeof CURATED_LANGS)[number];

/** Idiomas extra: UI traduzida a partir do inglês (tradução automática + cache). */
export const MACHINE_LANGS = ['es', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'ar'] as const;
export type MachineLang = (typeof MACHINE_LANGS)[number];

export function isMachineLang(x: string): x is MachineLang {
  return (MACHINE_LANGS as readonly string[]).includes(x);
}

export const LOCALE_CODES = [...CURATED_LANGS, ...MACHINE_LANGS] as const;
export type Lang = (typeof LOCALE_CODES)[number];

export type MessageRow = { en: string; pt: string };
