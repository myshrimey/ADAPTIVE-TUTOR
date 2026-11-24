import type { SupabaseClient } from '@supabase/supabase-js';

// v143: SERVER ONLY, server-key client. Every function fails soft when the table is missing (migration 0069 not run).
const missing = (err: any) => !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(String(err.message ?? '')));

/** User ids marked as test accounts. Empty (never throws) if the table is missing. */
export async function listTestAccountIds(service: SupabaseClient): Promise<Set<string>> {
  try {
    const { data, error } = await service.from('test_accounts').select('user_id').limit(5000);
    if (error) return new Set();
    return new Set(((data as any[]) ?? []).map((r) => String(r.user_id)));
  } catch { return new Set(); }
}
export async function isTestAccount(service: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await service.from('test_accounts').select('user_id').eq('user_id', userId).maybeSingle();
    return !error && !!data;
  } catch { return false; }
}
/** Marks a STUDENT account. Returns a coded result, never throws. */
export async function setTestMark(service: SupabaseClient, userId: string, mark: boolean, adminEmail: string, reason: string): Promise<{ ok: true } | { ok: false; error: 'test_not_a_student' | 'test_table_missing' | 'test_failed' }> {
  try {
    const { data: st } = await service.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (!st) return { ok: false, error: 'test_not_a_student' };
    const res = mark
      ? await service.from('test_accounts').upsert({ user_id: userId, marked_by: adminEmail, reason }, { onConflict: 'user_id' })
      : await service.from('test_accounts').delete().eq('user_id', userId);
    if (res.error) return { ok: false, error: missing(res.error) ? 'test_table_missing' : 'test_failed' };
    return { ok: true };
  } catch { return { ok: false, error: 'test_failed' }; }
}
