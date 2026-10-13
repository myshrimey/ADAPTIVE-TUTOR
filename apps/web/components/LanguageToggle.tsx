'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from './LanguageProvider';
import { SUPPORTED_LANGUAGES } from '@adaptive-tutor/core';

// Setting the cookie updates client components (via context) immediately,
// but server components (layout, Footer, legal pages) only pick up the new
// cookie value on their next render — hence the router.refresh() alongside
// setLang, so BOTH halves of the page agree on the language right away
// instead of a toggle that only half-applies until the next navigation.
export function LanguageToggle() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();

  function choose(code: 'en' | 'hi') {
    setLang(code);
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', gap: '0.3rem' }} aria-label="Language / भाषा">
      {SUPPORTED_LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => choose(l.code)}
          aria-pressed={lang === l.code}
          style={{
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '0.15rem 0.55rem',
            fontSize: '0.8rem',
            fontWeight: lang === l.code ? 600 : 400,
            color: lang === l.code ? 'var(--ink)' : 'var(--slate)',
            background: lang === l.code ? 'rgba(0,0,0,0.04)' : 'none',
            cursor: 'pointer',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
