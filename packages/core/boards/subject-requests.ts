import type { SupabaseClient } from '@supabase/supabase-js';

export interface SubjectRequestInput { board?: string; classLevel?: string; subject: string; language?: string; note?: string }
export function cleanSubjectRequest(i: any): { ok: true; value: { board: string; class_level: string | null; subject_text: string; language: string | null; note: string | null } } | { ok: false; error: string } {
  const subject = String(i?.subject ?? '').trim().replace(/\s+/g, ' ');
  if (subject.length < 2 || subject.length > 80) return { ok: false, error: 'Please type the subject name (2 to 80 characters).' };
  const board = String(i?.board ?? 'CBSE').trim().slice(0, 30) || 'CBSE';
  const cls = String(i?.classLevel ?? '').trim().slice(0, 10) || null;
  const lang = /^[a-z]{2,3}$/.test(String(i?.language ?? '')) ? String(i.language) : null;
  const note = String(i?.note ?? '').trim().slice(0, 300) || null;
  return { ok: true, value: { board, class_level: cls, subject_text: subject, language: lang, note } };
}
/** Counts requests per board / class / subject (case-insensitive) for the founder. No names or contact details are read. */
export function tallyRequests(rows: { board: string; class_level: string | null; subject_text: string; language: string | null }[]) {
  const m = new Map<string, { board: string; classLevel: string; subject: string; count: number; languages: Record<string, number> }>();
  for (const r of rows) {
    const key = `${r.board.toUpperCase()}|${r.class_level ?? '-'}|${r.subject_text.toLowerCase()}`;
    const x = m.get(key) ?? { board: r.board, classLevel: r.class_level ?? '—', subject: r.subject_text, count: 0, languages: {} };
    x.count++; if (r.language) x.languages[r.language] = (x.languages[r.language] ?? 0) + 1; m.set(key, x);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}
export async function saveSubjectRequest(service: SupabaseClient, userId: string | null, input: any): Promise<void> {
  const c = cleanSubjectRequest(input);
  if (!c.ok) throw new Error(c.error);
  // One identical request per person per day is enough.
  if (userId) {
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count } = await service.from('subject_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('subject_text', c.value.subject_text).gte('created_at', since);
    if ((count ?? 0) > 0) return;
    const { count: many } = await service.from('subject_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
    if ((many ?? 0) >= 10) throw new Error('Too many requests today. Please try again tomorrow.');
  }
  const { error } = await service.from('subject_requests').insert({ user_id: userId, ...c.value });
  if (error) throw new Error('Could not save your request.');
}
