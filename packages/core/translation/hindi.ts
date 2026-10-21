import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';

// Hindi-medium questions (v51). The English bank is never changed; a translation sits beside each question.
//  - Translations are written by AI and are labelled "ai_translated" until a teacher checks them.
//  - Marking never depends on Hindi text, except short answers (the Hindi expected answer is also accepted).
//  - A translation is REJECTED by code if it loses any number from the question (so "12" can never become "21").
//  - Language subjects (English, Hindi A/B) are not translated.

export type MediumLang = 'en' | 'hi';
export const HINDI_MEDIUM_EXCLUDED_SUBJECTS = ['english', 'hindi', 'hindi-b'];
export const TRANSLATION_BATCH_SIZE = 6;

const DEVANAGARI = /[ऀ-ॿ]/;
export const hasDevanagari = (s: string | null | undefined) => DEVANAGARI.test(String(s ?? ''));

export interface QuestionToTranslate {
  id: string;
  prompt: string;
  options: string[] | null;
  questionType: string;
  expectedAnswerText: string | null; // short answer only
  explanation: string | null;
}

export interface HindiTranslation {
  questionId: string;
  prompt: string;
  options: string[] | null;
  answerText: string | null;
  explanation: string | null;
  status: string;
}

export const TRANSLATION_SYSTEM_PROMPT = [
  'You translate CBSE Class 10 exam questions from English into simple, correct Hindi (Devanagari) for Hindi-medium students.',
  'Use the Hindi terms used in NCERT Hindi-medium textbooks (for example: बहुपद, द्विघात समीकरण, प्रतिरोध, अम्ल, क्षार).',
  'NEVER change numbers, signs, units, symbols, chemical formulas, variable names or anything written as a formula. Copy them exactly.',
  'Keep the options in exactly the same order and the same count. Do not add hints or answers. Do not shorten the question.',
  'If a short expected answer is given, translate it too (keep numbers and symbols). If it is only a number or formula, return it unchanged.',
  'Reply with JSON only: {"items":[{"id":"...","prompt":"...","options":["..."]|null,"answer":"..."|null,"explanation":"..."|null}]}',
].join('\n');

export function buildTranslationUserMessage(batch: QuestionToTranslate[]): string {
  return JSON.stringify({
    items: batch.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options, answer: q.questionType === 'short_answer' ? q.expectedAnswerText : null, explanation: q.explanation })),
  });
}

/** All digit runs (including decimals) in a text, as a sorted list. */
function numbersIn(s: string): string[] {
  return (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')).sort();
}
/** True when every number in the English text still appears (same count) in the Hindi text. Devanagari digits are mapped to ASCII first. */
export function keepsNumbers(english: string, hindi: string): boolean {
  const toAscii = (s: string) => s.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));
  const have = [...numbersIn(toAscii(hindi))];
  for (const n of numbersIn(english)) {
    const i = have.indexOf(n);
    if (i === -1) return false;
    have.splice(i, 1);
  }
  return true;
}

/** Validates the model's answer. Anything that fails a check is dropped (the student then sees English for that question). */
export function parseTranslations(text: string, batch: QuestionToTranslate[]): HindiTranslation[] {
  let parsed: any;
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }
  const items: any[] = Array.isArray(parsed?.items) ? parsed.items : [];
  const out: HindiTranslation[] = [];
  for (const q of batch) {
    const it = items.find((x) => x && x.id === q.id);
    if (!it || typeof it.prompt !== 'string' || !it.prompt.trim()) continue;
    if (!hasDevanagari(it.prompt) && /[A-Za-z]{4,}/.test(it.prompt)) continue; // came back still English
    if (!keepsNumbers(q.prompt, it.prompt)) continue;
    let options: string[] | null = null;
    if (q.options) {
      if (!Array.isArray(it.options) || it.options.length !== q.options.length || it.options.some((o: any) => typeof o !== 'string' || !o.trim())) continue;
      if (q.options.some((o, i) => !keepsNumbers(o, it.options[i]))) continue;
      options = it.options.map((o: string) => o.trim());
    }
    let answerText: string | null = null;
    if (q.questionType === 'short_answer' && typeof it.answer === 'string' && it.answer.trim()) {
      if (!q.expectedAnswerText || keepsNumbers(q.expectedAnswerText, it.answer)) answerText = it.answer.trim();
    }
    const explanation = typeof it.explanation === 'string' && it.explanation.trim() && (!q.explanation || keepsNumbers(q.explanation, it.explanation)) ? it.explanation.trim() : null;
    out.push({ questionId: q.id, prompt: it.prompt.trim(), options, answerText, explanation, status: 'ai_translated' });
  }
  return out;
}

