import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import type { Contributor } from '@adaptive-tutor/core';

/** Who is signed in, if they may upload or ask for questions: an approved teacher, an active tutor or centre, or an admin. Derived only from the session. */
export async function getContributor(): Promise<(Contributor & { name: string }) | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: row } = await service.from('users').select('id, role').eq('auth_user_id', user.id).maybeSingle();
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (user.email && allowed.includes(user.email.toLowerCase())) return { userId: (row as any)?.id ?? null, role: 'admin', email: user.email, name: user.email };
  if (!row) return null;
  const role = (row as any).role as string;
  if (role === 'teacher') {
    const { data: tp } = await service.from('teacher_profiles').select('display_name, status').eq('user_id', (row as any).id).maybeSingle();
    if (!tp || (tp as any).status !== 'approved') return null;
    return { userId: (row as any).id, role: 'teacher', name: (tp as any).display_name };
  }
  if (role === 'tutor' || role === 'centre') {
    const { data: ap } = await service.from('adult_profiles').select('display_name, status').eq('user_id', (row as any).id).maybeSingle();
    if (!ap || (ap as any).status !== 'active') return null;
    return { userId: (row as any).id, role, orgUserId: role === 'centre' ? (row as any).id : null, name: (ap as any).display_name };
  }
  return null;
}
