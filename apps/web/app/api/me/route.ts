import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { getAdminUser } from '@/lib/admin';

// Who is signed in and where should they go next? Used by the home page right after
// sign-in. Everything is derived from the session; nothing comes from the client.
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });

    const service = createServiceClient();
    const isAdmin = !!(await getAdminUser());
    const { data: userRow } = await service.from('users').select('id, role').eq('auth_user_id', user.id).maybeSingle();

    let teacherStatus: string | null = null;
    if (userRow?.role === 'teacher') {
      const { data: tp } = await service.from('teacher_profiles').select('status').eq('user_id', userRow.id).maybeSingle();
      teacherStatus = tp?.status ?? 'pending';
    }

    let student: { id: string; must_complete_profile: boolean } | null = null;
    let onboardingCompleted = false;
    if (userRow && userRow.role !== 'teacher') {
      const { data: st } = await service.from('students').select('id, must_complete_profile').eq('user_id', userRow.id).maybeSingle();
      if (st) {
        student = st;
        const { data: lp } = await service.from('learning_profiles').select('onboarding_completed').eq('student_id', st.id).maybeSingle();
        onboardingCompleted = !!lp?.onboarding_completed;
      }
    }

    const role = isAdmin ? 'admin' : userRow?.role === 'teacher' ? 'teacher' : student ? 'student' : 'none';
    return NextResponse.json({
      data: { role, teacherStatus, hasStudent: !!student, onboardingCompleted, mustCompleteProfile: !!student?.must_complete_profile },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
