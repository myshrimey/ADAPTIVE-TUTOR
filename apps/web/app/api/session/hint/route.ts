import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { runOrchestratorTurn, logEvent } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };
    if (!sessionId) return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });

    const supabase = await createServerClient();
    // "hint" is recognized by the pedagogy engine's command parser and routes
    // straight to the HINT strategy — see packages/core/pedagogy/pedagogy.engine.ts.
    const turn = await runOrchestratorTurn(supabase, { studentId, sessionId, studentMessage: 'hint' });

    await logEvent({ studentId, sessionId, eventType: 'hint_requested' });

    return NextResponse.json({ data: turn, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
