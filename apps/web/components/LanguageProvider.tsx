'use client';

// Lightweight language context: no extra personal data collected (per the
// brief — "avoid collecting additional personal data merely to save language
// preference"), just a plain cookie so the choice survives navigation and
// refresh (the simplest compatible mechanism, as requested), readable from
// both client components (here) and server components (lib/language.ts).

import { createContext, useContext, useEffect, useState } from 'react';
import type { Lang } from '@adaptive-tutor/core';
import { t as translate, type DICTIONARY } from '@adaptive-tutor/core';

const COOKIE_NAME = 'sahayak_lang';

function readCookie(): Lang {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=(en|hi)`));
  return (match?.[1] as Lang) ?? 'en';
}

function writeCookie(lang: Lang) {
  // 1 year, same-site, path=/ so every route reads the same value.
  document.cookie = `${COOKIE_NAME}=${lang}; max-age=31536000; path=/; samesite=lax`;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICTIONARY, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children, initialLang }: { children: React.ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? 'en');

  // Pick up a cookie set on a previous visit as soon as we're in the browser
  // (covers the case where the server didn't have the cookie yet, e.g. the
  // very first request after the toggle was clicked).
  useEffect(() => {
    const fromCookie = readCookie();
    if (fromCookie !== lang) setLangState(fromCookie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLang(l: Lang) {
    writeCookie(l);
    setLangState(l);
  }

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: (key, vars) => translate(key, lang, vars),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
