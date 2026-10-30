import type { SupabaseClient } from '@supabase/supabase-js';
import { writeAudit } from '../config-engine/config-engine';

// v80: teacher ↔ student assignment. A RECORD only: it never grants the teacher any access to the student's data.
export async function assignTeacher(service: SupabaseClient, actor: string, teacherUser: string, studentId: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const { data: u } = await service.from('users').select('id, role').eq('id', teacherUser).maybeSingle();
  if (!u || (u as any).role !== 'teacher') return { ok: false, error: 'not_a_teacher' };
  const { data: tp } = await service.from('teacher_profiles').select('status').eq('user_id', teacherUser).maybeSingle();
  if (!tp || (tp as any).status !== 'approved') return { ok: false, error: 'teacher_not_approved' };
  const { data: s } = await service.from('students').select('id').eq('id', studentId).maybeSingle();
  if (!s) return { ok: false, error: 'student_not_found' };
  const { data: ex } = await service.from('teacher_assignments').select('id, status').eq('teacher_user', teacherUser).eq('student_id', studentId).maybeSingle();
  const n = String(note ?? '').trim().slice(0, 300) || null;
  if (ex) {
    if ((ex as any).status === 'active') return { ok: false, error: 'already_assigned' };
    await service.from('teacher_assignments').update({ status: 'active', ended_at: null, note: n, assigned_by: actor }).eq('id', (ex as any).id);
  } else {
    const { error } = await service.from('teacher_assignments').insert({ teacher_user: teacherUser, student_id: studentId, status: 'active', note: n, assigned_by: actor });
    if (error) return { ok: false, error: 'save_failed' };
  }
  await writeAudit(service, { actorEmail: actor, action: 'assignment.add', entity: 'teacher_assignment', entityId: studentId, detail: { teacherUser } });
  return { ok: true };
}
export async function endAssignment(service: SupabaseClient, actor: string, id: string): Promise<{ ok: boolean }> {
  const { data } = await service.from('teacher_assignments').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', id).eq('status', 'active').select('id, student_id');
  if (!data?.length) return { ok: false };
  await writeAudit(service, { actorEmail: actor, action: 'assignment.end', entity: 'teacher_assignment', entityId: id, detail: {} });
  return { ok: true };
}
export async function listAssignments(service: SupabaseClient) {
  const { data } = await service.from('teacher_assignments').select('id, teacher_user, student_id, status, note, assigned_by, created_at, ended_at').order('created_at', { ascending: false }).limit(500);
  const rows = (data ?? []) as any[];
  const tIds = Array.from(new Set(rows.map((r) => r.teacher_user))), sIds = Array.from(new Set(rows.map((r) => r.student_id)));
  const { data: t } = tIds.length ? await service.from('teacher_profiles').select('user_id, display_name').in('user_id', tIds) : { data: [] as any[] };
  const { data: s } = sIds.length ? await service.from('students').select('id, display_name').in('id', sIds) : { data: [] as any[] };
  const tn = new Map((t ?? []).map((x: any) => [x.user_id, x.display_name])), sn = new Map((s ?? []).map((x: any) => [x.id, x.display_name]));
  return rows.map((r) => ({ ...r, teacher_name: tn.get(r.teacher_user) ?? 'Teacher', student_name: sn.get(r.student_id) ?? 'Student' }));
}
export async function assignmentChoices(service: SupabaseClient) {
  const { data: t } = await service.from('teacher_profiles').select('user_id, display_name').eq('status', 'approved').order('display_name').limit(500);
  const { data: s } = await service.from('students').select('id, display_name').order('display_name').limit(1000);
  return { teachers: (t ?? []) as { user_id: string; display_name: string }[], students: (s ?? []) as { id: string; display_name: string }[] };
}
