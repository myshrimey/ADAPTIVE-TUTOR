// Pure engagement calculations. Every number is a count of what happened. A rate with too few students behind it returns null and is shown as "Insufficient data".
export const MIN_N = 5;
export type Activity = Map<string, Set<string>>; // student id -> active days (YYYY-MM-DD, India time)
const DAY = 86400000;
export const shiftDay = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * DAY).toISOString().slice(0, 10);

export const activeBetween = (a: Activity, from: string, to: string): number => { let n = 0; for (const s of a.values()) for (const d of s) if (d >= from && d <= to) { n++; break; } return n; };
export function dauWauMau(a: Activity, today: string) {
  const dau = activeBetween(a, today, today), wau = activeBetween(a, shiftDay(today, -6), today), mau = activeBetween(a, shiftDay(today, -29), today);
  return { dau, wau, mau, dauWau: wau ? Math.round((dau / wau) * 100) / 100 : null, dauMau: mau ? Math.round((dau / mau) * 100) / 100 : null };
}
/** Day-N retention: of students who joined at least N days ago, the share who were active exactly N days after their first day. */
export function retention(joined: Map<string, string>, a: Activity, n: number, today: string): { eligible: number; retained: number; rate: number | null } {
  let eligible = 0, retained = 0;
  for (const [id, day] of joined) { if (shiftDay(day, n) > today) continue; eligible++; if (a.get(id)?.has(shiftDay(day, n))) retained++; }
  return { eligible, retained, rate: eligible >= MIN_N ? Math.round((retained / eligible) * 100) : null };
}
export function dailyTrend(a: Activity, today: string, days: number): { day: string; active: number }[] {
  const out: { day: string; active: number }[] = [];
  for (let i = days - 1; i >= 0; i--) { const d = shiftDay(today, -i); out.push({ day: d, active: activeBetween(a, d, d) }); }
  return out;
}
/** Students active this week who were also active the week before. */
export function returnRate(a: Activity, today: string): { prior: number; returned: number; rate: number | null } {
  const w1 = [shiftDay(today, -6), today], w0 = [shiftDay(today, -13), shiftDay(today, -7)];
  let prior = 0, returned = 0;
  for (const s of a.values()) { const was = [...s].some((d) => d >= w0[0] && d <= w0[1]); if (!was) continue; prior++; if ([...s].some((d) => d >= w1[0] && d <= w1[1])) returned++; }
  return { prior, returned, rate: prior >= MIN_N ? Math.round((returned / prior) * 100) : null };
}
export const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
/** Compares learning change between two engagement groups. This is an association, not proof that engagement caused the change. */
export function compareGroups(high: number[], low: number[]) {
  return { highN: high.length, lowN: low.length, highAvg: high.length >= MIN_N ? avg(high) : null, lowAvg: low.length >= MIN_N ? avg(low) : null, enough: high.length >= MIN_N && low.length >= MIN_N };
}
export const share = (num: number, den: number) => (den >= MIN_N ? Math.round((num / den) * 100) : null);
