import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { I18nKey } from './en.ts';
import { EN_KEYS } from './en.ts';
import { FR_KEYS } from './fr.ts';

export type Language = 'en' | 'fr';

export interface I18nValue {
  language: Language;
  t: (key: I18nKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  let result = template;
  for (const [k, v] of Object.entries(params)) {
    result = result.replaceAll(`{${k}}`, String(v));
  }
  return result;
}

/** Controlled provider: the language comes from the preferences state. */
export function I18nProvider(props: { language: Language; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const dict = props.language === 'fr' ? FR_KEYS : EN_KEYS;
    return {
      language: props.language,
      t: (key: I18nKey, params?: Record<string, string | number>) =>
        interpolate(dict[key] ?? EN_KEYS[key] ?? String(key), params),
    };
  }, [props.language]);
  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

/** Translation hook; falls back to English outside a provider (tests). */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    language: 'en',
    t: (key: I18nKey, params?: Record<string, string | number>) =>
      interpolate(EN_KEYS[key] ?? String(key), params),
  };
}