/** Loads saved translations for these questions (no AI). */
export async function loadHindi(service: SupabaseClient, ids: string[]): Promise<Map<string, HindiTranslation>> {
  const m = new Map<string, HindiTranslation>();
  if (ids.length === 0) return m;
  const { data } = await service.from('question_translations').select('question_id, prompt, options, answer_text, explanation, status').eq('lang', 'hi').in('question_id', ids).neq('status', 'rejected');
  for (const r of (data ?? []) as any[]) m.set(r.question_id, { questionId: r.question_id, prompt: r.prompt, options: r.options ?? null, answerText: r.answer_text ?? null, explanation: r.explanation ?? null, status: r.status });
  return m;
}

/**
 * Translates the questions that have no Hindi yet and saves them. Stops when the time budget is used up, so a start
 * button never hangs: whatever is not ready simply stays in English. Never throws.
 * Returns how many questions got a new translation.
 */
export async function ensureHindiTranslations(
  service: SupabaseClient,
  ai: AIProvider,
  ids: string[],
  opts: { budgetMs?: number; maxQuestions?: number } = {}
): Promise<number> {
  const started = Date.now();
  const budget = opts.budgetMs ?? 25_000;
  try {
    if (ids.length === 0) return 0;
    const existing = await loadHindi(service, ids);
    const { data: rows } = await service.from('diagnostic_questions').select('id, prompt, question_type, options, expected_answer, explanation').in('id', ids);
    let todo: QuestionToTranslate[] = (rows ?? [])
      .filter((q: any) => !existing.has(q.id) && !hasDevanagari(q.prompt))
      .map((q: any) => ({
        id: q.id,
        prompt: q.prompt,
        options: Array.isArray(q.options) ? q.options.map(String) : null,
        questionType: q.question_type,
        expectedAnswerText: q.question_type === 'short_answer' ? String(typeof q.expected_answer === 'object' && q.expected_answer && 'value' in q.expected_answer ? (q.expected_answer as any).value : q.expected_answer ?? '') : null,
        explanation: q.explanation ?? null,
      }));
    if (opts.maxQuestions) todo = todo.slice(0, opts.maxQuestions);
    const batches: QuestionToTranslate[][] = [];
    for (let i = 0; i < todo.length; i += TRANSLATION_BATCH_SIZE) batches.push(todo.slice(i, i + TRANSLATION_BATCH_SIZE));
    let saved = 0;
    // Three batches at a time keeps a free-tier rate limit calm while still finishing a paper quickly.
    for (let i = 0; i < batches.length; i += 3) {
      if (Date.now() - started > budget) break;
      const group = batches.slice(i, i + 3);
      const results = await Promise.all(group.map(async (b) => {
        try {
          const c = await ai.complete({ systemPrompt: TRANSLATION_SYSTEM_PROMPT, userMessage: buildTranslationUserMessage(b), responseFormat: 'json', feature: 'translation' });
          return parseTranslations(c.text, b);
        } catch (e: any) {
          console.error('hindi translation batch failed', e?.message);
          return [] as HindiTranslation[];
        }
      }));
      const rowsOut = results.flat().map((t) => ({ question_id: t.questionId, lang: 'hi', prompt: t.prompt, options: t.options, answer_text: t.answerText, explanation: t.explanation, status: t.status }));
      if (rowsOut.length) {
        const { error } = await service.from('question_translations').upsert(rowsOut, { onConflict: 'question_id,lang' });
        if (error) console.error('save translations failed', error.message);
        else saved += rowsOut.length;
      }
    }
    return saved;
  } catch (e: any) {
    console.error('ensureHindiTranslations failed', e?.message);
    return 0;
  }
}
