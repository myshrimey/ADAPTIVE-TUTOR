import type { ReactNode } from 'react';

// Small, original, generic glyphs — not borrowed from any real logo or
// character — used to give each subject its own color identity across the
// dashboard, progress, and homepage (Maths = blue, Science = teal,
// Social Science = violet), rather than everything being the same
// marigold-on-paper color every other card uses.
const GLYPHS: Record<string, { path: ReactNode; bg: string; fg: string }> = {
  maths: {
    bg: 'var(--subject-maths-bg)',
    fg: 'var(--subject-maths)',
    path: (
      <>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 6.2 L15 12 L12 17.8 L9 12 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="1.1" fill="currentColor" />
      </>
    ),
  },
  science: {
    bg: 'var(--subject-science-bg)',
    fg: 'var(--subject-science)',
    path: (
      <>
        <path d="M10 3.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M10.6 3.5v5.2l-4.3 7.6c-.7 1.3.2 2.9 1.7 2.9h7.9c1.5 0 2.4-1.6 1.7-2.9l-4.3-7.6V3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8.3 14.5h7.2" stroke="currentColor" strokeWidth="1.4" />
      </>
    ),
  },
  'social-science': {
    bg: 'var(--subject-social-bg)',
    fg: 'var(--subject-social)',
    path: (
      <>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </>
    ),
  },
};

export function SubjectIcon({ slug, size = 40 }: { slug: string; size?: number }) {
  const glyph = GLYPHS[slug] ?? GLYPHS.maths;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: glyph.bg,
        color: glyph.fg,
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
        {glyph.path}
      </svg>
    </span>
  );
}
