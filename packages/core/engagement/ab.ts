import type { SupabaseClient } from '@supabase/supabase-js';
import { bucket, type EngagementSettings, type EngagementFeature } from './config';
import { weeklyStats } from './leaderboard-store';
import { MIN_N } from './metrics';

// A/B readiness: when the founder gives a feature a share below 100%, students are split by a fixed hash of their id into "has it" and "does not have it".
// The comparison below is an ASSOCIATION, not proof: the split is not a controlled trial, the groups are small, and nothing here says one group would not have improved anyway.
export interface GroupStat { n: number; mean: number | null }
export interface MetricCompare { metric: string; unit: string; on: GroupStat; off: GroupStat; diff: number | null; verdict: 'insufficient' | 'within_noise' | 'higher_with' | 'lower_with' }
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const variance = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); };
const r1 = (x: number) => Math.round(x * 10) / 10;

export function compareAbGroups(metric: string, unit: string, on: number[], off: number[]): MetricCompare {
  const g = (a: number[]): GroupStat => ({ n: a.length, mean: a.length >= MIN_N ? r1(mean(a)) : null });
  const gOn = g(on), gOff = g(off);
  if (on.length < MIN_N || off.length < MIN_N) return { metric, unit, on: gOn, off: gOff, diff: null, verdict: 'insufficient' };
  const diff = mean(on) - mean(off); const se = Math.sqrt(variance(on) / on.length + variance(off) / off.length);
  const verdict = Math.abs(diff) < 2 * se || se === 0 && diff === 0 ? 'within_noise' : diff > 0 ? 'higher_with' : 'lower_with';
  return { metric, unit, on: gOn, off: gOff, diff: r1(diff), verdict };
}
export const VERDICT_TEXT: Record<MetricCompare['verdict'], string> = {
  insufficient: 'Insufficient data (each group needs at least 5 students).',
  within_noise: 'No clear difference: the gap is small enough to be chance.',
  higher_with: 'Higher in the group with the feature (association only).',
  lower_with: 'Lower in the group with the feature (association only).',
};
export interface AbResult { feature: EngagementFeature; pct: number; featureSwitchOn: boolean; nOn: number; nOff: number; sampled: boolean; metrics: MetricCompare[]; note: string }
const NOTE = 'Association, not proof. Students are split by a fixed hash of their id, not by a controlled trial. Do not decide on a single comparison.';
export const AB_SAMPLE_CAP = 1500;

/** Pure: split ids into the two groups for one experiment. */
export function splitGroups(ids: string[], feature: string, pct: number): { on: string[]; off: string[] } {
  const on: string[] = [], off: string[] = []; for (const id of ids) (bucket(id, feature) < pct ? on : off).push(id); return { on, off };
}

export async function loadAbResults(service: SupabaseClient, settings: EngagementSettings, windowDays = 14, now = new Date()): Promise<AbResult[]> {
  const entries = Object.entries(settings.experiments).filter(([, v]) => v.pct > 0 && v.pct < 100);
  if (!entries.length) return [];
  const { data } = await service.from('students').select('id').limit(20000);
  const all = ((data ?? []) as any[]).map((r) => r.id as string);
  const out: AbResult[] = [];
  for (const [feature, v] of entries) {
    const { on, off } = splitGroups(all, feature, v.pct);
    const cap = (a: string[]) => a.slice().sort().slice(0, AB_SAMPLE_CAP);
    const sampled = on.length > AB_SAMPLE_CAP || off.length > AB_SAMPLE_CAP;
    const [sOn, sOff] = await Promise.all([weeklyStats(service, cap(on).map((studentId) => ({ studentId, nickname: '' })), windowDays, now), weeklyStats(service, cap(off).map((studentId) => ({ studentId, nickname: '' })), windowDays, now)]);
    const col = (s: typeof sOn, f: (x: (typeof sOn)[number]) => number | null) => s.map(f).filter((x): x is number => x !== null);
    const metrics = [
      compareAbGroups('Study days', 'days', col(sOn, (x) => x.activeDays), col(sOff, (x) => x.activeDays)),
      compareAbGroups('Rounds finished', 'rounds', col(sOn, (x) => x.challengesDone), col(sOff, (x) => x.challengesDone)),
      compareAbGroups('Accuracy (students with 5+ answers)', '%', col(sOn, (x) => x.accuracy), col(sOff, (x) => x.accuracy)),
      compareAbGroups('Mistakes corrected', 'mistakes', col(sOn, (x) => x.mistakesCorrected), col(sOff, (x) => x.mistakesCorrected)),
      compareAbGroups('Came back on 2+ days', '% of students', col(sOn, (x) => (x.activeDays >= 2 ? 100 : 0)), col(sOff, (x) => (x.activeDays >= 2 ? 100 : 0))),
    ];
    out.push({ feature: feature as EngagementFeature, pct: v.pct, featureSwitchOn: !!settings.features[feature as EngagementFeature], nOn: on.length, nOff: off.length, sampled, metrics, note: NOTE });
  }
  return out;
}
