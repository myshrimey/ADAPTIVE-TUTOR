// Spaced revision, pure rules (no database, no AI). After a student shows a skill, it comes back for a short review after 1, 3, 7, 14, 30, 60 days.
// A pass moves it up a step; a miss brings it back sooner. Days are Indian (IST) calendar days. Nothing here predicts marks or labels a child.

export const LADDER = [1, 3, 7, 14, 30, 60] as const;
export const PASS_RATIO = 2 / 3;

export interface EvidenceRow { at: string; correct: boolean; hint?: boolean }
export interface ReviewState { rung: number; intervalDays: number; reps: number; lapses: number; dueOn: string; lastDay: string; lastResult: 'first' | 'pass' | 'fail' | 'early'; lastEvidenceAt: string }

export const istDayStr = (iso: string | number | Date): string => new Date(new Date(iso).getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
export const addDaysStr = (day: string, n: number): string => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string): number => Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);

/** Interval for a step. A skill that has been forgotten twice or more comes back a little sooner. */
export function intervalFor(rung: number, lapses: number): number {
  const base = LADDER[Math.max(0, Math.min(LADDER.length - 1, rung))];
  return Math.max(1, Math.round(base * (lapses >= 2 ? 0.7 : 1)));
}

/** Never schedule a review after the exam has started: keep one day free before it. */
export function capToExam(dueOn: string, examDate?: string | null, today?: string): string {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return dueOn;
  if (today && examDate <= today) return dueOn; // the date has passed: ignore it
  const last = addDaysStr(examDate, -1);
  return dueOn > last ? (today && last < today ? today : last) : dueOn;
}

