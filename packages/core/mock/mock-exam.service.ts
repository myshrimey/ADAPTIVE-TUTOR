import type { SupabaseClient } from '@supabase/supabase-js';
import { loadHindi, ensureHindiTranslations, HINDI_MEDIUM_EXCLUDED_SUBJECTS, hasDevanagari } from '../translation/hindi';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { gradeAnswer, extractString } from '../question-engine/grading';
import { isUsableSubjectStatus } from '../subjects/subject.service';

// Timed practice papers — the assessment ladder after the diagnostic:
//   chapter_check  one chapter, short            (did the chapter stick?)
//   subject_check  a short paper across chapters (periodic check-up)
//   full_mock      the longer objective paper across the syllabus
//   board_style    sections by marks (1-mark MCQ, 2-mark short/numeric), timed from each
//                  question's planning time; only the auto-gradable part of a board paper.
//
// What this is: a timed set of questions (MCQ / numeric / short-answer) drawn
// from the subject's question bank, spread across chapters, auto-graded.
// What this is NOT: a replica of the CBSE board paper (no long-answer or
// case-study sections, not the official blueprint or marking scheme) and not a
// prediction of a board score. It never writes to mastery_states — it is a practice
// measurement, kept apart from learning evidence.
//
// Security: every function here takes a SERVICE client plus a studentId that the
// caller derived from the signed-in session, and every query is filtered by that
// studentId. expected_answer is only ever read here, server-side, and is sent to
// the client only inside a SUBMITTED exam's result.

export const MOCK_QUESTION_COUNT = 20;
export const MOCK_MIN_QUESTIONS = 8;
export type MockKind = 'full_mock' | 'subject_check' | 'chapter_check' | 'board_style' | 'blueprint';
/** Kinds startMockExam can assemble itself. 'blueprint' papers are made by startBlueprintPaper (blueprint-paper.service.ts). */
export const MOCK_KINDS: MockKind[] = ['chapter_check', 'subject_check', 'full_mock', 'board_style'];
/** Papers whose score is in marks, not question counts. */
export const isMarksKind = (k: string | null | undefined) => k === 'board_style' || k === 'blueprint';
const KIND_QUESTIONS: Record<Exclude<MockKind, 'blueprint'>, number> = { chapter_check: 8, subject_check: 10, full_mock: MOCK_QUESTION_COUNT, board_style: 18 };
/** Marks for a question with no marks set: 1 for MCQ, 2 for short-answer / numeric (planning default). */
export function defaultMarks(questionType: string): number { return questionType === 'mcq' ? 1 : 2; }
const MINUTES_PER_QUESTION = 1.5;
/** Extra seconds allowed after the deadline for a submit already in flight. */
const SUBMIT_GRACE_SECONDS = 30;
const MAX_ANSWER_LENGTH = 200;

export interface MockQuestionView {
  id: string;
  prompt: string;
  questionType: 'mcq' | 'short_answer' | 'numeric';
  options: string[] | null;
  /** Hindi medium: the options as shown, in the same order as `options`. The student's choice is still stored as the English `options` value. */
  optionLabels?: string[] | null;
  figureUrl: string | null;
  figureCaption: string | null;
  marks: number | null; // shown on board-style papers only
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
  marks: number;
  /** Paper delivery: a written answer waiting for handwritten marking; not counted in the score yet. */
  pendingHandwritten?: boolean;
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
  kind?: MockKind;
  /** True when score/total are marks (board-style paper), false when they are question counts. */
  inMarks?: boolean;
  byChapter: MockChapterResult[];
  review: MockReviewEntry[];
  /** Written answers on a paper mock, marked from photos; their marks are added later. */
  pendingWritten?: { questionId: string; marks: number }[];
}

