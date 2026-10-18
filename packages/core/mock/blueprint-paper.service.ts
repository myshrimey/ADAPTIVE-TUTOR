import type { SupabaseClient } from '@supabase/supabase-js';
import { assemblePaper, blueprintFor, type AssembledPaper, type PoolQuestion, type QType } from '../blueprint/blueprint';
import { defaultMarks, getMockExam, type MockExamView } from './mock-exam.service';
import { isUsableSubjectStatus } from '../subjects/subject.service';

// Blueprint papers (v45): assembled by section from the question bank (see blueprint/blueprint.ts), either answered on screen
// like any other mock, or printed and written on paper ("paper" delivery: self-timed, then answers typed in and photos uploaded).
// Never writes to mastery_states. The answer key is never part of anything returned here.

/** Paper delivery has no server-enforced clock, so the exam row is kept open this long after the paper's own time. */
export const PAPER_SIT_WINDOW_HOURS = 72;
export const BLUEPRINT_MIN_MARKS = 10;

export interface PaperQuestionView {
  no: number;
  id: string;
  prompt: string;
  questionType: QType;
  options: string[] | null;
  figureUrl: string | null;
  figureCaption: string | null;
  marks: number;
}
export interface PaperSectionView { id: string; name: string; marksPerQuestion: number; questions: PaperQuestionView[] }
export interface PaperView {
  id: string;
  subjectName: string;
  title: string;
  challenge: boolean;
  status: 'in_progress' | 'submitted';
  delivery: 'screen' | 'paper';
  durationMinutes: number;
  totalMarks: number;
  blueprintMarks: number;
  complete: boolean;
  issues: string[];
  basis: string;
  sections: PaperSectionView[];
  answers: Record<string, string>;
}

async function loadPool(service: SupabaseClient, subjectId: string): Promise<PoolQuestion[]> {
  const { data, error } = await service
    .from('diagnostic_questions')
    .select('id, question_type, difficulty, cognitive_level, expected_time_seconds, marks, skills!inner(retired, topics(chapters(id, slug))), diagnostic_tests!inner(subject_id, is_active)')
    .eq('diagnostic_tests.subject_id', subjectId)
    .eq('diagnostic_tests.is_active', true)
    .eq('skills.retired', false)
    .neq('content_status', 'rejected')
    .limit(5000);
  if (error) throw error;
  return (data ?? []).map((q: any) => ({
    id: q.id as string,
    chapterId: (q.skills?.topics?.chapters?.id as string) ?? 'none',
    chapterSlug: (q.skills?.topics?.chapters?.slug as string) ?? 'none',
    type: q.question_type as QType,
    marks: (q.marks as number | null) ?? defaultMarks(q.question_type),
    difficulty: Number(q.difficulty) || 3,
    cognitive: (q.cognitive_level as string | null) ?? null,
    seconds: (q.expected_time_seconds as number | null) ?? 90,
  }));
}

/** Assemble without saving (used by the admin preview and the tests). */
export async function previewBlueprintPaper(service: SupabaseClient, subjectId: string, opts: { challenge?: boolean } = {}): Promise<{ paper: AssembledPaper; title: string; basis: string }> {
  const { data: subject } = await service.from('subjects').select('id, slug, status').eq('id', subjectId).single();
  if (!subject) throw new Error('subject_not_found');
  const bp = blueprintFor(subject.slug);
  const pool = await loadPool(service, subjectId);
  return { paper: assemblePaper(pool, bp, { challenge: opts.challenge }), title: bp.title, basis: bp.basis };
}

