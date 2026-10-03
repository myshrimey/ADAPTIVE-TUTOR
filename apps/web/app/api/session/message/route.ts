import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { runOrchestratorTurn } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json();
    const { sessionId, message } = body as { sessionId: string; message: string };
    if (!sessionId || !message) {
      return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const turn = await runOrchestratorTurn(supabase, { studentId, sessionId, studentMessage: message });

    return NextResponse.json({ data: turn, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
