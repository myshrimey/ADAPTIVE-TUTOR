import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { getAdminUser } from '@/lib/admin';
import { portalHome } from '@adaptive-tutor/core';

export interface Me {
  role: 'admin' | 'teacher' | 'parent' | 'tutor' | 'centre' | 'student' | 'none';
  teacherStatus: string | null;
  hasStudent: boolean;
  onboardingCompleted: boolean;
  mustCompleteProfile: boolean;
}

/**
 * Who is signed in and where should they go next? Everything is derived from the session;
 * nothing comes from the client. Returns null when nobody is signed in.
 * Used by /api/me (after sign-in) and by the home page (to send signed-in people straight on).
 */
export async function getMe(): Promise<Me | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
  if (userRow && ['student', 'admin'].includes(userRow.role)) {
    const { data: st } = await service.from('students').select('id, must_complete_profile').eq('user_id', userRow.id).maybeSingle();
    if (st) {
      student = st;
      const { data: lp } = await service.from('learning_profiles').select('onboarding_completed').eq('student_id', st.id).maybeSingle();
      onboardingCompleted = !!lp?.onboarding_completed;
    }
  }

  const r = userRow?.role;
  const role = isAdmin ? 'admin' : r === 'teacher' || r === 'parent' || r === 'tutor' || r === 'centre' ? r : student ? 'student' : 'none';
  return { role, teacherStatus, hasStudent: !!student, onboardingCompleted, mustCompleteProfile: !!student?.must_complete_profile };
}

/** Where a signed-in person belongs, or null when they need the home page's own onboarding step. */
export function homeFor(me: Me): string | null {
  if (me.role === 'admin') return '/admin';
  if (me.role === 'parent' || me.role === 'tutor' || me.role === 'centre') return portalHome(me.role);
  if (me.role === 'teacher') return '/teacher';
  if (me.role === 'student') {
    if (me.mustCompleteProfile) return '/profile?welcome=1';
    if (me.onboardingCompleted) return '/dashboard';
  }
  return null;
}
