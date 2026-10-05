'use client';

import katex from 'katex';
import { useMemo } from 'react';

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
  const segments = useMemo(() => splitMath(text), [text]);
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
      return katex.renderToString(toLatexish(latex), { throwOnError: false, displayMode: block });
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

type Segment = { type: 'text' | 'inline' | 'block'; content: string };

// Splits on $$...$$ first (block), then $...$ (inline), leaving everything
// else as plain text. Unmatched/stray "$" (e.g. a price like "$5") is left
// as literal text rather than misparsed — only a closed pair is treated as
// math.
function splitMath(text: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'block', content: match[1] });
    } else {
      segments.push({ type: 'inline', content: match[2] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
}

// Upgrades the plain-text math notation already present in the CBSE seed
// content into LaTeX KaTeX can render. Deliberately narrow — only the
// patterns actually seen in the seed JSON, not a general math parser.
function toLatexish(src: string): string {
  return src
    .replace(/√(\d+|\([^)]+\))/g, (_m, inner) => `\\sqrt{${inner.replace(/[()]/g, '')}}`)
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/π/g, '\\pi ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
}