export interface MockExamView {
  id: string;
  subjectId: string;
  subjectName: string;
  status: 'in_progress' | 'submitted';
  kind: MockKind;
  chapterName: string | null;
  totalMarks: number | null;
  durationMinutes: number;
  deadlineAt: string;
  serverNow: string;
  delivery?: 'screen' | 'paper';
  challenge?: boolean;
  language?: 'en' | 'hi';
  /** Hindi medium: how many questions are still shown in English because their Hindi is not ready. */
  untranslated?: number;
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
  kind: MockKind;
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

async function loadQuestionViews(service: SupabaseClient, ids: string[], showMarks: boolean, language: 'en' | 'hi' = 'en'): Promise<{ views: MockQuestionView[]; untranslated: number }> {
  if (ids.length === 0) return { views: [], untranslated: 0 };
  const { data, error } = await service
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, figure_url, figure_caption, marks')
    .in('id', ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((q: any) => [q.id, q]));
  const hi = language === 'hi' ? await loadHindi(service, ids) : new Map();
  let untranslated = 0;
  const views = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q: any) => {
      const tr = hi.get(q.id);
      if (language === 'hi' && !tr && !hasDevanagari(q.prompt)) untranslated++;
      return {
        id: q.id,
        prompt: tr?.prompt ?? q.prompt,
        questionType: q.question_type,
        options: q.options ?? null,
        optionLabels: tr?.options && q.options && tr.options.length === q.options.length ? tr.options : null,
        figureUrl: q.figure_url ?? null,
        figureCaption: q.figure_caption ?? null,
        marks: showMarks ? (q.marks ?? defaultMarks(q.question_type)) : null,
      } as MockQuestionView;
    });
  return { views, untranslated };
}

