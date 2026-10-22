import type { SupabaseClient } from '@supabase/supabase-js';
import { checkNickname, composeBoard, type BoardView, type WeeklyStat } from './leaderboard';
import { getEngagementRow, activeDays } from './store';
import { featureOn, type EngagementSettings } from './config';
import { dayOf } from './streak';

const SCORED_MODES = ['practice', 'challenge', 'mixed', 'boss', 'weakness', 'daily', 'org', 'friend', 'session_quiz'];

/** Joins the optional class board. Needs a nickname that reveals nothing about the child. Real names never leave this module. */
export async function joinClassBoard(service: SupabaseClient, studentId: string, rawNickname: string, settings: EngagementSettings): Promise<string> {
  if (!featureOn(settings, studentId, 'leaderboard')) throw new Error('Leaderboards are not switched on.');
  const { data: st } = await service.from('students').select('display_name, grade').eq('id', studentId).maybeSingle();
  const c = checkNickname(rawNickname, st?.display_name ?? null); if (!c.ok) throw new Error(c.error);
  await getEngagementRow(service, studentId);
  const { error } = await service.from('student_engagement').update({ nickname: c.value, leaderboard_opt_in: true, updated_at: new Date().toISOString() }).eq('student_id', studentId);
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'That nickname is taken. Try another.' : 'Could not save your nickname.');
  const grade = String(st?.grade ?? '10');
  let { data: b } = await service.from('leaderboards').select('id').eq('scope', 'class').eq('grade', grade).eq('active', true).maybeSingle();
  if (!b) { const ins = await service.from('leaderboards').insert({ scope: 'class', name: `Class ${grade}`, grade }).select('id').single(); b = ins.data; }
  if (!b) throw new Error('Could not open the board.');
  await service.from('leaderboard_entries').upsert({ leaderboard_id: b.id, student_id: studentId, display_name: c.value });
  return c.value;
}
export async function leaveBoards(service: SupabaseClient, studentId: string): Promise<void> {
  await service.from('leaderboard_entries').delete().eq('student_id', studentId);
  await service.from('student_engagement').update({ leaderboard_opt_in: false, nickname: null, updated_at: new Date().toISOString() }).eq('student_id', studentId);
}

export async function weeklyStats(service: SupabaseClient, members: { studentId: string; nickname: string }[], windowDays: number, now = new Date()): Promise<WeeklyStat[]> {
  if (!members.length) return [];
  const ids = members.map((m) => m.studentId);
  const from = new Date(now.getTime() - windowDays * 86400000).toISOString(), prevFrom = new Date(now.getTime() - 2 * windowDays * 86400000).toISOString();
  const { data: ch } = await service.from('challenge_attempts').select('student_id, correct, total, completed_at').in('student_id', ids).eq('status', 'completed').in('mode', SCORED_MODES).gte('completed_at', prevFrom).limit(20000);
  const { data: ev } = await service.from('engagement_events').select('student_id').in('student_id', ids).eq('kind', 'mistake_corrected').gte('created_at', from).limit(20000);
  const out: WeeklyStat[] = [];
  const fromDay = dayOf(from);
  for (const m of members) {
    const mine = ((ch ?? []) as any[]).filter((r) => r.student_id === m.studentId);
    const cur = mine.filter((r) => r.completed_at >= from), prev = mine.filter((r) => r.completed_at < from);
    const acc = (rows: any[]) => { const t = rows.reduce((n, r) => n + r.total, 0); return t >= 5 ? Math.round((rows.reduce((n, r) => n + r.correct, 0) / t) * 1000) / 10 : null; };
    const days = [...(await activeDays(service, m.studentId, windowDays + 1, now))].filter((d) => d >= fromDay).length;
    out.push({ studentId: m.studentId, nickname: m.nickname, attempts: cur.length, accuracy: acc(cur), prevAccuracy: acc(prev), mistakesCorrected: ((ev ?? []) as any[]).filter((e) => e.student_id === m.studentId).length, activeDays: days, challengesDone: cur.length });
  }
  return out;
}
export async function loadClassBoard(service: SupabaseClient, studentId: string, settings: EngagementSettings): Promise<(BoardView & { name: string }) | null> {
  const { data: mine } = await service.from('leaderboard_entries').select('leaderboard_id, leaderboards(name)').eq('student_id', studentId).limit(1).maybeSingle();
  if (!mine) return null;
  const { data: entries } = await service.from('leaderboard_entries').select('student_id, display_name').eq('leaderboard_id', mine.leaderboard_id).limit(500);
  const stats = await weeklyStats(service, ((entries ?? []) as any[]).map((e) => ({ studentId: e.student_id, nickname: e.display_name })), settings.leaderboard.window_days);
  return { ...composeBoard(stats, studentId, settings.leaderboard.min_members), name: (mine as any).leaderboards?.name ?? 'Class' };
}
