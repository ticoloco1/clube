'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { MESSAGES } from './messages';
import type { Lang } from './types';
import {
  applyDocumentLang,
  getLang,
  MT_CACHE_KEY_PREFIX,
  MT_CACHE_VERSION,
  DEFAULT_LANG,
} from './core';
import { STORAGE_KEY } from './constants';
import { isMachineTranslatedLang } from './constants';

type MtMap = Record<string, string>;

const I18nContext = createContext<{
  lang: Lang;
  t: (key: string) => string;
  machineActive: boolean;
} | null>(null);

function loadMtFromStorage(lang: Lang): MtMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MT_CACHE_KEY_PREFIX + lang);
    if (!raw) return {};
    const p = JSON.parse(raw) as { v?: number; map?: MtMap };
    if (p.v !== MT_CACHE_VERSION || !p.map || typeof p.map !== 'object') return {};
    return p.map;
  } catch {
    return {};
  }
}

function saveMtToStorage(lang: Lang, map: MtMap) {
  try {
    localStorage.setItem(
      MT_CACHE_KEY_PREFIX + lang,
      JSON.stringify({ v: MT_CACHE_VERSION, map })
    );
  } catch {
    /* quota */
  }
}

const MT_ENABLED = process.env.NEXT_PUBLIC_I18N_MT !== '0';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [mt, setMt] = useState<MtMap>({});

  useLayoutEffect(() => {
    const initial = getLang();
    setLangState(initial);
    applyDocumentLang(initial);
    try {
      document.cookie = `${STORAGE_KEY}=${encodeURIComponent(initial)};path=/;max-age=31536000;SameSite=Lax`;
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      const next = getLang();
      setLangState(next);
      applyDocumentLang(next);
    };
    window.addEventListener('lang-change', onChange);
    return () => window.removeEventListener('lang-change', onChange);
  }, []);

  useEffect(() => {
    if (!isMachineTranslatedLang(lang)) {
      setMt({});
      return;
    }
    setMt(loadMtFromStorage(lang));
  }, [lang]);

  useEffect(() => {
    if (!MT_ENABLED || !isMachineTranslatedLang(lang)) return;

    let cancelled = false;
    const keys = Object.keys(MESSAGES) as (keyof typeof MESSAGES)[];

    (async () => {
      let map = loadMtFromStorage(lang);
      if (cancelled) return;
      setMt(map);

      const missing = keys.filter((k) => !map[k as string]);
      if (missing.length === 0) return;

      const CHUNK = 25;
      for (let i = 0; i < missing.length && !cancelled; i += CHUNK) {
        const slice = missing.slice(i, i + CHUNK);
        const entries = slice.map((k) => ({
          id: k as string,
          text: MESSAGES[k].en,
        }));

        try {
          const res = await fetch('/api/translate/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: lang, entries }),
          });
          if (!res.ok) break;
          const data = (await res.json()) as { translations?: MtMap };
          const batch = data.translations || {};
          map = { ...map, ...batch };
          saveMtToStorage(lang, map);
          if (!cancelled) setMt(map);
        } catch {
          break;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const t = useCallback(
    (key: string) => {
      const row = MESSAGES[key as keyof typeof MESSAGES];
      if (!row) return key;
      if (lang === 'pt') return row.pt;
      if (lang === 'en') return row.en;
      return mt[key] ?? row.en;
    },
    [lang, mt]
  );

  const value = useMemo(
    () => ({
      lang,
      t,
      machineActive: MT_ENABLED && isMachineTranslatedLang(lang),
    }),
    [lang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT() {
  const { t } = useI18n();
  return t;
}
