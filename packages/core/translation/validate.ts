import { hasDevanagari, keepsNumbers } from './hindi';

// Automatic checks on a translated question version. They cannot judge whether the Hindi is GOOD (a teacher does that);
// they catch the mistakes a machine can: lost numbers, lost symbols, changed option count, empty text, text left in English.
export interface OriginalQ { prompt: string; options: string[] | null; answerText?: string | null; explanation?: string | null }
export interface TranslatedQ { prompt: string; options: string[] | null; answerText?: string | null; explanation?: string | null }
export interface ValidationResult { passed: boolean; checks: Record<string, boolean>; failed: string[]; at: string }

const SYMBOLS = ['=', '+', '^', '√', '°', '%', '×', '÷', '≤', '≥', '<', '>', 'π'];
const count = (s: string, ch: string) => s.split(ch).length - 1;
function symbolsKept(en: string, tr: string): boolean { return SYMBOLS.every((c) => count(tr, c) >= count(en, c)); }

export function validateTranslation(en: OriginalQ, tr: TranslatedQ, lang: string, now: Date = new Date()): ValidationResult {
  const checks: Record<string, boolean> = {};
  checks.not_empty = !!tr.prompt?.trim();
  checks.script_present = lang !== 'hi' || hasDevanagari(tr.prompt ?? '') || !/[A-Za-z]{4,}/.test(tr.prompt ?? '');
  checks.numbers_kept = keepsNumbers(en.prompt, tr.prompt ?? '');
  checks.symbols_kept = symbolsKept(en.prompt, tr.prompt ?? '');
  if (en.options) {
    const o = tr.options;
    checks.option_count = Array.isArray(o) && o.length === en.options.length && o.every((x) => !!x?.trim());
    checks.option_numbers_kept = !!o && o.length === en.options.length && en.options.every((x, i) => keepsNumbers(x, o[i] ?? '') && symbolsKept(x, o[i] ?? ''));
  }
  if (en.answerText) checks.answer_numbers_kept = !!tr.answerText ? keepsNumbers(en.answerText, tr.answerText) : true;
  if (en.explanation && tr.explanation) checks.explanation_numbers_kept = keepsNumbers(en.explanation, tr.explanation);
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  return { passed: failed.length === 0, checks, failed, at: now.toISOString() };
}