/** Grade and store an in-progress exam. Safe to call twice: the second call returns the stored result. */
async function finalise(service: SupabaseClient, studentId: string, exam: any, answers: Record<string, string>, auto: boolean): Promise<MockResult> {
  const ids: string[] = exam.question_ids ?? [];
  const { data: rows, error } = await service
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, expected_answer, explanation, figure_url, figure_caption, marks, skills(topics(chapters(name)))')
    .in('id', ids);
  if (error) throw error;
  const byId = new Map((rows ?? []).map((q: any) => [q.id, q]));
  const hiTr = exam.language === 'hi' ? await loadHindi(service, ids) : new Map();

  const review: MockReviewEntry[] = [];
  const chapterTotals = new Map<string, { correct: number; total: number }>();
  const inMarks = isMarksKind(exam.kind);
  const paper = exam.delivery === 'paper';
  const pendingWritten: { questionId: string; marks: number }[] = [];
  let score = 0;
  let totalMarks = 0;
  let unanswered = 0;
  for (const id of ids) {
    const q: any = byId.get(id);
    if (!q) continue;
    const given = (answers[id] ?? '').trim();
    const answered = given.length > 0;
    const marks = inMarks ? (q.marks ?? defaultMarks(q.question_type)) : 1;
    // On a paper mock, written (short-answer) questions are marked from photos, not from typed text.
    const pending = paper && q.question_type === 'short_answer';
    const tr = hiTr.get(id);
    // Marking always uses the English answer key. A Hindi short answer is also accepted when we hold its Hindi answer.
    const isCorrect = !pending && answered && (gradeAnswer(q.expected_answer, given) || (q.question_type === 'short_answer' && !!tr?.answerText && gradeAnswer(tr.answerText, given)));
    if (pending) pendingWritten.push({ questionId: id, marks });
    else if (!answered) unanswered++;
    if (!pending) totalMarks += marks;
    if (isCorrect) score += marks;
    const chapter: string = q.skills?.topics?.chapters?.name ?? 'Other';
    const ct = chapterTotals.get(chapter) ?? { correct: 0, total: 0 };
    if (!pending) ct.total += marks;
    if (isCorrect) ct.correct += marks;
    chapterTotals.set(chapter, ct);
    // Hindi medium: show the Hindi wording; the student's choice and the key are matched by option position.
    const engOpts: string[] | null = Array.isArray(q.options) ? q.options : null;
    const hiOpts = tr?.options && engOpts && tr.options.length === engOpts.length ? tr.options : null;
    const shown = (v: string) => { const i = hiOpts && engOpts ? engOpts.indexOf(v) : -1; return i >= 0 && hiOpts ? hiOpts[i] : v; };
    review.push({
      questionId: id,
      prompt: tr?.prompt ?? q.prompt,
      questionType: q.question_type,
      options: hiOpts ?? q.options ?? null,
      chapter,
      yourAnswer: shown(given),
      correctAnswer: shown(extractString(q.expected_answer)),
      answered,
      isCorrect,
      pendingHandwritten: pending || undefined,
      explanation: tr?.explanation ?? q.explanation ?? null,
      figureUrl: q.figure_url ?? null,
      figureCaption: q.figure_caption ?? null,
      marks,
    });
  }
  const total = totalMarks;
  const startedMs = new Date(exam.started_at).getTime();
  const endMs = Math.min(Date.now(), new Date(exam.deadline_at).getTime());
  const result: MockResult = {
    score,
    total,
    percent: total > 0 ? Math.round((score / total) * 100) : 0,
    unanswered,
    timeUsedSeconds: Math.max(0, Math.round((endMs - startedMs) / 1000)),
    autoSubmitted: auto,
    kind: (exam.kind ?? 'full_mock') as MockKind,
    inMarks,
    byChapter: [...chapterTotals.entries()].map(([chapter, v]) => ({ chapter, ...v })).sort((a, b) => a.chapter.localeCompare(b.chapter)),
    review,
    ...(pendingWritten.length ? { pendingWritten } : {}),
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
export async function startMockExam(
  service: SupabaseClient,
  studentId: string,
  subjectId: string,
  opts: { kind?: MockKind; chapterId?: string | null; language?: 'en' | 'hi'; ai?: AIProvider } = {}
): Promise<MockExamView> {
  const kind: MockKind = opts.kind && MOCK_KINDS.includes(opts.kind) ? opts.kind : 'full_mock';
  const chapterId = kind === 'chapter_check' ? opts.chapterId ?? null : null;
  if (kind === 'chapter_check' && !chapterId) throw new Error('chapter_required');
  const { data: subject } = await service.from('subjects').select('id, name, status, slug').eq('id', subjectId).single();
  if (!subject) throw new Error('subject_not_found');
  // Hindi medium applies to subjects that are taught in English; language subjects stay as they are.
  const language: 'en' | 'hi' = opts.language === 'hi' && !HINDI_MEDIUM_EXCLUDED_SUBJECTS.includes((subject as any).slug) ? 'hi' : 'en';
  if (!isUsableSubjectStatus(subject.status)) throw new Error('subject_not_available');

  const { data: open } = await service
    .from('mock_exams')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false });
  for (const ex of open ?? []) {
    // Resume only the same kind of paper (and chapter); a different one starts fresh.
    if (new Date(ex.deadline_at).getTime() > Date.now() && (ex.kind ?? 'full_mock') === kind && (ex.chapter_id ?? null) === chapterId && (ex.language ?? 'en') === language) return getMockExam(service, studentId, ex.id);
    if (new Date(ex.deadline_at).getTime() > Date.now()) continue;
    await finalise(service, studentId, ex, cleanAnswers(ex.answers, new Set(ex.question_ids ?? [])), true);
  }

  const { data: bank, error } = await service
    .from('diagnostic_questions')
    .select('id, question_type, expected_time_seconds, marks, skills(topics(chapters(id))), diagnostic_tests!inner(subject_id, is_active)')
    .eq('diagnostic_tests.subject_id', subjectId)
    .eq('diagnostic_tests.is_active', true)
    .neq('content_status', 'rejected');
  if (error) throw error;
  let items = (bank ?? []).map((q: any) => ({
    id: q.id as string,
    chapterId: (q.skills?.topics?.chapters?.id as string) ?? 'none',
    type: q.question_type as string,
    seconds: (q.expected_time_seconds as number | null) ?? 90,
  }));
  if (chapterId) items = items.filter((i) => i.chapterId === chapterId);
  // A chapter has fewer questions than a whole subject, so its minimum is lower.
  const minNeeded = kind === 'chapter_check' ? 5 : MOCK_MIN_QUESTIONS;
  if (items.length < minNeeded) throw new Error('not_enough_questions');

  let picked: typeof items;
  if (kind === 'board_style') {
    // Section A: 1-mark MCQs; Section B: 2-mark short-answer / numeric. Whatever the bank can supply.
    const mcq = spreadAcrossChapters(items.filter((i) => i.type === 'mcq'), 12);
    const other = spreadAcrossChapters(items.filter((i) => i.type !== 'mcq'), 6);
    picked = [...mcq, ...other];
    if (picked.length < minNeeded) throw new Error('not_enough_questions');
  } else {
    picked = spreadAcrossChapters(items, KIND_QUESTIONS[kind as Exclude<MockKind, 'blueprint'>]);
  }
  const duration =
    kind === 'board_style'
      ? Math.max(15, Math.ceil((picked.reduce((a, p) => a + p.seconds, 0) / 60) * 1.2))
      : Math.max(5, Math.ceil(picked.length * MINUTES_PER_QUESTION));
  // Hindi medium: get the Hindi ready BEFORE the clock starts, so translation time is not taken from the student.
  if (language === 'hi' && opts.ai) await ensureHindiTranslations(service, opts.ai, picked.map((p) => p.id));
  const deadline = new Date(Date.now() + duration * 60_000).toISOString();
  const { data: created, error: cErr } = await service
    .from('mock_exams')
    .insert({ student_id: studentId, subject_id: subjectId, kind, chapter_id: chapterId, duration_minutes: duration, question_ids: picked.map((p) => p.id), deadline_at: deadline, language })
    .select('id')
    .single();
  if (cErr || !created) throw cErr ?? new Error('mock_create_failed');
  return getMockExam(service, studentId, created.id);
}

