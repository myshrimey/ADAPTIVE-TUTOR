import type { SupabaseClient } from '@supabase/supabase-js';
import { categoryLabel } from './categories';

export interface MistakeInput { questionTable: 'diagnostic_questions' | 'questions'; questionId: string; skillId: string | null; subjectId: string | null; chapterId: string | null; studentAnswer: string; correctAnswer: string; category: string | null; source: string; ref: string }

/** Adds a mistake, or counts a repeat of one already in the book. The same source (ref) is never counted twice. A corrected mistake that is missed again reopens. */
export async function recordMistake(service: SupabaseClient, studentId: string, m: MistakeInput): Promise<void> {
  const { data: ex } = await service.from('mistake_book').select('id, repetitions, status, last_ref, error_category').eq('student_id', studentId).eq('question_table', m.questionTable).eq('question_id', m.questionId).maybeSingle();
  const now = new Date().toISOString();
  if (!ex) {
    await service.from('mistake_book').insert({ student_id: studentId, question_table: m.questionTable, question_id: m.questionId, skill_id: m.skillId, subject_id: m.subjectId, chapter_id: m.chapterId, student_answer: m.studentAnswer.slice(0, 500), correct_answer: m.correctAnswer.slice(0, 500), error_category: m.category, source: m.source, last_ref: m.ref });
    return;
  }
  if (ex.last_ref === m.ref) return;
  await service.from('mistake_book').update({ repetitions: ex.repetitions + 1, status: 'open', corrected_at: null, last_seen_at: now, last_ref: m.ref, student_answer: m.studentAnswer.slice(0, 500), error_category: m.category ?? ex.error_category }).eq('id', ex.id);
}

/** A retry result. Correct on a retry = corrected. Wrong again = stays open and the repeat is counted. Returns whether it just became corrected and how many times it had been repeated. */
export async function applyRetry(service: SupabaseClient, studentId: string, mistakeId: string, correct: boolean, ref: string): Promise<{ corrected: boolean; repetitions: number; category: string | null }> {
  const { data: ex } = await service.from('mistake_book').select('id, repetitions, status, last_ref, error_category').eq('id', mistakeId).eq('student_id', studentId).maybeSingle();
  if (!ex) return { corrected: false, repetitions: 0, category: null };
  const now = new Date().toISOString();
  if (correct) {
    if (ex.status === 'corrected') return { corrected: false, repetitions: ex.repetitions, category: ex.error_category };
    await service.from('mistake_book').update({ status: 'corrected', corrected_at: now, last_seen_at: now, last_ref: ref }).eq('id', ex.id);
    return { corrected: true, repetitions: ex.repetitions, category: ex.error_category };
  }
  if (ex.last_ref !== ref) await service.from('mistake_book').update({ repetitions: ex.repetitions + 1, status: 'practising', last_seen_at: now, last_ref: ref }).eq('id', ex.id);
  return { corrected: false, repetitions: ex.repetitions, category: ex.error_category };
}

export interface MistakeRow { id: string; questionTable: string; questionId: string; skillId: string | null; subjectId: string | null; chapterId: string | null; studentAnswer: string; correctAnswer: string; category: string; categoryLabel: string; repetitions: number; status: string; firstSeen: string; lastSeen: string; correctedAt: string | null; prompt: string; explanation: string | null }

export async function listMistakes(service: SupabaseClient, studentId: string, opts: { status?: string; limit?: number } = {}): Promise<MistakeRow[]> {
  let q = service.from('mistake_book').select('*').eq('student_id', studentId).order('last_seen_at', { ascending: false }).limit(opts.limit ?? 200);
  if (opts.status) q = q.eq('status', opts.status);
  const { data } = await q; const rows = (data ?? []) as any[];
  const byTable: Record<string, string[]> = { diagnostic_questions: [], questions: [] };
  for (const r of rows) byTable[r.question_table]?.push(r.question_id);
  const info = new Map<string, { prompt: string; explanation: string | null }>();
  for (const t of Object.keys(byTable)) for (let i = 0; i < byTable[t].length; i += 200) {
    const { data: qs } = await service.from(t).select('id, prompt, explanation').in('id', byTable[t].slice(i, i + 200));
    for (const x of (qs ?? []) as any[]) info.set(`${t}:${x.id}`, { prompt: x.prompt, explanation: x.explanation ?? null });
  }
  return rows.map((r) => ({ id: r.id, questionTable: r.question_table, questionId: r.question_id, skillId: r.skill_id, subjectId: r.subject_id, chapterId: r.chapter_id, studentAnswer: r.student_answer ?? '', correctAnswer: r.correct_answer ?? '', category: r.error_category ?? 'none', categoryLabel: categoryLabel(r.error_category), repetitions: r.repetitions, status: r.status, firstSeen: r.first_seen_at, lastSeen: r.last_seen_at, correctedAt: r.corrected_at, prompt: info.get(`${r.question_table}:${r.question_id}`)?.prompt ?? '', explanation: info.get(`${r.question_table}:${r.question_id}`)?.explanation ?? null }));
}
export async function mistakeCounts(service: SupabaseClient, studentId: string): Promise<{ open: number; corrected: number; calculation: number; total: number }> {
  const { data } = await service.from('mistake_book').select('status, error_category').eq('student_id', studentId).limit(5000);
  const r = (data ?? []) as any[];
  const open = r.filter((x) => x.status !== 'corrected');
  return { open: open.length, corrected: r.length - open.length, calculation: open.filter((x) => x.error_category === 'calculation').length, total: r.length };
}
