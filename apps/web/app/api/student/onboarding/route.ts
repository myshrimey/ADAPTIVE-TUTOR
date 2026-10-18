import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { signupsOpen } from '@/lib/signups';
import { logEvent, registerSubject, assertAccess, assertSubjectAllowed } from '@adaptive-tutor/core';

interface OnboardingBody {
  displayName: string;
  grade: string; // e.g. 'CBSE-10'
  board: string; // e.g. 'CBSE'
  class: string; // e.g. '10'
  subject?: string; // legacy single subject slug; kept so older clients keep working
  subjects?: string[]; // subject slugs the family registers for, e.g. ['maths','science','english']
  targetDate?: string;
  examYear?: number;
  preferredLanguage?: string;
  dailyStudyMinutes?: number;
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
    // Parent, tutor, centre and teacher accounts must never become student accounts.
    if (['parent', 'tutor', 'centre', 'teacher'].includes((userRow as any).role)) throw new Error('not_a_student_account');

    const { data: existingStudent } = await service
      .from('students')
      .select('id')
      .eq('user_id', userRow.id)
      .maybeSingle();

    let studentId = existingStudent?.id;
    const isNewStudent = !studentId;

    if (!studentId) {
      // Early access is invitation-only: the founder creates the student record. Nobody
      // creates their own unless the founder has turned self sign-up back on.
      if (!signupsOpen()) throw new Error('invitation_required');
      const { data: studentRow, error: studentErr } = await service
        .from('students')
        .insert({ user_id: userRow.id, display_name: body.displayName, grade: body.grade })
        .select()
        .single();
      if (studentErr || !studentRow) throw studentErr ?? new Error('student_insert_failed');
      studentId = studentRow.id;
      // Open sign-up (only when the founder turns it on) starts everyone on the FREE plan.
      await service.from('student_access').upsert(
        { student_id: studentId, plan_code: 'free', subject_limit: 1, access_until: null, notes: 'Self sign-up: free plan' },
        { onConflict: 'student_id' }
      );
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

    // Register every chosen subject (a student may take 5-6). The first one in
    // the list becomes the active subject. Subjects that are 'coming soon' /
    // 'in development' are rejected by registerSubject.
    const requestedSlugs = (body.subjects && body.subjects.length > 0 ? body.subjects : [body.subject ?? 'maths']).filter(Boolean);
    const { data: subjectRows, error: subjErr } = await service
      .from('subjects')
      .select('id, slug')
      .eq('curriculum_id', curriculumRow.id)
      .in('slug', requestedSlugs);
    if (subjErr) throw subjErr;
    const idBySlug = new Map((subjectRows ?? []).map((r: any) => [r.slug, r.id]));
    const missing = requestedSlugs.filter((slug) => !idBySlug.has(slug));
    if (missing.length > 0) throw new Error(`subject_not_found: ${missing.join(', ')}`);

    // Plans are enforced: the student needs an active plan, and may register only as many
    // subjects as it allows (Maths Standard + Basic count as one).
    const access = await assertAccess(service, studentId);
    await assertSubjectAllowed(service, studentId, requestedSlugs.map((slug) => idBySlug.get(slug) as string), access.subjectLimit);

    for (let i = 0; i < requestedSlugs.length; i++) {
      await registerSubject(service, studentId, idBySlug.get(requestedSlugs[i]) as string, {
        activate: i === 0,
        targetDate: body.targetDate ?? null,
      });
    }

    await service
      .from('learning_profiles')
      .upsert(
        {
          student_id: studentId,
          onboarding_completed: true,
          exam_year: body.examYear === 2028 ? 2028 : 2027,
          preferred_language: body.preferredLanguage === 'hi' ? 'hi' : 'en',
          daily_study_minutes:
            Number.isFinite(body.dailyStudyMinutes) && (body.dailyStudyMinutes as number) >= 5 && (body.dailyStudyMinutes as number) <= 480
              ? Math.round(body.dailyStudyMinutes as number)
              : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      );

    await logEvent({ studentId, eventType: 'onboarding_completed' });

    return NextResponse.json({ data: { studentId, isNewStudent }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