export async function getMockExam(service: SupabaseClient, studentId: string, examId: string): Promise<MockExamView> {
  const { data: ex, error } = await service
    .from('mock_exams')
    .select('*, subjects(name), chapters(name)')
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
  const language: 'en' | 'hi' = exam.language === 'hi' ? 'hi' : 'en';
  const loaded = inProgress ? await loadQuestionViews(service, exam.question_ids ?? [], isMarksKind(exam.kind), language) : { views: [] as MockQuestionView[], untranslated: 0 };
  const questions = loaded.views;
  const view: MockExamView = {
    id: exam.id,
    subjectId: exam.subject_id,
    subjectName: exam.subjects?.name ?? 'Subject',
    status: exam.status,
    kind: (exam.kind ?? 'full_mock') as MockKind,
    delivery: (exam.delivery ?? 'screen') as 'screen' | 'paper',
    challenge: !!exam.challenge,
    language,
    untranslated: language === 'hi' ? loaded.untranslated : 0,
    chapterName: exam.chapters?.name ?? null,
    totalMarks: null as number | null,
    durationMinutes: exam.duration_minutes,
    deadlineAt: exam.deadline_at,
    serverNow: new Date().toISOString(),
    questions,
    answers: inProgress ? cleanAnswers(exam.answers, new Set(exam.question_ids ?? [])) : {},
    result,
  };
  if (isMarksKind(exam.kind)) view.totalMarks = inProgress ? questions.reduce((a, q) => a + (q.marks ?? 0), 0) : result?.total ?? null;
  return view;
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
    .select('id, subject_id, submitted_at, score, total, auto_submitted, kind, result')
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
    kind: (r.kind ?? 'full_mock') as MockKind,
  }));
}
