import { createServerClient, createServiceClient } from '@/lib/supabase-server';

export interface TeacherContext {
  authUserId: string;
  userId: string; // users.id
  displayName: string;
}

/** Returns the caller's teacher context only if they are an APPROVED teacher; otherwise throws. */
export async function requireApprovedTeacher(): Promise<TeacherContext> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');
  const service = createServiceClient();
  const { data: userRow } = await service.from('users').select('id, role').eq('auth_user_id', user.id).maybeSingle();
  if (!userRow || userRow.role !== 'teacher') throw new Error('not_a_teacher');
  const { data: tp } = await service.from('teacher_profiles').select('display_name, status').eq('user_id', userRow.id).maybeSingle();
  if (!tp) throw new Error('not_a_teacher');
  if (tp.status !== 'approved') throw new Error('teacher_not_approved');
  return { authUserId: user.id, userId: userRow.id, displayName: tp.display_name };
}
