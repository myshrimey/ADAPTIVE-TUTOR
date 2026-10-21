'use client';

import katex from 'katex';
import { useMemo } from 'react';
import { formatMath } from '@adaptive-tutor/core';

// Renders text that may contain inline ($...$) or block ($$...$$) LaTeX
// alongside plain prose — used anywhere the tutor's message or a question
// prompt might contain an equation (chat messages in /learn, question cards
// in /learn and /diagnostic, the diagnostic review list). The tutor's system
// prompt (packages/core/prompts/tutor.prompt.ts) now asks the model to wrap
// equations in $...$, but seed-authored question prompts predate that and
// use plain notation like "x^2 - 3x + 2" or "√3" — toLatexish() below
// upgrades the handful of patterns that show up in the CBSE seed content
// (², ³, √, simple fractions written as a/b) into real LaTeX before each
// $...$ span is handed to KaTeX, so existing content renders properly
// without having to rewrite every seed file.
//
// Falls back to the original plain text (per-segment) if KaTeX throws — a
// malformed or unanticipated expression should never blank out the rest of
// a tutor's message.
export function MathText({ text }: { text: string }) {
  const segments = useMemo(() => formatMath(String(text ?? '')), [text]);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.content}</span>
        ) : (
          <MathSpan key={i} latex={seg.content} block={seg.type === 'block'} />
        )
      )}
    </>
  );
}

function MathSpan({ latex, block }: { latex: string; block: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: block });
    } catch {
      return null;
    }
  }, [latex, block]);

  if (html === null) {
    // KaTeX itself failed outright (rare, even with throwOnError: false) —
    // show the raw source rather than nothing.
    return <span>{block ? `$$${latex}$$` : `$${latex}$`}</span>;
  }
  return block ? (
    <div style={{ margin: '0.5rem 0' }} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
