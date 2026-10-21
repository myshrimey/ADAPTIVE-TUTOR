// Turns the plain-text maths and chemistry stored in the question bank ("x^2 + 4x - 32 = 0", "22/7", "√3",
// "CuSO4 + H2S -> CuS + H2SO4", "sin 30°") into LaTeX, so it is shown the way it is written in a textbook.
// Pure functions (no DOM), used by components/MathText.tsx, and unit-tested.
//   - Text already written as $...$ or $$...$$ is left to KaTeX as it is.
//   - Ordinary sentences are never touched: a run is treated as maths only when it joins at least two items with
//     an operator (+ - * / = -> < > <= >= × ÷) and contains a number, variable, power, root, function or formula,
//     or when it is a single power/root/chemical formula with subscripts (x^2, √3, H2SO4).

export type MathSegment = { type: 'text' | 'inline' | 'block'; content: string };

const ELEMENTS = new Set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu'.split(' '));

const FN = '(?:cosec|sin|cos|tan|cot|sec|log)(?![A-Za-z])';
const NUM = '\\d+(?:\\.\\d+)?';
const POSTFIX = '(?:\\^(?:[-+]?\\w+|\\([^()]*\\))|[²³]|°|%|_\\w)*';

const reFn = new RegExp(`${FN}(?:\\s?(?:${NUM}°?|[A-Za-zθ](?![A-Za-z])°?))?`, 'y');
const reSq = /√(?:\d+(?:\.\d+)?|[A-Za-z](?![A-Za-z])|\([^()]*\))|sqrt\([^()]*\)/y;
const reChem = /(?:\d+)?(?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*)+/y;
const reNumVar = new RegExp(`(?:[A-Za-z]\\((?:[0-9A-Za-z+\\-*/^., ]{1,20})\\)|(?:${NUM})?(?:[πθ][A-Za-z]{0,2}(?![A-Za-z])|[A-Za-z](?![A-Za-z]))|${NUM})${POSTFIX}`, 'y');
const reParen = /\([0-9A-Za-zπθ+\-−*/^.,²³√°=\s]{1,40}\)/y;
const reOp = /\s*(->|→|<=|>=|[+\-−*/=<>≤≥≠×÷])\s*/y;

interface Tok { kind: 'atom' | 'op'; tex: string; chem?: boolean; chemDigit?: boolean; fn?: boolean; mathy?: boolean; raw: string }

function matchAt(re: RegExp, s: string, i: number): RegExpExecArray | null {
  re.lastIndex = i;
  return re.exec(s);
}

function chemParts(f: string): { ok: boolean; groups: number; hasDigit: boolean } {
  const body = f.replace(/^\d+/, '');
  const syms = body.match(/[A-Z][a-z]?/g) ?? [];
  const ok = syms.length > 0 && syms.every((x) => ELEMENTS.has(x)) && body.replace(/[A-Z][a-z]?|\d+|[()]/g, '') === '';
  return { ok, groups: syms.length, hasDigit: /[A-Za-z)]\d/.test(body) };
}
function chemTex(f: string): string {
  const m = /^(\d+)?(.*)$/.exec(f)!;
  const body = m[2].replace(/([A-Za-z)])(\d+)/g, '$1_{$2}');
  return `${m[1] ?? ''}\\mathrm{${body}}`;
}

