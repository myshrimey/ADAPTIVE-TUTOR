import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { startDiagnostic } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();

    let subjectId = body.subjectId as string | undefined;
    if (!subjectId) {
      // Prefer the subject the student's active goal targets (set at
      // onboarding — see /api/student/onboarding) — this is what makes the
      // diagnostic actually match whichever subject they signed up to learn,
      // now that a curriculum can hold more than one (Maths, Science).
      const { data: goal } = await supabase
        .from('learning_goals')
        .select('subject_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goal?.subject_id) {
        subjectId = goal.subject_id;
      } else {
        // No goal yet (diagnostic requested before onboarding, or a
        // pre-existing goal row from before subject_id existed) — fall back
        // to Maths as the MVP default.
        const { data: subject, error } = await supabase
          .from('subjects')
          .select('id, curricula!inner(board, class)')
          .eq('curricula.board', 'CBSE')
          .eq('curricula.class', '10')
          .eq('slug', 'maths')
          .single();
        if (error || !subject) throw error ?? new Error('default_subject_not_found');
        subjectId = subject.id;
      }
    }

    const { attemptId, firstQuestion } = await startDiagnostic(supabase, studentId, subjectId as string);
    return NextResponse.json({ data: { attemptId, question: firstQuestion }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
