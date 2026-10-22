import type { SupabaseClient } from '@supabase/supabase-js';
import { validateTranslation } from './validate';

const expectedText = (q: any): string | null => (q.question_type === 'short_answer' ? String(typeof q.expected_answer === 'object' && q.expected_answer && 'value' in q.expected_answer ? (q.expected_answer as any).value : q.expected_answer ?? '') : null);

async function questionIdsForSubject(service: SupabaseClient, subjectId: string): Promise<string[]> {
  const { data } = await service.from('diagnostic_questions').select('id, diagnostic_tests!inner(subject_id, is_active)').eq('diagnostic_tests.subject_id', subjectId).eq('diagnostic_tests.is_active', true).limit(20000);
  return (data ?? []).map((q: any) => q.id as string);
}

/** Re-runs the automatic checks on every saved Hindi version of a subject. Returns how many pass and fail. Never changes a teacher's decision. */
export async function revalidateSubject(service: SupabaseClient, subjectId: string, lang = 'hi'): Promise<{ checked: number; passed: number; failed: number }> {
  const ids = await questionIdsForSubject(service, subjectId);
  let checked = 0, passed = 0, failed = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200);
    const [{ data: qs }, { data: trs }] = await Promise.all([
      service.from('diagnostic_questions').select('id, prompt, question_type, options, expected_answer, explanation').in('id', slice),
      service.from('question_translations').select('question_id, prompt, options, answer_text, explanation').eq('lang', lang).in('question_id', slice),
    ]);
    const byId = new Map((qs ?? []).map((q: any) => [q.id, q]));
    for (const t of (trs ?? []) as any[]) {
      const q: any = byId.get(t.question_id); if (!q) continue;
      const v = validateTranslation({ prompt: q.prompt, options: Array.isArray(q.options) ? q.options.map(String) : null, answerText: expectedText(q), explanation: q.explanation ?? null }, { prompt: t.prompt, options: t.options, answerText: t.answer_text, explanation: t.explanation }, lang);
      const { error } = await service.from('question_translations').update({ validation: v }).eq('question_id', t.question_id).eq('lang', lang);
      if (error) throw new Error('Could not save the checks (has migration 0033 been run?).');
      checked++; if (v.passed) passed++; else failed++;
    }
  }
  return { checked, passed, failed };
}

export interface ReviewItem { questionId: string; english: { prompt: string; options: string[] | null; answer: string | null }; translated: { prompt: string; options: string[] | null; answer: string | null }; status: string; failed: string[] }
export interface StatusCounts { total: number; translated: number; teacherChecked: number; aiValidated: number; aiNotValidated: number; failedChecks: number; rejected: number }

export async function translationCounts(service: SupabaseClient, subjectId: string, lang = 'hi'): Promise<StatusCounts> {
  const ids = await questionIdsForSubject(service, subjectId);
  const c: StatusCounts = { total: ids.length, translated: 0, teacherChecked: 0, aiValidated: 0, aiNotValidated: 0, failedChecks: 0, rejected: 0 };
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await service.from('question_translations').select('status, validation').eq('lang', lang).in('question_id', ids.slice(i, i + 500));
    for (const r of (data ?? []) as any[]) {
      c.translated++;
      if (r.status === 'rejected') c.rejected++;
      else if (r.validation?.passed === false) c.failedChecks++;
      else if (r.status === 'teacher_checked') c.teacherChecked++;
      else if (r.validation?.passed === true) c.aiValidated++;
      else c.aiNotValidated++;
    }
  }
  return c;
}

/** A random sample of versions nobody has checked yet, with the English original beside each. */
export async function sampleForReview(service: SupabaseClient, subjectId: string, n = 10, lang = 'hi'): Promise<ReviewItem[]> {
  const ids = await questionIdsForSubject(service, subjectId);
  const pool: any[] = [];
  for (let i = 0; i < ids.length && pool.length < 400; i += 500) {
    const { data } = await service.from('question_translations').select('question_id, prompt, options, answer_text, status, validation').eq('lang', lang).eq('status', 'ai_translated').in('question_id', ids.slice(i, i + 500));
    pool.push(...(data ?? []));
  }
  const pick = pool.sort(() => Math.random() - 0.5).slice(0, n);
  if (!pick.length) return [];
  const { data: qs } = await service.from('diagnostic_questions').select('id, prompt, question_type, options, expected_answer').in('id', pick.map((p) => p.question_id));
  const byId = new Map((qs ?? []).map((q: any) => [q.id, q]));
  return pick.map((t) => { const q: any = byId.get(t.question_id) ?? {}; return { questionId: t.question_id, english: { prompt: q.prompt ?? '', options: Array.isArray(q.options) ? q.options.map(String) : null, answer: expectedText(q) }, translated: { prompt: t.prompt, options: t.options ?? null, answer: t.answer_text ?? null }, status: t.status, failed: t.validation?.failed ?? [] }; });
}
