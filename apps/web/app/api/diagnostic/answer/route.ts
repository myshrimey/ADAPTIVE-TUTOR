import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { answerDiagnosticQuestion } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    // Ensures the caller is authenticated even though attemptId is the real
    // scoping key below; also gives us studentId for the completion event.
    await getCurrentStudentId();
    const body = await request.json();
    const { attemptId, questionId, answer } = body as { attemptId: string; questionId: string; answer: unknown };
    if (!attemptId || !questionId || answer === undefined) {
      return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const result = await answerDiagnosticQuestion(supabase, { attemptId, questionId, answer });

    if ('completed' in result) {
      return NextResponse.json({ data: { completed: true, result: result.result }, error: null });
    }
    return NextResponse.json({ data: { completed: false, question: result.nextQuestion }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
