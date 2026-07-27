import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Lang } from './messages';
import { setActiveLang, translate } from './lang';

export type { Lang } from './messages';

const STORAGE_KEY = 'hat-lang';

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ru' || stored === 'en') return stored;
  } catch {
    /* localStorage unavailable */
  }
  // Default English only for clearly-English browsers; everyone else keeps the
  // app's original Russian.
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')
    ? 'en'
    : 'ru';
}

type Vars = Record<string, string | number>;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  // Looks up a message for the current language, falling back to Russian and
  // then the raw key. `{name}`-style placeholders are filled from `vars`.
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Seed the module-level active language before first render so non-React code
// (the machine, utils) localises correctly from the start.
const startingLang = initialLang();
setActiveLang(startingLang);
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('lang', startingLang);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(startingLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setActiveLang(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', next);
    }
  }, []);

  const t = useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
