import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanPermissions, type Permission } from './permissions';
import { writeAudit } from '../config-engine/config-engine';

export interface TeamMember { id: string; email: string; name: string; title: string | null; department: string | null; responsibilities: string | null; custom_responsibilities: string | null; permissions: Permission[]; status: 'active' | 'suspended'; notes: string | null; created_at: string }
const COLS = 'id, email, name, title, department, responsibilities, custom_responsibilities, permissions, status, notes, created_at';
const t = (v: unknown, n: number) => { const s = String(v ?? '').trim().slice(0, n); return s || null; };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function teamMemberByEmail(service: SupabaseClient, email: string | null | undefined): Promise<TeamMember | null> {
  if (!email) return null;
  const { data } = await service.from('admin_team').select(COLS).eq('email', email.toLowerCase()).maybeSingle();
  return data ? ({ ...(data as any), permissions: cleanPermissions((data as any).permissions) }) : null;
}
export async function listTeam(service: SupabaseClient): Promise<TeamMember[]> {
  const { data } = await service.from('admin_team').select(COLS).order('created_at', { ascending: true }).limit(500);
  return ((data ?? []) as any[]).map((m) => ({ ...m, permissions: cleanPermissions(m.permissions) }));
}
export async function saveTeamMember(service: SupabaseClient, actorEmail: string, input: any): Promise<{ ok: boolean; error?: string; id?: string }> {
  const email = String(input?.email ?? '').trim().toLowerCase();
  const name = t(input?.name, 120);
  if (!EMAIL.test(email)) return { ok: false, error: 'invalid_email' };
  if (!name) return { ok: false, error: 'missing_name' };
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.includes(email)) return { ok: false, error: 'already_super_admin' };
  const row = { email, name, title: t(input.title, 120), department: t(input.department, 80), responsibilities: t(input.responsibilities, 600), custom_responsibilities: t(input.custom_responsibilities, 600),
    permissions: cleanPermissions(input.permissions), status: input.status === 'suspended' ? 'suspended' : 'active', notes: t(input.notes, 600), updated_at: new Date().toISOString() };
  const { data: existing } = await service.from('admin_team').select('id, permissions, status').eq('email', email).maybeSingle();
  if (existing) {
    const { error } = await service.from('admin_team').update(row).eq('id', (existing as any).id);
    if (error) return { ok: false, error: 'save_failed' };
    await writeAudit(service, { actorEmail, action: 'team.update', entity: 'admin_team', entityId: (existing as any).id, detail: { email, before: (existing as any).permissions, after: row.permissions, status: row.status } });
    return { ok: true, id: (existing as any).id };
  }
  const { data, error } = await service.from('admin_team').insert({ ...row, created_by: actorEmail }).select('id').single();
  if (error || !data) return { ok: false, error: 'save_failed' };
  await writeAudit(service, { actorEmail, action: 'team.add', entity: 'admin_team', entityId: (data as any).id, detail: { email, permissions: row.permissions } });
  return { ok: true, id: (data as any).id };
}
export async function removeTeamMember(service: SupabaseClient, actorEmail: string, id: string): Promise<{ ok: boolean }> {
  const { data } = await service.from('admin_team').select('email').eq('id', id).maybeSingle();
  if (!data) return { ok: false };
  await service.from('admin_team').delete().eq('id', id);
  await writeAudit(service, { actorEmail, action: 'team.remove', entity: 'admin_team', entityId: id, detail: { email: (data as any).email } });
  return { ok: true };
}
