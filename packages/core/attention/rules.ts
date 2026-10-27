// Tutor / centre intelligence, pure rules (no database, no AI). Answers "which student needs my attention, why, and what could I do?".
// It reports what was practised and when. It never predicts marks, ranks children or gives anyone a label; a "watch" is a prompt for a human conversation.

export interface StudentSignals {
  studentId: string; name: string;
  skillsWithEvidence: number; averageMastery: number | null;
  daysSinceActive: number | null; sessions14d: number;
  weakSkills: { skillId: string; name: string; score: number }[]; // practised skills under 40
  strongSkills: number; // skills at 75 or more
  overdueReviews: number; lapses: number;
}
export type AttentionKind = 'intervene' | 'watch' | 'on_track' | 'ready_for_advanced' | 'no_data';
export const ATTENTION_LABEL: Record<AttentionKind, string> = { intervene: 'Needs a conversation', watch: 'Keep an eye', on_track: 'Going well', ready_for_advanced: 'Ready for harder work', no_data: 'Not enough information yet' };
export interface Attention { studentId: string; name: string; kind: AttentionKind; priority: number; reasons: string[]; evidence: string; suggestion: string; focusSkill?: { skillId: string; name: string; score: number } }

export function attentionFor(s: StudentSignals): Attention {
  const reasons: string[] = []; let p = 0;
  const base = { studentId: s.studentId, name: s.name };
  if (s.skillsWithEvidence < 3 && s.sessions14d === 0) {
    return { ...base, kind: 'no_data', priority: 0, reasons: ['Little or no practice recorded yet'], evidence: `${s.skillsWithEvidence} skill(s) practised, no sessions in 14 days.`, suggestion: 'Ask the student to take the adaptive check, so there is something to build on.' };
  }
  if (s.daysSinceActive !== null) {
    if (s.daysSinceActive >= 14) { p += 35; reasons.push(`Has not practised for ${s.daysSinceActive} days`); }
    else if (s.daysSinceActive >= 7) { p += 20; reasons.push(`Has not practised for ${s.daysSinceActive} days`); }
  }
  if (s.averageMastery !== null) {
    if (s.averageMastery < 40) { p += 30; reasons.push(`Average mastery is ${s.averageMastery}/100`); }
    else if (s.averageMastery < 55) { p += 15; reasons.push(`Average mastery is ${s.averageMastery}/100`); }
  }
  if (s.weakSkills.length) { p += Math.min(20, s.weakSkills.length * 5); reasons.push(`${s.weakSkills.length} skill(s) still low`); }
  if (s.overdueReviews >= 3) { p += 10; reasons.push(`${s.overdueReviews} reviews are overdue`); }
  if (s.lapses >= 3) { p += 10; reasons.push('Several skills were forgotten after being learned'); }
  const focus = [...s.weakSkills].sort((a, b) => a.score - b.score)[0];
  const evidence = `${s.skillsWithEvidence} skills practised; average ${s.averageMastery ?? 'n/a'}/100; ${s.sessions14d} session(s) in 14 days; last active ${s.daysSinceActive === null ? 'never' : s.daysSinceActive + ' day(s) ago'}.`;
  if (p === 0 && s.averageMastery !== null && s.averageMastery >= 75 && s.strongSkills >= 5 && s.sessions14d >= 2) {
    return { ...base, kind: 'ready_for_advanced', priority: 0, reasons: [`${s.strongSkills} skills at 75 or more`, 'Practising regularly'], evidence, suggestion: 'Offer the Challenge zone or a harder set; praise the steady work.' };
  }
  const kind: AttentionKind = p >= 40 ? 'intervene' : p >= 15 ? 'watch' : 'on_track';
  let suggestion: string;
  if (kind === 'on_track') suggestion = 'No action needed. A word of encouragement helps.';
  else if (s.daysSinceActive !== null && s.daysSinceActive >= 7 && !focus) suggestion = 'Check in kindly: ask what is getting in the way, and agree on one short 15-minute session this week.';
  else if (focus) suggestion = `A 20-minute guided session on "${focus.name}", then 3 short questions a few days later (the Revise today page will bring it back by itself).`;
  else suggestion = 'Look at the report together and pick one skill to practise this week.';
  return { ...base, kind, priority: p, reasons, evidence, suggestion, focusSkill: focus };
}

export function rankAttention(list: Attention[]): Attention[] {
  const order: Record<AttentionKind, number> = { intervene: 0, watch: 1, no_data: 2, ready_for_advanced: 3, on_track: 4 };
  return [...list].sort((a, b) => order[a.kind] - order[b.kind] || b.priority - a.priority || a.name.localeCompare(b.name));
}

export interface BatchSummary { students: number; active7: number; averageMastery: number | null; needAttention: number; ready: number; commonGaps: { name: string; students: number }[] }
export function summariseBatch(signals: StudentSignals[], att: Attention[]): BatchSummary {
  const withAvg = signals.filter((s) => s.averageMastery !== null);
  const gaps = new Map<string, number>();
  for (const s of signals) for (const w of s.weakSkills) gaps.set(w.name, (gaps.get(w.name) ?? 0) + 1);
  return {
    students: signals.length,
    active7: signals.filter((s) => s.daysSinceActive !== null && s.daysSinceActive < 7).length,
    averageMastery: withAvg.length ? Math.round(withAvg.reduce((a, s) => a + (s.averageMastery ?? 0), 0) / withAvg.length) : null,
    needAttention: att.filter((a) => a.kind === 'intervene').length,
    ready: att.filter((a) => a.kind === 'ready_for_advanced').length,
    commonGaps: [...gaps.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, students]) => ({ name, students })),
  };
}

export const MIN_DAYS_TO_JUDGE = 5;
export const CHANGE_THRESHOLD = 8;
/** Did the skill score move after the intervention? Association only: many things change a score. */
export function interventionResult(baseline: number | null, followup: number | null, daysSince: number): 'improved' | 'no_change' | 'lower' | 'not_enough_data' {
  if (baseline === null || followup === null || daysSince < MIN_DAYS_TO_JUDGE) return 'not_enough_data';
  const d = followup - baseline;
  return d >= CHANGE_THRESHOLD ? 'improved' : d <= -CHANGE_THRESHOLD ? 'lower' : 'no_change';
}
export const RESULT_TEXT: Record<string, string> = {
  improved: 'The skill score is higher than before. It may be because of the session, but other practice also counts.',
  no_change: 'The score has not moved much yet. Try a different approach or give it more time.',
  lower: 'The score is lower than before. Look at the recent answers together; it can be a bad day, not a trend.',
  not_enough_data: 'Too early, or not enough answers, to say.',
};
