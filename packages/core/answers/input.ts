// Answer-box rules shared by the browser (typing filter, keypad) and the server (final check before marking).
// Pure functions, no DOM. The kind of answer a question expects is worked out from the question type and, on the server,
// from the stored expected answer. The kind is sent to the browser; the expected answer itself never is.
import { extractString } from '../question-engine/grading';

export type InputKind = 'number' | 'text' | 'expression' | 'choice';

const NUMBER_LIKE = /^[-+−]?\s*\d[\d,]*(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?\s*(%|°)?$/;
const WORDS_ONLY = /^[\p{L}\p{M}\s'’.,()\-]+$/u;

/** number: only a number is a valid answer. text: only words (no digits). expression: maths/chemistry/mixed, symbols allowed. choice: pick an option. */
export function inputKindOf(questionType: string | undefined | null, expected?: unknown): InputKind {
  if (questionType === 'mcq') return 'choice';
  const e = expected === undefined || expected === null ? '' : extractString(expected).trim();
  if (e) {
    if (NUMBER_LIKE.test(e)) return 'number';
    if (WORDS_ONLY.test(e) && e.length <= 80) return 'text';
    return 'expression';
  }
  // No expected answer available (browser side without a hint): a numeric question still expects a number.
  return questionType === 'numeric' ? 'number' : 'expression';
}

const ALLOWED: Record<'number' | 'text' | 'expression', RegExp> = {
  number: /[0-9.,\-−+/%°^×÷*() ]/,
  text: /[\p{L}\p{M}\s'’.,()\-]/u,
  expression: /[\p{L}\p{M}\p{N}\s.,;:'’"\-−–+×÷*·/=^()[\]{}<>≤≥≠≈±√π∞°²³ⁿ⁺⁻₀₁₂₃₄₅₆₇₈₉½¼¾%∠θαβγδλμΩΔΣ∫|!_→⇌↑↓∴∵?“”‘’$&@#~`\\]/u,
};

export const MAX_ANSWER_LENGTH = 200;

export type AnswerLang = 'en' | 'hi';
const MSG = {
  numberOnly: { en: 'This answer is a number. Letters and other symbols are not allowed. Use the number keys.', hi: 'इस प्रश्न का उत्तर संख्या है। अक्षर और दूसरे चिह्न नहीं चलेंगे। संख्या वाले बटन इस्तेमाल करें।' },
  textOnly: { en: 'This answer is a word or words. Numbers and symbols are not allowed.', hi: 'इस प्रश्न का उत्तर शब्दों में है। संख्या और चिह्न नहीं चलेंगे।' },
  badChar: { en: 'Some characters are not allowed in an answer and were removed.', hi: 'कुछ चिह्न उत्तर में नहीं चलते, इसलिए हटा दिए गए।' },
  tooLong: { en: 'The answer is too long (at most 200 characters).', hi: 'उत्तर बहुत लंबा है (अधिकतम 200 अक्षर)।' },
  empty: { en: 'Please type your answer first.', hi: 'पहले अपना उत्तर लिखें।' },
  notANumber: { en: 'Please enter a valid number, for example 12, -3.5 or 2/3.', hi: 'सही संख्या लिखें, जैसे 12, -3.5 या 2/3।' },
  choose: { en: 'Please choose one option.', hi: 'कृपया एक विकल्प चुनें।' },
  unbalanced: { en: 'Check your brackets: every ( needs a matching ).', hi: 'कोष्ठक जाँचें: हर ( के साथ ) होना चाहिए।' },
} as const;
export type MsgKey = keyof typeof MSG;
export const answerMessage = (k: MsgKey, lang: AnswerLang = 'en'): string => MSG[k][lang] ?? MSG[k].en;

export interface TypedResult { text: string; removed: string[]; warning: string | null }
/** Filters what the student types or pastes. Disallowed characters are removed and a warning says why. */
export function filterTyped(kind: InputKind, raw: string, lang: AnswerLang = 'en', keepNewlines = false): TypedResult {
  if (kind === 'choice') return { text: raw, removed: [], warning: null };
  const re = ALLOWED[kind];
  let out = '';
  const removed: string[] = [];
  for (const ch of String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, (c) => (c === '\n' ? (keepNewlines ? '\n' : ' ') : c === '\t' ? ' ' : ''))) {
    if (ch === '\n' && keepNewlines) out += ch; else if (re.test(ch)) out += ch; else removed.push(ch);
  }
  let warning: string | null = null;
  if (removed.length) warning = answerMessage(kind === 'number' ? 'numberOnly' : kind === 'text' ? 'textOnly' : 'badChar', lang);
  if (out.length > MAX_ANSWER_LENGTH) { out = out.slice(0, MAX_ANSWER_LENGTH); warning = answerMessage('tooLong', lang); }
  return { text: out, removed, warning };
}

/** The problem with an answer about to be submitted, or null when it is fine. Used by the browser before sending and by the server before marking. */
export function validateAnswer(kind: InputKind, text: string, lang: AnswerLang = 'en'): string | null {
  const t = String(text ?? '').trim();
  if (!t) return answerMessage(kind === 'choice' ? 'choose' : 'empty', lang);
  if (kind === 'choice') return null;
  if (t.length > MAX_ANSWER_LENGTH) return answerMessage('tooLong', lang);
  const f = filterTyped(kind, t, lang);
  if (f.removed.length) return f.warning;
  if (kind === 'number') {
    const n = t.replace(/[−]/g, '-').replace(/\s+/g, '');
    if (!/^[-+]?(\d[\d,]*)(\.\d+)?(\/\d+(\.\d+)?)?[%°]?$/.test(n) && !/^\(?[-+]?\d[\d.,]*[+\-×÷*/^][\d.,()+\-×÷*/^]*\)?$/.test(n)) return answerMessage('notANumber', lang);
  }
  if (kind === 'expression') {
    let depth = 0; for (const ch of t) { if (ch === '(') depth++; else if (ch === ')') { depth--; if (depth < 0) break; } }
    if (depth !== 0) return answerMessage('unbalanced', lang);
  }
  return null;
}

export interface KeypadKey { label: string; insert: string; title?: string; wide?: boolean }
export interface KeypadTab { id: string; label: string; keys: KeypadKey[] }
const k = (insert: string, label = insert, title?: string): KeypadKey => ({ insert, label, title });
export const NUMBER_PAD: KeypadKey[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '-', '/', '%'].map((x) => k(x));
export const MATH_KEYPAD: KeypadTab[] = [
  { id: 'num', label: '123', keys: [...['7', '8', '9', '+', '4', '5', '6', '−', '1', '2', '3', '×', '0', '.', ',', '÷'].map((x) => k(x)), k('/', 'a/b', 'fraction'), k('%'), k('('), k(')'), k('='), k('^', 'xⁿ', 'power')] },
  { id: 'alg', label: 'x y', keys: [...['x', 'y', 'z', 'a', 'b', 'c', 'n', 'p', 'q', 'r'].map((x) => k(x)), k('²', 'x²'), k('³', 'x³'), k('^', 'xⁿ', 'power'), k('√', '√', 'square root'), k('√(', '√( )', 'root of a bracket'), k('π'), k('θ'), k('°', '°', 'degree'), k('±'), k('≤'), k('≥'), k('≠'), k('<'), k('>'), k('∞')] },
  { id: 'sci', label: 'Science', keys: [...['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'].map((x) => k(x)), k('→', '→', 'gives'), k('⇌', '⇌', 'reversible'), k('↑', '↑', 'gas'), k('↓', '↓', 'precipitate'), k('⁺', '⁺', 'positive charge'), k('⁻', '⁻', 'negative charge'), k('Ω'), k('μ'), k('λ'), k('α'), k('β'), k('γ'), k('Δ'), k('∠'), k('∴', '∴', 'therefore')] },
];
