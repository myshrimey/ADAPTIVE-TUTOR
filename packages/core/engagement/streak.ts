// Study streak from a set of active days (YYYY-MM-DD, India time). Any learning activity counts; the wording never blames.
export interface StreakInfo { current: number; longest: number; lastDay: string | null; activeToday: boolean; weekDays: { day: string; active: boolean }[]; state: 'today_done' | 'continue_today' | 'welcome_back' | 'new'; message: string }
const DAY = 86400000;
const IST = 5.5 * 3600 * 1000;
export const dayOf = (d: Date | string) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 10);
const shift = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * DAY).toISOString().slice(0, 10);

export function longestRun(days: Set<string>): number {
  const sorted = [...days].sort(); let best = 0, run = 0, prev: string | null = null;
  for (const d of sorted) { run = prev && shift(prev, 1) === d ? run + 1 : 1; if (run > best) best = run; prev = d; }
  return best;
}
export function streakInfo(days: Set<string>, now: Date = new Date()): StreakInfo {
  const today = dayOf(now);
  const activeToday = days.has(today);
  // Today does not break a streak until it is over: count back from yesterday when today has no activity yet.
  let cursor = activeToday ? today : shift(today, -1), current = 0;
  while (days.has(cursor)) { current++; cursor = shift(cursor, -1); }
  const last = [...days].sort().pop() ?? null;
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = shift(today, i - 6); return { day: d, active: days.has(d) }; });
  let state: StreakInfo['state'], message: string;
  if (days.size === 0) { state = 'new'; message = 'Start today. Your first study day begins your streak.'; }
  else if (activeToday) { state = 'today_done'; message = current >= 2 ? `${current} days in a row. Nice work today.` : 'You studied today. Come back tomorrow to start a streak.'; }
  else if (current > 0) { state = 'continue_today'; message = `Ready to continue your learning streak? You are on ${current} day${current === 1 ? '' : 's'}.`; }
  else { state = 'welcome_back'; message = 'Welcome back! A short session today starts a new streak. Your longest streak is kept.'; }
  return { current, longest: Math.max(longestRun(days), current), lastDay: last, activeToday, weekDays, state, message };
}
