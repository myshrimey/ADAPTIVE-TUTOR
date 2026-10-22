import type { SupabaseClient } from '@supabase/supabase-js';
import type { Curriculum } from '../curriculum/types';
import { dayOf } from './streak';

// Low-level reads and writes shared by the engagement engine. All of these run with the SERVER client and a student id that the server derived from the signed-in session.
const IST = 5.5 * 3600 * 1000;
/** UTC bounds of an India-time calendar day (YYYY-MM-DD). */
export function dayBounds(day: string): { from: string; to: string } {
  const start = new Date(new Date(day + 'T00:00:00Z').getTime() - IST);
  return { from: start.toISOString(), to: new Date(start.getTime() + 86400000).toISOString() };
}

export interface SkillInfo { skillId: string; name: string; chapterId: string; chapterName: string; subjectId: string; subjectName: string }
export function skillIndex(c: Curriculum): Map<string, SkillInfo> {
  const m = new Map<string, SkillInfo>();
  for (const s of c.subjects) for (const ch of s.chapters) for (const t of ch.topics) for (const k of t.skills) m.set(k.id, { skillId: k.id, name: k.name, chapterId: ch.id, chapterName: ch.name, subjectId: s.id, subjectName: s.name });
  return m;
}

export async function getEngagementRow(service: SupabaseClient, studentId: string) {
  const { data } = await service.from('student_engagement').select('*').eq('student_id', studentId).maybeSingle();
  if (data) return data as any;
  await service.from('student_engagement').upsert({ student_id: studentId }, { onConflict: 'student_id', ignoreDuplicates: true });
  const { data: again } = await service.from('student_engagement').select('*').eq('student_id', studentId).maybeSingle();
  return (again ?? { student_id: studentId, xp_total: 0, current_streak: 0, longest_streak: 0, last_active_day: null, nickname: null, leaderboard_opt_in: false, sync_cursor: null }) as any;
}

/** Writes one XP line. The pair (student, ref) is unique, so the same source can never pay twice. Returns true only when XP was newly added. */
export async function awardXp(service: SupabaseClient, studentId: string, a: { amount: number; kind: string; ref: string; note?: string }): Promise<boolean> {
  if (!(a.amount > 0)) return false;
  const { error } = await service.from('xp_transactions').insert({ student_id: studentId, amount: Math.round(a.amount), kind: a.kind, ref: a.ref, note: a.note ?? null });
  if (error) return false; // duplicate ref (or table missing): nothing added
  const { data } = await service.from('xp_transactions').select('amount').eq('student_id', studentId).limit(100000);
  const total = (data ?? []).reduce((n: number, r: any) => n + Number(r.amount), 0);
  await service.from('student_engagement').update({ xp_total: total, updated_at: new Date().toISOString() }).eq('student_id', studentId);
  return true;
}
/** XP earned today from repeatable practice (the part the daily cap limits). */
export async function challengeXpToday(service: SupabaseClient, studentId: string, now = new Date()): Promise<number> {
  const b = dayBounds(dayOf(now));
  const { data } = await service.from('xp_transactions').select('amount').eq('student_id', studentId).eq('kind', 'challenge').gte('created_at', b.from).lt('created_at', b.to);
  return (data ?? []).reduce((n: number, r: any) => n + Number(r.amount), 0);
}
export async function xpToday(service: SupabaseClient, studentId: string, now = new Date()): Promise<number> {
  const b = dayBounds(dayOf(now));
  const { data } = await service.from('xp_transactions').select('amount').eq('student_id', studentId).gte('created_at', b.from).lt('created_at', b.to);
  return (data ?? []).reduce((n: number, r: any) => n + Number(r.amount), 0);
}

export async function logEngagementEvent(service: SupabaseClient, studentId: string, kind: string, ref: string | null, payload: Record<string, unknown> = {}) {
  try { await service.from('engagement_events').insert({ student_id: studentId, kind, ref, payload }); } catch { /* best effort */ }
}

/** Every day (India time) on which the student did something that counts as studying. */
export async function activeDays(service: SupabaseClient, studentId: string, sinceDays = 400, now = new Date()): Promise<Set<string>> {
  const since = new Date(now.getTime() - sinceDays * 86400000).toISOString();
  const days = new Set<string>();
  const add = (rows: any[] | null, col: string) => { for (const r of rows ?? []) if (r[col]) days.add(dayOf(r[col])); };
  const [a, b, c, d, e] = await Promise.all([
    service.from('learning_sessions').select('started_at').eq('student_id', studentId).gte('started_at', since).limit(20000),
    service.from('question_attempts').select('created_at').eq('student_id', studentId).gte('created_at', since).limit(50000),
    service.from('diagnostic_attempts').select('started_at').eq('student_id', studentId).gte('started_at', since).limit(5000),
    service.from('mock_exams').select('started_at').eq('student_id', studentId).gte('started_at', since).limit(5000),
    service.from('challenge_attempts').select('started_at').eq('student_id', studentId).gte('started_at', since).limit(20000),
  ]);
  add(a.data, 'started_at'); add(b.data, 'created_at'); add(c.data, 'started_at'); add(d.data, 'started_at'); add(e.data, 'started_at');
  return days;
}
