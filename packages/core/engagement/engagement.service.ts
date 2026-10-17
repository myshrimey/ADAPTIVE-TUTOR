import type { SupabaseClient } from '@supabase/supabase-js';

// Engagement signals for the parent report and the student's own dashboard. These describe
// WHAT HAPPENED (how long answers took, sessions left unfinished, how often the student came
// back) — never why, and never a label for the child.

export interface EngagementSummary {
  days: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  /** Sessions never finished: marked abandoned, or still "active" 3+ hours after they started. */
  sessionsUnfinished: number;
  unfinishedShare: number | null;
  activeDays: number;
  /** Average distinct study days per week over the window. */
  daysPerWeek: number;
  currentStreakDays: number;
  /** Median seconds to answer (answers with a recorded time only); null when none recorded yet. */
  medianAnswerSeconds: number | null;
  timedAnswers: number;
  /** Share of timed answers that took more than 2x the expected time. null when expected time unknown. */
  slowShare: number | null;
}

const UNFINISHED_AFTER_MS = 3 * 3600 * 1000;
const IST_OFFSET_MS = 5.5 * 3600 * 1000;

/** YYYY-MM-DD in Indian Standard Time. */
export function istDay(d: Date | string): string {
  return new Date(new Date(d).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Consecutive study days ending today (or yesterday: today doesn't break a streak until it is over). */
export function currentStreak(days: Set<string>, now: Date = new Date()): number {
  const dayMs = 86400000;
  let cursor = new Date(now.getTime());
  if (!days.has(istDay(cursor))) cursor = new Date(cursor.getTime() - dayMs);
  let n = 0;
  while (days.has(istDay(cursor))) {
    n++;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return n;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export async function loadEngagement(supabase: SupabaseClient, studentId: string, days = 30, now: Date = new Date()): Promise<EngagementSummary> {
  const since = new Date(now.getTime() - days * 86400000).toISOString();
  const { data: sessions } = await supabase.from('learning_sessions').select('status, started_at').eq('student_id', studentId).gte('started_at', since);
  const { data: attempts } = await supabase
    .from('question_attempts')
    .select('time_taken_seconds, created_at, question_id')
    .eq('student_id', studentId)
    .gte('created_at', since);
  // Streak needs a longer look-back than the report window.
  const { data: recentSessions } = await supabase
    .from('learning_sessions')
    .select('started_at')
    .eq('student_id', studentId)
    .gte('started_at', new Date(now.getTime() - 120 * 86400000).toISOString());

  const s = sessions ?? [];
  const completed = s.filter((x: any) => x.status === 'completed').length;
  const unfinished = s.filter(
    (x: any) => x.status === 'abandoned' || (x.status === 'active' && now.getTime() - new Date(x.started_at).getTime() > UNFINISHED_AFTER_MS)
  ).length;

  const dayset = new Set<string>();
  for (const x of s) dayset.add(istDay(x.started_at));
  const streakSet = new Set<string>((recentSessions ?? []).map((x: any) => istDay(x.started_at)));

  const timed = (attempts ?? []).filter((a: any) => typeof a.time_taken_seconds === 'number' && a.time_taken_seconds > 0);
  // Expected time per question (planning default) to judge "slow".
  let slowShare: number | null = null;
  if (timed.length) {
    const qids = [...new Set(timed.map((a: any) => a.question_id))];
    const exp = new Map<string, number>();
    for (let i = 0; i < qids.length; i += 200) {
      const { data } = await supabase.from('questions').select('id, expected_time_seconds').in('id', qids.slice(i, i + 200));
      for (const q of data ?? []) if (q.expected_time_seconds) exp.set(q.id, q.expected_time_seconds);
    }
    const judged = timed.filter((a: any) => exp.has(a.question_id));
    if (judged.length) slowShare = judged.filter((a: any) => a.time_taken_seconds > 2 * (exp.get(a.question_id) as number)).length / judged.length;
  }

  return {
    days,
    sessionsStarted: s.length,
    sessionsCompleted: completed,
    sessionsUnfinished: unfinished,
    unfinishedShare: s.length ? unfinished / s.length : null,
    activeDays: dayset.size,
    daysPerWeek: Math.round((dayset.size / (days / 7)) * 10) / 10,
    currentStreakDays: currentStreak(streakSet, now),
    medianAnswerSeconds: median(timed.map((a: any) => a.time_taken_seconds)),
    timedAnswers: timed.length,
    slowShare,
  };
}
