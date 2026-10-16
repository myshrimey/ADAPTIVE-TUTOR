import type { SupabaseClient } from '@supabase/supabase-js';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { isUsableSubjectStatus } from '../subjects/subject.service';

// Timed mock exams — objective-style practice papers.
//
// What this is: a timed set of questions (MCQ / numeric / short-answer) drawn
// from the subject's question bank, spread across chapters, auto-graded.
// What this is NOT: a replica of the CBSE board paper (no long-answer or
// case-study sections, no board marking scheme) and not a prediction of a
// board score. It never writes to mastery_states — it is a practice
// measurement, kept apart from learning evidence.
//
// Security: every function here takes a SERVICE client plus a studentId that the
// caller derived from the signed-in session, and every query is filtered by that
// studentId. expected_answer is only ever read here, server-side, and is sent to
// the client only inside a SUBMITTED exam's result.

export const MOCK_QUESTION_COUNT = 20;
export const MOCK_MIN_QUESTIONS = 8;
const MINUTES_PER_QUESTION = 1.5;
/** Extra seconds allowed after the deadline for a submit already in flight. */
const SUBMIT_GRACE_SECONDS = 30;
const MAX_ANSWER_LENGTH = 200;

export interface MockQuestionView {
  id: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  figureUrl: string | null;
  figureCaption: string | null;
}

export interface MockReviewEntry {
  questionId: string;
  prompt: string;
  questionType: string;
  options: string[] | null;
  chapter: string;
  yourAnswer: string;
  correctAnswer: string;
  answered: boolean;
  isCorrect: boolean;
  explanation: string | null;
  figureUrl: string | null;
  figureCaption: string | null;
}

export interface MockChapterResult {
  chapter: string;
  correct: number;
  total: number;
}

export interface MockResult {
  score: number;
  total: number;
  percent: number;
  unanswered: number;
  timeUsedSeconds: number;
  autoSubmitted: boolean;
  byChapter: MockChapterResult[];
  review: MockReviewEntry[];
}

export interface MockExamView {
  id: string;
  subjectId: string;
  subjectName: string;
  status: 'in_progress' | 'submitted';
  durationMinutes: number;
  deadlineAt: string;
  serverNow: string;
  questions: MockQuestionView[]; // empty once submitted (the review has them)
  answers: Record<string, string>;
  result: MockResult | null;
}

export interface MockExamSummary {
  id: string;
  subjectId: string;
  submittedAt: string;
  score: number;
  total: number;
  percent: number;
  autoSubmitted: boolean;
  unanswered: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick up to `count` items, taking round-robin from each chapter so the paper covers the syllabus. */
export function spreadAcrossChapters<T extends { chapterId: string }>(items: T[], count: number): T[] {
  const byChapter = new Map<string, T[]>();
  for (const it of shuffle(items)) {
    if (!byChapter.has(it.chapterId)) byChapter.set(it.chapterId, []);
    byChapter.get(it.chapterId)!.push(it);
  }
  const queues = shuffle([...byChapter.values()]);
  const picked: T[] = [];
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      if (picked.length >= count) break;
      const next = q.shift();
      if (next) picked.push(next);
    }
  }
  return shuffle(picked);
}

function cleanAnswers(raw: unknown, allowedIds: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedIds.has(k)) continue;
    const s = typeof v === 'string' ? v : v == null ? '' : String(v);
    out[k] = s.slice(0, MAX_ANSWER_LENGTH);
  }
  return out;
}

async function loadQuestionViews(service: SupabaseClient, ids: string[]): Promise<MockQuestionView[]> {
  if (ids.length === 0) return [];
  const { data, error } = await service
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, figure_url, figure_caption')
    .in('id', ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((q: any) => [q.id, q]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q: any) => ({
      id: q.id,
      prompt: q.prompt,
      questionType: q.question_type,
      options: q.options ?? null,
      figureUrl: q.figure_url ?? null,
      figureCaption: q.figure_caption ?? null,
    }));
}

