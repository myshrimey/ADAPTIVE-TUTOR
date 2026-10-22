import type { SupabaseClient } from '@supabase/supabase-js';
import { activeDays, dayBounds, type SkillInfo } from './store';
import { dayOf } from './streak';

// A calm weekly summary for a parent, tutor or centre. Counts only. No per-action alerts, no timestamps, never a prediction.
export interface WeeklySummary { sentence: string; facts: string[]; enough: boolean }
export async function weeklySummary(service: SupabaseClient, studentId: string, name: string, idx: Map<string, SkillInfo>, now = new Date()): Promise<WeeklySummary> {
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const [days, ses, ch, ev, mk] = await Promise.all([
    activeDays(service, studentId, 7, now),
    service.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'completed').gte('completed_at', since),
    service.from('challenge_attempts').select('mode, answers, subject_id, accuracy, total, completed_at').eq('student_id', studentId).eq('status', 'completed').gte('completed_at', new Date(now.getTime() - 30 * 86400000).toISOString()).limit(500),
    service.from('engagement_events').select('kind').eq('student_id', studentId).gte('created_at', since).in('kind', ['mistake_corrected', 'personal_best']).limit(500),
    service.from('mock_exams').select('subject_id, score, total, submitted_at').eq('student_id', studentId).eq('status', 'submitted').gte('submitted_at', new Date(now.getTime() - 30 * 86400000).toISOString()).limit(50),
  ]);
  const weekRounds = ((ch.data ?? []) as any[]).filter((r) => r.completed_at >= since);
  const rounds = weekRounds.length; const qs = weekRounds.reduce((n, r) => n + (r.answers ?? []).length, 0);
  const corrected = ((ev.data ?? []) as any[]).filter((e) => e.kind === 'mistake_corrected').length;
  const bests = ((ev.data ?? []) as any[]).filter((e) => e.kind === 'personal_best').length;
  const sessions = ses.count ?? 0;
  const facts: string[] = [];
  const studied = [...days].filter((d) => d >= dayOf(new Date(now.getTime() - 6 * 86400000))).length;
  facts.push(`Studied on ${studied} day${studied === 1 ? '' : 's'} this week.`);
  if (sessions) facts.push(`${sessions} learning session${sessions === 1 ? '' : 's'} completed.`);
  if (rounds) facts.push(`${rounds} practice round${rounds === 1 ? '' : 's'} (${qs} questions).`);
  if (corrected) facts.push(`${corrected} earlier mistake${corrected === 1 ? '' : 's'} corrected.`);
  if (bests) facts.push(`${bests} new personal best${bests === 1 ? '' : 's'}.`);
  // Score change per subject over 30 days, only with at least two scored assessments of 5+ questions each.
  const pts: Record<string, { at: string; pct: number }[]> = {};
  for (const r of (ch.data ?? []) as any[]) if (r.subject_id && r.total >= 5 && r.accuracy !== null && r.mode !== 'mistake_review' && r.mode !== 'comeback') (pts[r.subject_id] ??= []).push({ at: r.completed_at, pct: Math.round(Number(r.accuracy)) });
  for (const r of (mk.data ?? []) as any[]) if (r.total >= 5) (pts[r.subject_id] ??= []).push({ at: r.submitted_at, pct: Math.round((r.score / r.total) * 100) });
  const names = new Map<string, string>([...idx.values()].map((i) => [i.subjectId, i.subjectName] as [string, string]));
  let change = '';
  for (const [sid, arr] of Object.entries(pts)) { if (arr.length < 2) continue; arr.sort((a, b) => (a.at < b.at ? -1 : 1)); const a = arr[0].pct, z = arr[arr.length - 1].pct; if (z !== a) { change = ` ${names.get(sid) ?? 'A subject'} practice scores moved from ${a}% to ${z}% over the last 30 days.`; break; } }
  const enough = studied > 0 || sessions > 0 || rounds > 0;
  const sentence = enough ? `This week ${name} studied on ${studied} day${studied === 1 ? '' : 's'}${sessions ? `, completed ${sessions} learning session${sessions === 1 ? '' : 's'}` : ''}${rounds ? ` and ${rounds} practice round${rounds === 1 ? '' : 's'}` : ''}${corrected ? `, and corrected ${corrected} earlier mistake${corrected === 1 ? '' : 's'}` : ''}.${change}` : `No study recorded this week for ${name}. Insufficient data for a summary.`;
  return { sentence, facts, enough };
}
