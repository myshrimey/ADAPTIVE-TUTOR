import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { logEvent } from '@adaptive-tutor/core';

interface OnboardingBody {
  displayName: string;
  grade: string; // e.g. 'CBSE-10'
  board: string; // e.g. 'CBSE'
  class: string; // e.g. '10'
  subject?: string; // subject slug, e.g. 'maths' or 'science'; defaults to 'maths'
  targetDate?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingBody;
    if (!body.displayName || !body.board || !body.class) {
      return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });

    // Writes here go through the service client: creating/upserting a student's
    // own row on first onboarding happens before any RLS-visible row exists for
    // them yet, so this is the one place onboarding uses elevated access rather
    // than the session-bound client.
    const service = createServiceClient();

    const { data: userRow, error: userErr } = await service
      .from('users')
      .upsert({ auth_user_id: user.id, email: user.email ?? '' }, { onConflict: 'auth_user_id' })
      .select()
      .single();
    if (userErr || !userRow) throw userErr ?? new Error('user_upsert_failed');

    const { data: existingStudent } = await service
      .from('students')
      .select('id')
      .eq('user_id', userRow.id)
      .maybeSingle();

    let studentId = existingStudent?.id;
    const isNewStudent = !studentId;

    if (!studentId) {
      const { data: studentRow, error: studentErr } = await service
        .from('students')
        .insert({ user_id: userRow.id, display_name: body.displayName, grade: body.grade })
        .select()
        .single();
      if (studentErr || !studentRow) throw studentErr ?? new Error('student_insert_failed');
      studentId = studentRow.id;
      await logEvent({ studentId, eventType: 'signup' });
    } else {
      await service.from('students').update({ display_name: body.displayName, grade: body.grade }).eq('id', studentId);
    }

    const { data: curriculumRow, error: curErr } = await service
      .from('curricula')
      .select('id')
      .eq('board', body.board)
      .eq('class', body.class)
      .single();
    if (curErr || !curriculumRow) throw curErr ?? new Error('curriculum_not_found');

    const subjectSlug = body.subject ?? 'maths';
    const { data: subjectRow, error: subjErr } = await service
      .from('subjects')
      .select('id')
      .eq('curriculum_id', curriculumRow.id)
      .eq('slug', subjectSlug)
      .single();
    if (subjErr || !subjectRow) throw subjErr ?? new Error(`subject_not_found: ${subjectSlug}`);

    const { data: existingGoal } = await service
      .from('learning_goals')
      .select('id')
      .eq('student_id', studentId)
      .eq('curriculum_id', curriculumRow.id)
      .eq('subject_id', subjectRow.id)
      .maybeSingle();

    if (existingGoal) {
      await service
        .from('learning_goals')
        .update({ target_date: body.targetDate ?? null, status: 'active' })
        .eq('id', existingGoal.id);
    } else {
      await service
        .from('learning_goals')
        .insert({ student_id: studentId, curriculum_id: curriculumRow.id, subject_id: subjectRow.id, target_date: body.targetDate ?? null, status: 'active' });
    }

    await service
      .from('learning_profiles')
      .upsert({ student_id: studentId, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'student_id' });

    await logEvent({ studentId, eventType: 'onboarding_completed' });

    return NextResponse.json({ data: { studentId, isNewStudent }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
