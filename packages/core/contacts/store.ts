import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanContactPatch, matchesQuery, type ContactRow, type ContactPatch, type ContactError } from './logic';

// v136: Contact book data access. Pass the SERVER-KEY client (admin pages only).
const LIMIT = 500;

export async function loadContacts(service: SupabaseClient, opts: { q?: string; role?: string } = {}): Promise<{ rows: ContactRow[]; truncated: boolean }> {
  let uq: any = service.from('users').select('id, email, role, username, created_at').order('created_at', { ascending: false }).limit(2000);
  if (opts.role) uq = uq.eq('role', opts.role);
  const { data: users, error } = await uq;
  if (error) throw error;
  const ids = (users ?? []).map((u: any) => u.id);
  const [contactsRes, studentsRes] = await Promise.all([
    service.from('user_contacts').select('user_id, phone, whatsapp, note'),
    service.from('students').select('id, user_id, display_name'),
  ]);
  const contacts = new Map<string, any>(((contactsRes as any).data ?? []).map((c: any) => [c.user_id, c])); // empty before 0067
  const students: any[] = (studentsRes as any).data ?? [];
  const byUser = new Map<string, any>(students.map((s) => [s.user_id, s]));
  const detailsRes: any = await service.from('student_profile_details').select('*');
  const details = new Map<string, any>(((detailsRes as any).data ?? []).map((d: any) => [d.student_id, d]));
  void ids;
  let rows: ContactRow[] = (users ?? []).map((u: any) => {
    const c = contacts.get(u.id); const s = byUser.get(u.id); const d = s ? details.get(s.id) : null;
    return {
      userId: u.id, role: u.role, email: u.email ?? '', username: u.username ?? null, name: s?.display_name ?? null,
      phone: c?.phone ?? null, whatsapp: c?.whatsapp ?? null, note: c?.note ?? null,
      parentName: d?.parent_name ?? null, parentPhone: d?.parent_phone ?? null, parentEmail: d?.parent_email ?? null, parentWhatsapp: d?.parent_whatsapp ?? null,
      createdAt: u.created_at ?? null,
    };
  });
  if (opts.q) rows = rows.filter((r) => matchesQuery(r, opts.q!));
  return { rows: rows.slice(0, LIMIT), truncated: rows.length > LIMIT };
}

export type UpdateResult = { ok: true; changed: string[] } | { ok: false; code: ContactError | 'contact_email_in_use' | 'contact_not_found' | 'contact_nothing_to_change' | 'contact_save_failed' };

/** Changes email (Auth first, then users; reverted if the second step fails) and phone/WhatsApp/note. Returns the names of changed fields only, never values. */
export async function updateContact(service: SupabaseClient, userId: string, input: any, actor: string): Promise<UpdateResult> {
  const c = cleanContactPatch(input);
  if (!c.ok) return { ok: false, code: c.code };
  const patch: ContactPatch = c.patch;
  if (!Object.keys(patch).length) return { ok: false, code: 'contact_nothing_to_change' };
  const { data: user } = await service.from('users').select('id, email, auth_user_id').eq('id', userId).maybeSingle();
  if (!user) return { ok: false, code: 'contact_not_found' };
  const changed: string[] = [];
  if (patch.email !== undefined && patch.email !== String((user as any).email ?? '').toLowerCase()) {
    const { data: clash } = await service.from('users').select('id').ilike('email', patch.email).neq('id', userId).limit(1);
    if (clash && clash.length) return { ok: false, code: 'contact_email_in_use' };
    const oldEmail = (user as any).email as string;
    const a = await service.auth.admin.updateUserById((user as any).auth_user_id, { email: patch.email, email_confirm: true });
    if (a.error) return { ok: false, code: 'contact_save_failed' };
    const u = await service.from('users').update({ email: patch.email }).eq('id', userId);
    if (u.error) {
      await service.auth.admin.updateUserById((user as any).auth_user_id, { email: oldEmail, email_confirm: true });
      return { ok: false, code: 'contact_save_failed' };
    }
    changed.push('email');
  }
  const cRow: Record<string, any> = {};
  for (const k of ['phone', 'whatsapp', 'note'] as const) if (patch[k] !== undefined) { cRow[k] = patch[k]; changed.push(k); }
  if (Object.keys(cRow).length) {
    const r = await service.from('user_contacts').upsert({ user_id: userId, ...cRow, updated_by: actor, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (r.error) return { ok: false, code: 'contact_save_failed' };
  }
  return { ok: true, changed };
}
