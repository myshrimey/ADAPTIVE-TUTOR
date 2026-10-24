import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { gradeSkillQuiz, recordQuizRound, recordCompetencyEvidence } from '@adaptive-tutor/core';
import { engineCtx } from '@/lib/engagement';
import { aiForStudent } from '@/lib/ai';
import { saveQuizReport } from '@/lib/reports';

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const { sessionId, answers } = body as { sessionId?: string; answers?: { questionId: string; answer: unknown }[] };
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ data: null, error: 'missing_answers' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const result = await gradeSkillQuiz(supabase, studentId, sessionId ?? null, answers, await aiForStudent(studentId));
    await saveQuizReport(studentId, result);
    // Engagement (best effort, never blocks the quiz): the round counts for streaks, XP, the Mistake Book and personal bests.
    try {
      const service = createServiceClient();
      let skillId: string | null = null;
      if (sessionId && /^[0-9a-f-]{36}$/i.test(sessionId)) { const { data: ls } = await service.from('learning_sessions').select('skill_id').eq('id', sessionId).eq('student_id', studentId).maybeSingle(); skillId = ls?.skill_id ?? null; }
      if (skillId) for (const r of result.review) await recordCompetencyEvidence(service, studentId, { skillId, correct: r.isCorrect, source: 'quiz', itemTable: 'questions', itemId: r.questionId }); // v62: the baseline keeps learning from every quiz
      await recordQuizRound(service, studentId, { skillId, review: result.review.map((r) => ({ questionId: r.questionId, isCorrect: r.isCorrect, yourAnswer: r.yourAnswer, correctAnswer: r.correctAnswer })) }, await engineCtx(service));
    } catch { /* engagement must never break a quiz */ }
    return NextResponse.json({ data: result, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
