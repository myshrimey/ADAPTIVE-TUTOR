import { createServiceClient } from '@/lib/supabase-server';
import { saveTestReports, type ReportItem, type MockResult, type QuizResult, type DiagnosticResult } from '@adaptive-tutor/core';

const MOCK_LABEL: Record<string, string> = { full_mock: 'Full mock', subject_check: 'Subject check', chapter_check: 'Chapter check', board_style: 'Board-style paper', blueprint: 'Blueprint paper' };

/** Skill name + subject for each question id (used to group diagnostic / quiz questions). */
async function skillInfo(questionIds: string[]) {
  const service = createServiceClient();
  const { data } = await service.from('diagnostic_questions').select('id, skills(name, topics(chapters(subject_id, subjects(name))))').in('id', questionIds);
  const m = new Map<string, { skill: string; subjectId: string | null; subjectName: string | null }>();
  for (const q of (data ?? []) as any[]) {
    const ch = q.skills?.topics?.chapters;
    m.set(q.id, { skill: q.skills?.name ?? 'Other', subjectId: ch?.subject_id ?? null, subjectName: ch?.subjects?.name ?? null });
  }
  return m;
}

/** Report saving never blocks or fails the test itself. All ids come from the session and the server's own records. */
export async function saveMockReport(studentId: string, examId: string, result: MockResult): Promise<void> {
  try {
    const service = createServiceClient();
    const { data: ex } = await service.from('mock_exams').select('subject_id, kind, submitted_at, subjects(name)').eq('id', examId).eq('student_id', studentId).maybeSingle();
    if (!ex) return;
    const kind = (ex as any).kind as string;
    const items: ReportItem[] = result.review.map((r) => ({
      prompt: r.prompt, group: r.chapter, yourAnswer: r.yourAnswer, correctAnswer: r.correctAnswer, isCorrect: r.isCorrect, answered: r.answered,
      explanation: r.explanation, figureUrl: r.figureUrl, figureCaption: r.figureCaption, marks: r.marks, pending: r.pendingHandwritten,
    }));
    await saveTestReports(service, {
      studentId, subjectId: (ex as any).subject_id ?? null, sourceId: examId, takenAt: (ex as any).submitted_at ?? undefined,
      input: { kind: 'mock', title: `${MOCK_LABEL[kind] ?? 'Mock'}: ${(ex as any).subjects?.name ?? 'Subject'}`, score: result.score, total: result.total, inMarks: !!result.inMarks, items, timeUsedSeconds: result.timeUsedSeconds, autoSubmitted: result.autoSubmitted },
    });
  } catch (e: any) { console.error('saveMockReport failed', e?.message); }
}

export async function saveQuizReport(studentId: string, result: QuizResult): Promise<void> {
  try {
    const info = await skillInfo(result.review.map((r) => r.questionId));
    const first = info.get(result.review[0]?.questionId);
    const items: ReportItem[] = result.review.map((r) => ({
      prompt: r.prompt, group: info.get(r.questionId)?.skill ?? 'Other', yourAnswer: r.yourAnswer, correctAnswer: r.correctAnswer, isCorrect: r.isCorrect,
      answered: r.yourAnswer.trim().length > 0, explanation: r.explanation, figureUrl: r.figureUrl, figureCaption: r.figureCaption,
    }));
    await saveTestReports(createServiceClient(), {
      studentId, subjectId: first?.subjectId ?? null, sourceId: crypto.randomUUID(),
      input: { kind: 'skill_quiz', title: `Quick quiz: ${first?.skill ?? 'practice'}`, score: result.score, total: result.total, inMarks: false, items },
    });
  } catch (e: any) { console.error('saveQuizReport failed', e?.message); }
}

export async function saveDiagnosticReport(studentId: string, result: DiagnosticResult): Promise<void> {
  try {
    const service = createServiceClient();
    const { data: att } = await service.from('diagnostic_attempts').select('id, completed_at, diagnostic_tests(subject_id, subjects(name))').eq('id', result.attemptId).eq('student_id', studentId).maybeSingle();
    if (!att) return;
    const info = await skillInfo(result.questionReview.map((r) => r.questionId));
    const items: ReportItem[] = result.questionReview.map((r) => ({
      prompt: r.prompt, group: info.get(r.questionId)?.skill ?? 'Other', yourAnswer: r.yourAnswer, correctAnswer: r.correctAnswer, isCorrect: r.isCorrect,
      answered: r.yourAnswer.trim().length > 0, explanation: r.explanation, figureUrl: r.figureUrl ?? null, figureCaption: r.figureCaption ?? null,
    }));
    const score = items.filter((i) => i.isCorrect).length;
    const t: any = (att as any).diagnostic_tests;
    await saveTestReports(service, {
      studentId, subjectId: t?.subject_id ?? null, sourceId: result.attemptId, takenAt: (att as any).completed_at ?? undefined,
      input: { kind: 'diagnostic', title: `Diagnostic: ${t?.subjects?.name ?? 'Subject'}`, score, total: items.length, inMarks: false, items },
    });
  } catch (e: any) { console.error('saveDiagnosticReport failed', e?.message); }
}