interface DayGroup { day: string; n: number; correct: number; at: string }
function groupByDay(rows: EvidenceRow[]): DayGroup[] {
  const m = new Map<string, DayGroup>();
  for (const r of [...rows].sort((a, b) => a.at.localeCompare(b.at))) {
    const d = istDayStr(r.at); const g = m.get(d) ?? { day: d, n: 0, correct: 0, at: r.at };
    g.n++; if (r.correct) g.correct++; g.at = r.at; m.set(d, g);
  }
  return [...m.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Folds new evidence into a schedule. Each IST day counts once, so answering ten questions in one evening does not push the next review out.
 * - first ever day: first review is due the next day.
 * - on or after the due day: pass (at least 2/3 right) moves up one step; a miss goes back to step 1 and counts one lapse.
 * - before the due day: a pass changes nothing ("early"); a miss still counts as forgetting.
 */
export function foldEvidence(state: ReviewState | null, rows: EvidenceRow[], examDate?: string | null, today?: string): ReviewState | null {
  let s = state ? { ...state } : null;
  for (const g of groupByDay(rows)) {
    if (s && g.at <= s.lastEvidenceAt) continue; // already counted
    const pass = g.correct / g.n >= PASS_RATIO;
    if (!s) {
      s = { rung: 0, intervalDays: intervalFor(0, 0), reps: 0, lapses: 0, dueOn: addDaysStr(g.day, intervalFor(0, 0)), lastDay: g.day, lastResult: 'first', lastEvidenceAt: g.at };
    } else if (g.day === s.lastDay) {
      s.lastEvidenceAt = g.at; // same day again: just remember we saw it
      if (!pass && s.lastResult !== 'fail') { s.lapses++; s.rung = 0; s.intervalDays = intervalFor(0, s.lapses); s.dueOn = addDaysStr(g.day, s.intervalDays); s.lastResult = 'fail'; }
    } else if (g.day >= s.dueOn) {
      if (pass) { s.rung = Math.min(LADDER.length - 1, s.rung + 1); s.reps++; s.lastResult = 'pass'; } else { s.rung = 0; s.lapses++; s.lastResult = 'fail'; }
      s.intervalDays = intervalFor(s.rung, s.lapses); s.dueOn = addDaysStr(g.day, s.intervalDays); s.lastDay = g.day; s.lastEvidenceAt = g.at;
    } else {
      if (!pass) { s.rung = 0; s.lapses++; s.lastResult = 'fail'; s.intervalDays = intervalFor(0, s.lapses); s.dueOn = addDaysStr(g.day, s.intervalDays); } else s.lastResult = 'early';
      s.lastDay = g.day; s.lastEvidenceAt = g.at;
    }
    s.dueOn = capToExam(s.dueOn, examDate, today ?? g.day);
  }
  return s;
}

export interface RevisionItem { competencyId: string; name: string; chapter?: string | null; skillId?: string | null; importance: number; mastery?: number | null; dueOn: string; overdueDays: number; rung: number; lapses: number; priority: number }
export type ReviewKind = 'daily' | 'weekly' | 'cumulative' | 'pre_exam';
export interface ReviewPlan {
  mode: ReviewKind; today: string; daysToExam: number | null;
  daily: RevisionItem[]; // due now, most useful first, mixed across chapters
  dueTotal: number; overdueTotal: number;
  weekly: { count: number; byDay: Record<string, number> }; // due in the next 7 days (not today)
  extra: RevisionItem[]; // optional mixed practice: secure skills that are not due yet, from different chapters
  cumulative: number; // skills on the 14-day step or longer that are due: a "mixed" look back
  minutes: number;
  note: string;
}

export function priorityOf(overdueDays: number, lapses: number, importance: number, mastery?: number | null): number {
  const imp = 1 + (Math.max(1, Math.min(5, importance)) - 3) / 5;
  const weak = mastery == null ? 1 : 1 + (1 - Math.max(0, Math.min(1, mastery))) * 0.5;
  return Math.round((1 + Math.max(0, overdueDays)) * (1 + lapses * 0.3) * imp * weak * 100) / 100;
}

/** Puts the list in an order where neighbouring items come from different chapters (a light mix, after each skill has been learned on its own). */
export function mixOrder<T extends { chapter?: string | null; priority: number }>(items: T[]): T[] {
  const left = [...items].sort((a, b) => b.priority - a.priority); const out: T[] = [];
  while (left.length) {
    const prev = out[out.length - 1]?.chapter;
    let i = left.findIndex((x) => !prev || !x.chapter || x.chapter !== prev);
    if (i < 0) i = 0;
    out.push(left.splice(i, 1)[0]);
  }
  return out;
}

export interface ReviewPlanInput { states: (ReviewState & { competencyId: string; name: string; chapter?: string | null; skillId?: string | null; importance?: number; mastery?: number | null })[]; today: string; examDate?: string | null; dailyCap?: number }
export function buildReviewPlan(inp: ReviewPlanInput): ReviewPlan {
  const daysToExam = inp.examDate && /^\d{4}-\d{2}-\d{2}$/.test(inp.examDate) && inp.examDate > inp.today ? daysBetween(inp.today, inp.examDate) : null;
  const mode: ReviewKind = daysToExam !== null && daysToExam <= 21 ? 'pre_exam' : 'daily';
  const cap = inp.dailyCap ?? (mode === 'pre_exam' ? 10 : 6);
  const items: RevisionItem[] = inp.states.map((s) => {
    const overdueDays = Math.max(0, daysBetween(s.dueOn, inp.today));
    const imp = s.importance ?? 3;
    return { competencyId: s.competencyId, name: s.name, chapter: s.chapter, skillId: s.skillId, importance: imp, mastery: s.mastery ?? null, dueOn: s.dueOn, overdueDays, rung: s.rung, lapses: s.lapses, priority: priorityOf(overdueDays, s.lapses, imp, s.mastery) };
  });
  const due = items.filter((i) => i.dueOn <= inp.today);
  const daily = mixOrder(due).slice(0, cap);
  const byDay: Record<string, number> = {}; let weekly = 0;
  for (const i of items) if (i.dueOn > inp.today && daysBetween(inp.today, i.dueOn) <= 7) { weekly++; byDay[i.dueOn] = (byDay[i.dueOn] ?? 0) + 1; }
  // Optional mixed practice (interleaving): only skills the student already handles on their own (mastery 60+), never ones that are due or being relearned,
  // taken from as many different chapters as possible, least recently seen first.
  const extra = mixOrder(items.filter((i) => i.dueOn > inp.today && i.lapses === 0 && (i.mastery ?? 0) >= 0.6).sort((a, b) => a.dueOn.localeCompare(b.dueOn)).map((i) => ({ ...i, priority: 1000 - daysBetween(inp.today, i.dueOn) }))).slice(0, 6);
  const cumulative = due.filter((i) => i.rung >= 3).length;
  const note = daily.length === 0
    ? (items.length === 0 ? 'Nothing to revise yet. Revision starts after you have practised a skill.' : 'Nothing is due today. Well done; the next review is already planned.')
    : mode === 'pre_exam' ? `The exam is ${daysToExam} days away: short reviews of the skills that need it most.` : 'A short mixed review: one question for each skill that is due.';
  return { mode, today: inp.today, daysToExam, daily, dueTotal: due.length, overdueTotal: due.filter((i) => i.overdueDays > 0).length, weekly: { count: weekly, byDay }, cumulative, minutes: Math.max(0, daily.length * 2), extra, note };
}