/** Grade and store an in-progress exam. Safe to call twice: the second call returns the stored result. */
async function finalise(service: SupabaseClient, studentId: string, exam: any, answers: Record<string, string>, auto: boolean): Promise<MockResult> {
  const ids: string[] = exam.question_ids ?? [];
  const { data: rows, error } = await service
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, expected_answer, explanation, figure_url, figure_caption, skills(topics(chapters(name)))')
    .in('id', ids);
  if (error) throw error;
  const byId = new Map((rows ?? []).map((q: any) => [q.id, q]));

  const review: MockReviewEntry[] = [];
  const chapterTotals = new Map<string, { correct: number; total: number }>();
  let score = 0;
  let unanswered = 0;
  for (const id of ids) {
    const q: any = byId.get(id);
    if (!q) continue;
    const given = (answers[id] ?? '').trim();
    const answered = given.length > 0;
    const isCorrect = answered && gradeAnswer(q.expected_answer, given);
    if (!answered) unanswered++;
    if (isCorrect) score++;
    const chapter: string = q.skills?.topics?.chapters?.name ?? 'Other';
    const ct = chapterTotals.get(chapter) ?? { correct: 0, total: 0 };
    ct.total++;
    if (isCorrect) ct.correct++;
    chapterTotals.set(chapter, ct);
    review.push({
      questionId: id,
      prompt: q.prompt,
      questionType: q.question_type,
      options: q.options ?? null,
      chapter,
      yourAnswer: given,
      correctAnswer: extractString(q.expected_answer),
      answered,
      isCorrect,
      explanation: q.explanation ?? null,
      figureUrl: q.figure_url ?? null,
      figureCaption: q.figure_caption ?? null,
    });
  }
  const total = review.length;
  const startedMs = new Date(exam.started_at).getTime();
  const endMs = Math.min(Date.now(), new Date(exam.deadline_at).getTime());
  const result: MockResult = {
    score,
    total,
    percent: total > 0 ? Math.round((score / total) * 100) : 0,
    unanswered,
    timeUsedSeconds: Math.max(0, Math.round((endMs - startedMs) / 1000)),
    autoSubmitted: auto,
    byChapter: [...chapterTotals.entries()].map(([chapter, v]) => ({ chapter, ...v })).sort((a, b) => a.chapter.localeCompare(b.chapter)),
    review,
  };

  // The status guard makes a double submit (button + timer firing together) harmless.
  const { data: updated, error: upErr } = await service
    .from('mock_exams')
    .update({
      status: 'submitted',
      answers,
      submitted_at: new Date().toISOString(),
      auto_submitted: auto,
      score,
      total,
      result,
    })
    .eq('id', exam.id)
    .eq('student_id', studentId)
    .eq('status', 'in_progress')
    .select('id');
  if (upErr) throw upErr;
  if (!updated || updated.length === 0) {
    const { data: again } = await service.from('mock_exams').select('result').eq('id', exam.id).eq('student_id', studentId).single();
    if (again?.result) return again.result as MockResult;
  }
  return result;
}

/**
 * Starts a mock for a subject, or resumes the unexpired one already in progress.
 * An in-progress exam whose time ran out is auto-submitted first, then a new one starts.
 */
export async function startMockExam(service: SupabaseClient, studentId: string, subjectId: string): Promise<MockExamView> {
  const { data: subject } = await service.from('subjects').select('id, name, status').eq('id', subjectId).single();
  if (!subject) throw new Error('subject_not_found');
  if (!isUsableSubjectStatus(subject.status)) throw new Error('subject_not_available');

  const { data: open } = await service
    .from('mock_exams')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false });
  for (const ex of open ?? []) {
    if (new Date(ex.deadline_at).getTime() > Date.now()) return getMockExam(service, studentId, ex.id);
    await finalise(service, studentId, ex, cleanAnswers(ex.answers, new Set(ex.question_ids ?? [])), true);
  }

  const { data: bank, error } = await service
    .from('diagnostic_questions')
    .select('id, skills(topics(chapters(id))), diagnostic_tests!inner(subject_id, is_active)')
    .eq('diagnostic_tests.subject_id', subjectId)
    .eq('diagnostic_tests.is_active', true)
    .neq('content_status', 'rejected');
  if (error) throw error;
  const items = (bank ?? []).map((q: any) => ({ id: q.id as string, chapterId: (q.skills?.topics?.chapters?.id as string) ?? 'none' }));
  if (items.length < MOCK_MIN_QUESTIONS) throw new Error('not_enough_questions');

  const picked = spreadAcrossChapters(items, MOCK_QUESTION_COUNT);
  const duration = Math.max(5, Math.ceil(picked.length * MINUTES_PER_QUESTION));
  const deadline = new Date(Date.now() + duration * 60_000).toISOString();
  const { data: created, error: cErr } = await service
    .from('mock_exams')
    .insert({ student_id: studentId, subject_id: subjectId, duration_minutes: duration, question_ids: picked.map((p) => p.id), deadline_at: deadline })
    .select('id')
    .single();
  if (cErr || !created) throw cErr ?? new Error('mock_create_failed');
  return getMockExam(service, studentId, created.id);
}

