import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { runOrchestratorTurn } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json();
    let { sessionId, questionId, answer } = body as { sessionId: string; questionId?: string; answer: unknown };
    if (!sessionId || answer === undefined) {
      return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    }

    const supabase = await createServerClient();

    if (!questionId) {
      const { data: session, error } = await supabase.from('learning_sessions').select('active_question_id').eq('id', sessionId).single();
      if (error || !session?.active_question_id) {
        return NextResponse.json({ data: null, error: 'no_active_question_for_session' }, { status: 400 });
      }
      questionId = session.active_question_id;
    }

    const turn = await runOrchestratorTurn(supabase, { studentId, sessionId, studentAnswer: { questionId: questionId!, answer } });

    return NextResponse.json({ data: turn, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
