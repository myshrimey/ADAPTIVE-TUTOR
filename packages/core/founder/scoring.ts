// Founder scoring helpers. All pure. None of these is an objective truth: scores are the founder's own ratings and assumptions.

/** Internal Sahayak Fit Score, 0-100, from the founder's 0-5 ratings and weights. Unrated criteria are ignored; null if nothing is rated. */
export function fitScore(fit: Record<string, number> | null | undefined, weights: Record<string, number>): { score: number | null; rated: number; of: number } {
  const keys = Object.keys(weights).filter((k) => weights[k] > 0);
  let num = 0, den = 0, rated = 0;
  for (const k of keys) {
    const v = fit?.[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const c = Math.min(5, Math.max(0, v));
    num += c * weights[k]; den += 5 * weights[k]; rated++;
  }
  return { score: den > 0 ? Math.round((num / den) * 100) : null, rated, of: keys.length };
}

export interface PipelineRow { stage: string; status?: string | null; amount: number | null }
/** Potential = sum of amounts; weighted = amount x assumed probability of that stage. Lost/passed rows count for neither. */
export function weightedPipeline(rows: PipelineRow[], probs: Record<string, number>, closedStages: string[] = ['passed']): { potential: number; weighted: number; counted: number } {
  let potential = 0, weighted = 0, counted = 0;
  for (const r of rows) {
    if (!r.amount || r.amount <= 0) continue;
    if (closedStages.includes(r.stage) || r.status === 'lost') continue;
    const p = Math.min(100, Math.max(0, Number(probs[r.stage] ?? 0)));
    potential += r.amount; weighted += (r.amount * p) / 100; counted++;
  }
  return { potential, weighted: Math.round(weighted), counted };
}

export type Rag = 'green' | 'amber' | 'red' | 'grey';
/** Green/amber/red from thresholds. grey = no data. lowerIsBetter flips the direction (e.g. human review rate). */
export function ragStatus(value: number | null, t: { green: number; amber: number } | undefined, lowerIsBetter = false): Rag {
  if (value === null || !t || !Number.isFinite(value)) return 'grey';
  if (lowerIsBetter) return value <= t.green ? 'green' : value <= t.amber ? 'amber' : 'red';
  return value >= t.green ? 'green' : value >= t.amber ? 'amber' : 'red';
}
export const pct = (a: number, b: number): number | null => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

export type DataLabel = 'ACTUAL' | 'ESTIMATED' | 'ASSUMED' | 'INSUFFICIENT';
