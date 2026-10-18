import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { assertAccess, loadLearnerState, resolveCurrentObjective, runOrchestratorTurn, logEvent, recordCheckin } from '@adaptive-tutor/core';
import { aiForStudent } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    await assertAccess(supabase, studentId); // plan must be active (throws access_required / access_expired)
    // Daily allowance of AI tutor replies (free plan: small; paid: fair-use). Checked BEFORE a session row is created.
    const ai = await aiForStudent(studentId, { tutor: true });

    // These two don't depend on each other — both just need studentId —
    // so they run concurrently instead of one after the other. Was the
    // first of a few sequential-await chains in this route that added up to
    // noticeable delay before a session could even start.
    const [state, priorCompletedCountResult] = await Promise.all([
      loadLearnerState(supabase, studentId),
      supabase.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'completed'),
    ]);
    // A prior completed session means this is a returning student, not a
    // brand-new one — the MVP proxy for "return_session" (docs/architecture.md,
    // Analytics section), since the schema has no separate day/streak concept.
    const isReturningStudent = (priorCompletedCountResult.count ?? 0) > 0;

    const objective = body.skillId ? { ...resolveCurrentObjective(state), skillId: body.skillId } : resolveCurrentObjective(state);
    if (body.skillId) {
      const { data: sk } = await supabase.from('skills').select('retired').eq('id', body.skillId).maybeSingle();
      if (sk?.retired) return NextResponse.json({ data: null, error: 'skill_retired' }, { status: 400 });
    }
    const startingMastery = state.masteryBySkill[objective.skillId]?.score ?? 0;

    const { data: session, error } = await supabase
      .from('learning_sessions')
      .insert({ student_id: studentId, skill_id: objective.skillId, status: 'active', starting_mastery: startingMastery })
      .select()
      .single();
    if (error || !session) throw error ?? new Error('session_create_failed');

    // Pre-session check-in (optional — a student can skip it). Stored before the
    // first tutor turn so a "recovery mode" start can make the opening question
    // gentler. A failure here must never block the session itself.
    let recoveryMode = false;
    if (body.checkin && typeof body.checkin === 'object') {
      try {
        const result = await recordCheckin(supabase, studentId, session.id, objective.skillId, body.checkin);
        recoveryMode = result.recoveryMode;
      } catch (checkinErr) {
        console.error('session/start: check-in not saved', checkinErr);
      }
    }

    // Neither log write depends on the other, and nothing after this needs
    // to wait for them either in principle — but logEvent already swallows
    // its own errors, so running them together (rather than one after another)
    // is a pure latency win with no behavior change.
    const logPromises = [logEvent({ studentId, sessionId: session.id, eventType: 'session_started', payload: { skillId: objective.skillId } })];
    if (isReturningStudent) {
      logPromises.push(logEvent({ studentId, sessionId: session.id, eventType: 'return_session' }));
    }

    // Where the student is right now, for the "what am I learning" sidebar —
    // one small joined read, not a full curriculum load.
    const contextPromise = supabase
      .from('skills')
      .select('name, topics(name, chapters(name, subjects(name)))')
      .eq('id', objective.skillId)
      .single();

    const [, contextResult] = await Promise.all([Promise.all(logPromises), contextPromise]);
    const skillMeta: any = contextResult.data;
    const context = skillMeta
      ? {
          subjectName: skillMeta.topics?.chapters?.subjects?.name ?? null,
          chapterName: skillMeta.topics?.chapters?.name ?? null,
          topicName: skillMeta.topics?.name ?? null,
          skillName: skillMeta.name ?? null,
          masteryScore: startingMastery,
        }
      : null;

    // Opening turn: no student message yet, just the tutor's first move for this objective.
    const turn = await runOrchestratorTurn(supabase, { studentId, sessionId: session.id }, ai);

    return NextResponse.json({ data: { sessionId: session.id, skillId: objective.skillId, context, turn, recoveryMode }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