function postfixTex(p: string): string {
  return p
    .replace(/\^\(([^()]*)\)/g, '^{$1}')
    .replace(/\^([-+]?\w+)/g, '^{$1}')
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    .replace(/°/g, '^{\\circ}')
    .replace(/%/g, '\\%')
    .replace(/_(\w)/g, '_{$1}');
}
function symbolsTex(s: string): string {
  return s.replace(/π/g, '\\pi ').replace(/θ/g, '\\theta ').replace(/−/g, '-').replace(/×/g, '\\times ').replace(/÷/g, '\\div ');
}
function fnTex(s: string): string {
  const m = new RegExp(`^(cosec|sin|cos|tan|cot|sec|log)\\s?(.*)$`).exec(s)!;
  const name = m[1] === 'cosec' ? '\\operatorname{cosec}' : `\\${m[1]}`;
  const arg = postfixTex(symbolsTex(m[2]));
  return arg ? `${name}\\,${arg}` : name;
}
function sqTex(s: string): string {
  const inner = s.startsWith('√') ? s.slice(1) : s.slice(5, -1);
  return `\\sqrt{${symbolsTex(inner.replace(/^\(|\)$/g, ''))}}`;
}
function atomTex(raw: string): string {
  const m = /^([-+−]?)(.*)$/.exec(raw)!;
  const sign = m[1] === '−' ? '-' : m[1];
  const rest = m[2];
  const pm = /^(.*?)((?:\^(?:[-+]?\w+|\([^()]*\))|[²³]|°|%|_\w)*)$/.exec(rest)!;
  return sign + symbolsTex(pm[1]) + postfixTex(pm[2]);
}
function opTex(op: string): string {
  switch (op) {
    case '->': case '→': return '\\rightarrow ';
    case '<=': case '≤': return '\\le ';
    case '>=': case '≥': return '\\ge ';
    case '≠': return '\\ne ';
    case '*': case '×': return '\\times ';
    case '÷': return '\\div ';
    case '−': return '-';
    default: return op;
  }
}

