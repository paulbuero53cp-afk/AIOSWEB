import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Language } from '@/types';
import { translate, translateText } from '@/lib/i18n';

interface LangState {
  lang: Language;
  setLang: (l: Language) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tx: (source: string) => string;
}

const LanguageContext = createContext<LangState | undefined>(undefined);
const STORAGE_KEY = 'aios.lang';

function initialLang(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'de') return saved;
  } catch { /* localStorage nicht verfügbar */ }
  return 'de';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLang);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* */ }
    if (typeof document !== 'undefined') document.documentElement.lang = l;
  }, []);

  const toggle = useCallback(() => setLang(lang === 'de' ? 'en' : 'de'), [lang, setLang]);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
  const tx = useCallback((source: string) => translateText(lang, source), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t, tx }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LangState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}

/** Komfort-Hook: nur die t-Funktion. */
export function useT() {
  return useLang().t;
}

/** Komfort-Hook: Quelltext-basierte Übersetzung (tx). */
export function useTx() {
  return useLang().tx;
}