export async function startBlueprintPaper(
  service: SupabaseClient,
  studentId: string,
  subjectId: string,
  opts: { challenge?: boolean; delivery?: 'screen' | 'paper' } = {}
): Promise<MockExamView> {
  const delivery = opts.delivery === 'paper' ? 'paper' : 'screen';
  const challenge = !!opts.challenge;
  const { data: subject } = await service.from('subjects').select('id, slug, name, status').eq('id', subjectId).single();
  if (!subject) throw new Error('subject_not_found');
  if (!isUsableSubjectStatus(subject.status)) throw new Error('subject_not_available');

  // Resume an unexpired paper of the same shape instead of making a second one.
  const { data: open } = await service
    .from('mock_exams')
    .select('id, deadline_at, delivery, challenge')
    .eq('student_id', studentId).eq('subject_id', subjectId).eq('status', 'in_progress').eq('kind', 'blueprint')
    .order('started_at', { ascending: false });
  for (const ex of open ?? []) {
    if (new Date(ex.deadline_at).getTime() > Date.now() && ex.delivery === delivery && !!ex.challenge === challenge) return getMockExam(service, studentId, ex.id);
  }

  const bp = blueprintFor(subject.slug);
  const pool = await loadPool(service, subjectId);
  const paper = assemblePaper(pool, bp, { challenge });
  if (paper.validation.totalMarks < BLUEPRINT_MIN_MARKS) throw new Error('not_enough_questions');

  const ids = paper.sections.flatMap((s) => s.questions.map((q) => q.id));
  const layout = paper.sections.filter((s) => s.questions.length > 0).map((s) => ({ id: s.section.id, name: s.section.name, marksPerQuestion: s.section.marksPerQuestion, questionIds: s.questions.map((q) => q.id) }));
  const deadline = new Date(Date.now() + paper.durationMinutes * 60_000 + (delivery === 'paper' ? PAPER_SIT_WINDOW_HOURS * 3600_000 : 0)).toISOString();
  const { data: created, error } = await service
    .from('mock_exams')
    .insert({
      student_id: studentId, subject_id: subjectId, kind: 'blueprint', delivery, challenge, blueprint_id: bp.id,
      duration_minutes: paper.durationMinutes, question_ids: ids, deadline_at: deadline, paper_layout: layout, validation: paper.validation,
    })
    .select('id')
    .single();
  if (error || !created) throw error ?? new Error('paper_create_failed');
  return getMockExam(service, studentId, created.id);
}

/** The printable paper. No answer key. Only the owner's own exam. */
export async function getPaperView(service: SupabaseClient, studentId: string, examId: string): Promise<PaperView> {
  const { data: ex } = await service.from('mock_exams').select('*, subjects(name, slug)').eq('id', examId).eq('student_id', studentId).single();
  if (!ex || ex.kind !== 'blueprint') throw new Error('mock_not_found');
  const layout: { id: string; name: string; marksPerQuestion: number; questionIds: string[] }[] = ex.paper_layout ?? [];
  const ids = layout.flatMap((s) => s.questionIds);
  const { data: rows, error } = await service
    .from('diagnostic_questions')
    .select('id, prompt, question_type, options, figure_url, figure_caption, marks')
    .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  if (error) throw error;
  const byId = new Map((rows ?? []).map((q: any) => [q.id, q]));
  let no = 0;
  const sections: PaperSectionView[] = layout.map((s) => ({
    id: s.id,
    name: s.name,
    marksPerQuestion: s.marksPerQuestion,
    questions: s.questionIds
      .map((qid) => byId.get(qid))
      .filter(Boolean)
      .map((q: any) => ({
        no: ++no,
        id: q.id,
        prompt: q.prompt,
        questionType: q.question_type,
        options: q.options ?? null,
        figureUrl: q.figure_url ?? null,
        figureCaption: q.figure_caption ?? null,
        marks: q.marks ?? defaultMarks(q.question_type),
      })),
  }));
  const bp = blueprintFor(ex.subjects?.slug ?? '');
  const v = (ex.validation ?? {}) as { totalMarks?: number; blueprintMarks?: number; complete?: boolean; issues?: string[] };
  return {
    id: ex.id,
    subjectName: ex.subjects?.name ?? 'Subject',
    title: bp.title,
    challenge: !!ex.challenge,
    status: ex.status,
    delivery: ex.delivery,
    durationMinutes: ex.duration_minutes,
    totalMarks: v.totalMarks ?? sections.reduce((a, s) => a + s.questions.reduce((m, q) => m + q.marks, 0), 0),
    blueprintMarks: v.blueprintMarks ?? bp.totalMarks,
    complete: !!v.complete,
    issues: v.issues ?? [],
    basis: bp.basis,
    sections,
    answers: ex.status === 'in_progress' ? (ex.answers ?? {}) : {},
  };
}