/** Reads one atom at index i (after an optional sign when allowed). */
function readAtom(s: string, i: number, allowSign: boolean, loose = false): { tok: Tok; end: number } | null {
  let j = i;
  let sign = '';
  if (allowSign && /[-−+]/.test(s[j] ?? '') && /[\d(√A-Za-zπθ]/.test(s[j + 1] ?? '')) { sign = s[j]; j++; }
  let m: RegExpExecArray | null;
  if ((m = matchAt(reFn, s, j)) && m[0]) return { tok: { kind: 'atom', tex: sign + fnTex(m[0]), fn: true, mathy: true, raw: m[0] }, end: j + m[0].length };
  if ((m = matchAt(reSq, s, j))) return { tok: { kind: 'atom', tex: sign + sqTex(m[0]), mathy: true, raw: m[0] }, end: j + m[0].length };
  if ((m = matchAt(reChem, s, j)) && m[0]) {
    // The formula must be a real one and must not run into more letters (a word like "Number").
    const nxt = s[j + m[0].length] ?? '';
    const cp = chemParts(m[0]);
    if (cp.ok && !/[A-Za-z]/.test(nxt) && (cp.hasDigit || cp.groups >= 2 || (loose && cp.groups === 1))) {
      return { tok: { kind: 'atom', tex: sign + chemTex(m[0]), chem: true, chemDigit: cp.hasDigit, mathy: true, raw: m[0] }, end: j + m[0].length };
    }
  }
  if ((m = matchAt(reNumVar, s, j))) {
    const raw = m[0];
    const mathy = /[\d^²³πθ°]/.test(raw) || raw.length > 0 && /\^|_/.test(raw);
    return { tok: { kind: 'atom', tex: sign + atomTex(raw), mathy, raw }, end: j + raw.length };
  }
  if ((m = matchAt(reParen, s, j))) {
    const inner = m[0].slice(1, -1);
    const words = inner.match(/[A-Za-z]{3,}/g) ?? [];
    if (words.every((w) => /^(cosec|sin|cos|tan|cot|sec|log)$/.test(w))) {
      const tex = `(${postfixTex(symbolsTex(inner.replace(/\^(\w+)/g, '^{$1}')))})`.replace(/\^\{\{/g, '^{');
      return { tok: { kind: 'atom', tex: sign + tex, mathy: /[\d^+*/=√]/.test(inner), raw: m[0] }, end: j + m[0].length };
    }
  }
  return null;
}

function mergeFractions(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.kind === 'op' && t.raw === '/' && out.length && out[out.length - 1].kind === 'atom' && toks[i + 1]?.kind === 'atom' && !out[out.length - 1].chem && !toks[i + 1].chem) {
      const l = out.pop()!;
      const r = toks[++i];
      const strip = (x: string) => x.replace(/^\((.*)\)$/, '$1');
      out.push({ kind: 'atom', tex: `\\frac{${strip(l.tex)}}{${strip(r.tex)}}`, mathy: true, raw: l.raw + '/' + r.raw });
    } else out.push(t);
  }
  return out;
}

/** Finds the maths run that starts at i, if any. Returns the LaTeX and where it ends. */
function scanRun(s: string, i: number, loose: boolean): { tex: string; end: number } | null {
  const first = readAtom(s, i, false, loose);
  if (!first) return null;
  let end = first.end;
  const toks: Tok[] = [first.tok];
  for (;;) {
    const opm = matchAt(reOp, s, end);
    if (!opm) break;
    const after = readAtom(s, end + opm[0].length, true, loose);
    if (!after) break;
    toks.push({ kind: 'op', tex: opTex(opm[1]), raw: opm[1] }, after.tok);
    end = after.end;
  }
  const merged = mergeFractions(toks);
  const hasOp = toks.length > 1;
  const mathy = merged.some((t) => t.kind === 'atom' && (t.mathy || t.chem || t.fn)) || toks.some((t) => t.kind === 'op' && t.raw === '=');
  if (hasOp) {
    // A run of only plain single letters/words joined by "-" is more likely prose than maths.
    const onlyLetters = merged.every((t) => t.kind === 'op' || /^[A-Za-z]$/.test(t.raw));
    if (!mathy && onlyLetters) return null;
    if (!mathy) return null;
    return { tex: merged.map((t) => t.tex).join(' '), end };
  }
  // Single item: only a power, a root, a function or a formula with subscripts.
  const t = first.tok;
  if (t.chemDigit || /\^|√|sqrt/.test(t.raw) || t.fn && /\d|°/.test(t.raw)) return { tex: t.tex, end };
  return null;
}

/** Splits one plain (no dollar signs) piece of text into text and maths segments. */
export function autoMathSegments(plain: string): MathSegment[] {
  const out: MathSegment[] = [];
  const loose = /->|→/.test(plain); // a reaction arrow: single elements like Fe or Na are chemistry too
  let buf = '';
  let i = 0;
  while (i < plain.length) {
    const prev = plain[i - 1] ?? ' ';
    // A run may only start at a word boundary, so we never cut into the middle of a word.
    if (!/[A-Za-z0-9_]/.test(prev) || /[0-9]/.test(plain[i]) === false && !/[A-Za-z]/.test(prev)) {
      const r = scanRun(plain, i, loose);
      if (r) {
        if (buf) out.push({ type: 'text', content: buf });
        buf = '';
        out.push({ type: 'inline', content: r.tex });
        i = r.end;
        continue;
      }
    }
    buf += plain[i];
    i++;
  }
  if (buf) out.push({ type: 'text', content: buf });
  return out;
}

/** Existing helper: tidy the contents of an author-written $...$ span. */
export function toLatexish(src: string): string {
  return src
    .replace(/sqrt\(([^()]*)\)/g, '\\sqrt{$1}')
    .replace(/√(\d+(?:\.\d+)?|\([^)]+\)|[A-Za-z])/g, (_m, inner) => `\\sqrt{${String(inner).replace(/[()]/g, '')}}`)
    .replace(/->|→/g, '\\rightarrow ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/π/g, '\\pi ')
    .replace(/θ/g, '\\theta ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\^(\d{2,})/g, '^{$1}');
}

/** Whole text -> segments. $...$ and $$...$$ are kept for KaTeX; everything else is checked for plain-text maths. */
export function formatMath(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  const pattern = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushPlain = (t: string) => { if (t) segments.push(...autoMathSegments(t)); };
  while ((m = pattern.exec(text)) !== null) {
    pushPlain(text.slice(last, m.index));
    if (m[1] !== undefined) segments.push({ type: 'block', content: toLatexish(m[1]) });
    else segments.push({ type: 'inline', content: toLatexish(m[2]) });
    last = m.index + m[0].length;
  }
  pushPlain(text.slice(last));
  return segments.length ? segments : [{ type: 'text', content: text }];
}
