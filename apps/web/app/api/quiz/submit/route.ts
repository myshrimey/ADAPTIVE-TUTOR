import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { gradeSkillQuiz } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const { sessionId, answers } = body as { sessionId?: string; answers?: { questionId: string; answer: unknown }[] };
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ data: null, error: 'missing_answers' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const result = await gradeSkillQuiz(supabase, studentId, sessionId ?? null, answers);
    return NextResponse.json({ data: result, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
