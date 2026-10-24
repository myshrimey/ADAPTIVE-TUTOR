import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { aiForStudent } from '@/lib/ai';
import { kickBankGrowth } from '@/lib/bank-growth';
import { startMockExam, startBlueprintPaper, assertAccess, planAllows } from '@adaptive-tutor/core';

// Hindi medium may need to translate a paper's questions the first time (saved afterwards), so allow the server up to a minute.
export const maxDuration = 60;

// Starts (or resumes) a timed mock. The student id comes from the session; the
// service client is used only so the student cannot write their own deadline/score.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (!body.subjectId || typeof body.subjectId !== 'string') {
      return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });
    }
    const service = createServiceClient();
    const language: 'en' | 'hi' = body.language === 'hi' ? 'hi' : 'en';
    const ai = language === 'hi' ? await aiForStudent(studentId) : undefined;
    const access = await assertAccess(service, studentId);
    // Timed mock exams are part of the paid plans.
    if (!planAllows(access.planCode, 'mock_exams')) throw new Error('plan_upgrade_required');
    kickBankGrowth(body.subjectId); // every session owes its subject at least 10 new questions
    if (body.kind === 'blueprint') {
      const exam = await startBlueprintPaper(service, studentId, body.subjectId, { delivery: body.delivery === 'screen' ? 'screen' : 'paper', challenge: body.challenge === true, language, ai });
      return NextResponse.json({ data: exam, error: null });
    }
    const kind = ['chapter_check', 'subject_check', 'full_mock', 'board_style'].includes(body.kind) ? body.kind : 'full_mock';
    const exam = await startMockExam(service, studentId, body.subjectId, {
      kind,
      chapterId: typeof body.chapterId === 'string' ? body.chapterId : null,
      language,
      ai,
    });
    return NextResponse.json({ data: exam, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