export async function getMockExam(service: SupabaseClient, studentId: string, examId: string): Promise<MockExamView> {
  const { data: ex, error } = await service
    .from('mock_exams')
    .select('*, subjects(name)')
    .eq('id', examId)
    .eq('student_id', studentId)
    .single();
  if (error || !ex) throw new Error('mock_not_found');

  let exam: any = ex;
  let result: MockResult | null = exam.status === 'submitted' ? (exam.result as MockResult) : null;
  // Time ran out while the student was away: finish it now so they see a result, not a dead timer.
  if (exam.status === 'in_progress' && new Date(exam.deadline_at).getTime() + SUBMIT_GRACE_SECONDS * 1000 < Date.now()) {
    result = await finalise(service, studentId, exam, cleanAnswers(exam.answers, new Set(exam.question_ids ?? [])), true);
    exam = { ...exam, status: 'submitted' };
  }

  const inProgress = exam.status === 'in_progress';
  return {
    id: exam.id,
    subjectId: exam.subject_id,
    subjectName: exam.subjects?.name ?? 'Subject',
    status: exam.status,
    durationMinutes: exam.duration_minutes,
    deadlineAt: exam.deadline_at,
    serverNow: new Date().toISOString(),
    questions: inProgress ? await loadQuestionViews(service, exam.question_ids ?? []) : [],
    answers: inProgress ? cleanAnswers(exam.answers, new Set(exam.question_ids ?? [])) : {},
    result,
  };
}

/** Autosave. Ignored (not an error) once the exam is submitted or well past its deadline. */
export async function saveMockAnswers(service: SupabaseClient, studentId: string, examId: string, answers: unknown): Promise<{ saved: boolean }> {
  const { data: ex } = await service
    .from('mock_exams')
    .select('id, status, deadline_at, question_ids')
    .eq('id', examId)
    .eq('student_id', studentId)
    .single();
  if (!ex) throw new Error('mock_not_found');
  if (ex.status !== 'in_progress') return { saved: false };
  if (new Date(ex.deadline_at).getTime() + SUBMIT_GRACE_SECONDS * 1000 < Date.now()) return { saved: false };
  const clean = cleanAnswers(answers, new Set(ex.question_ids ?? []));
  const { error } = await service.from('mock_exams').update({ answers: clean }).eq('id', examId).eq('student_id', studentId).eq('status', 'in_progress');
  if (error) throw error;
  return { saved: true };
}

/**
 * Submit. Final answers sent with the submit are used only if they arrive within
 * the deadline plus a short grace period; otherwise the last autosaved answers count.
 */
export async function submitMockExam(service: SupabaseClient, studentId: string, examId: string, answers: unknown, auto: boolean): Promise<MockResult> {
  const { data: ex } = await service.from('mock_exams').select('*').eq('id', examId).eq('student_id', studentId).single();
  if (!ex) throw new Error('mock_not_found');
  if (ex.status === 'submitted') return ex.result as MockResult;

  const allowed = new Set<string>(ex.question_ids ?? []);
  const withinTime = new Date(ex.deadline_at).getTime() + SUBMIT_GRACE_SECONDS * 1000 >= Date.now();
  const final = withinTime && answers && typeof answers === 'object' ? { ...cleanAnswers(ex.answers, allowed), ...cleanAnswers(answers, allowed) } : cleanAnswers(ex.answers, allowed);
  return finalise(service, studentId, ex, final, auto || !withinTime);
}

/** Submitted exams for a student (newest first), optionally for one subject. Used by readiness. */
export async function listSubmittedMocks(service: SupabaseClient, studentId: string, subjectId?: string): Promise<MockExamSummary[]> {
  let q = service
    .from('mock_exams')
    .select('id, subject_id, submitted_at, score, total, auto_submitted, result')
    .eq('student_id', studentId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(30);
  if (subjectId) q = q.eq('subject_id', subjectId);
  const { data } = await q;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    subjectId: r.subject_id,
    submittedAt: r.submitted_at,
    score: r.score ?? 0,
    total: r.total ?? 0,
    percent: r.total ? Math.round(((r.score ?? 0) / r.total) * 100) : 0,
    autoSubmitted: !!r.auto_submitted,
    unanswered: r.result?.unanswered ?? 0,
  }));
}
