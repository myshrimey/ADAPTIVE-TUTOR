import { redirect } from 'next/navigation';
import { createHash } from 'crypto';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { isPortalRole, type PortalRole } from '@adaptive-tutor/core';

export interface PortalUser {
  userId: string; // users.id
  role: PortalRole;
  displayName: string;
  status: 'pending' | 'active' | 'suspended';
  city: string | null;
}

export function hashLinkCode(code: string): string {
  return createHash('sha256').update('sahayak-link:' + code).digest('hex');
}

/** The signed-in parent/tutor/centre, derived only from the session. Null for anyone else (students, teachers, signed out). */
export async function getPortalUser(): Promise<PortalUser | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: row } = await service.from('users').select('id, role').eq('auth_user_id', user.id).maybeSingle();
  if (!row || !isPortalRole(row.role)) return null;
  const { data: p } = await service.from('adult_profiles').select('display_name, status, city').eq('user_id', row.id).maybeSingle();
  if (!p) return null;
  return { userId: row.id, role: row.role, displayName: p.display_name, status: p.status, city: p.city ?? null };
}

/** For server-rendered portal pages: sends a signed-out person to that portal's sign-in, and anyone with a different kind of account home. */
export async function requirePortalPage(role: PortalRole): Promise<PortalUser> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${role}/login`);
  const me = await getPortalUser();
  if (!me || me.role !== role) redirect('/');
  return me;
}

/** Students this adult may see: only ACTIVE links, and only if the adult's own account is active. */
export async function linkedStudentIds(adult: PortalUser): Promise<string[]> {
  if (adult.status !== 'active') return [];
  const service = createServiceClient();
  const { data } = await service.from('student_links').select('student_id').eq('adult_user_id', adult.userId).eq('status', 'active');
  return (data ?? []).map((r: any) => r.student_id);
}

export async function isLinked(adult: PortalUser, studentId: string): Promise<boolean> {
  if (adult.status !== 'active') return false;
  const service = createServiceClient();
  const { data } = await service.from('student_links').select('id').eq('adult_user_id', adult.userId).eq('student_id', studentId).eq('status', 'active').maybeSingle();
  return !!data;
}

export interface StudentSummary {
  studentId: string;
  name: string;
  grade: string | null;
  skillsWithEvidence: number;
  averageMastery: number | null; // null = no evidence yet
  lastActive: string | null;
  sessions14d: number;
}

/** Counts and dates only, from recorded evidence. No labels, no predictions. */
export async function summariseStudents(studentIds: string[]): Promise<StudentSummary[]> {
  if (studentIds.length === 0) return [];
  const service = createServiceClient();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const [{ data: studs }, { data: mastery }, { data: sessions }, { data: attempts }] = await Promise.all([
    service.from('students').select('id, display_name, grade').in('id', studentIds),
    service.from('mastery_states').select('student_id, score').in('student_id', studentIds),
    service.from('learning_sessions').select('student_id, started_at').in('student_id', studentIds).order('started_at', { ascending: false }).limit(5000),
    service.from('diagnostic_attempts').select('student_id, completed_at').in('student_id', studentIds).eq('status', 'completed').limit(5000),
  ]);
  return (studs ?? []).map((s: any) => {
    const m = (mastery ?? []).filter((r: any) => r.student_id === s.id);
    const ss = (sessions ?? []).filter((r: any) => r.student_id === s.id);
    const at = (attempts ?? []).filter((r: any) => r.student_id === s.id);
    const dates = [...ss.map((r: any) => r.started_at), ...at.map((r: any) => r.completed_at)].filter(Boolean).sort();
    return {
      studentId: s.id,
      name: s.display_name,
      grade: s.grade,
      skillsWithEvidence: m.length,
      averageMastery: m.length ? Math.round(m.reduce((a: number, r: any) => a + Number(r.score), 0) / m.length) : null,
      lastActive: dates.length ? dates[dates.length - 1] : null,
      sessions14d: ss.filter((r: any) => r.started_at >= since).length,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
