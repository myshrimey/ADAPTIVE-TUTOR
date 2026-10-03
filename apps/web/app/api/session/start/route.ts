import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadLearnerState, resolveCurrentObjective, runOrchestratorTurn, logEvent } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();

    const state = await loadLearnerState(supabase, studentId);
    const objective = body.skillId ? { ...resolveCurrentObjective(state), skillId: body.skillId } : resolveCurrentObjective(state);
    const startingMastery = state.masteryBySkill[objective.skillId]?.score ?? 0;

    // A prior completed session means this is a returning student, not a
    // brand-new one — the MVP proxy for "return_session" (docs/architecture.md,
    // Analytics section), since the schema has no separate day/streak concept.
    const { count: priorCompletedCount } = await supabase
      .from('learning_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'completed');
    const isReturningStudent = (priorCompletedCount ?? 0) > 0;

    const { data: session, error } = await supabase
      .from('learning_sessions')
      .insert({ student_id: studentId, skill_id: objective.skillId, status: 'active', starting_mastery: startingMastery })
      .select()
      .single();
    if (error || !session) throw error ?? new Error('session_create_failed');

    await logEvent({ studentId, sessionId: session.id, eventType: 'session_started', payload: { skillId: objective.skillId } });
    if (isReturningStudent) {
      await logEvent({ studentId, sessionId: session.id, eventType: 'return_session' });
    }

    // Opening turn: no student message yet, just the tutor's first move for this objective.
    const turn = await runOrchestratorTurn(supabase, { studentId, sessionId: session.id });

    return NextResponse.json({ data: { sessionId: session.id, skillId: objective.skillId, turn }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
