// Founder Financial Simulator (v61). Pure maths, no database, no AI. EVERYTHING it produces is a PLANNING SCENARIO built from the
// numbers the founder types in. It is never a forecast or a promise. Money is in rupees per month unless stated.
export const SCENARIO_LABEL = 'PLANNING SCENARIO';
export const SCENARIO_NOTE = 'Planning scenario from the numbers you entered. It is not a forecast and not a guarantee.';
export const TARGET_PRESETS = [100000, 200000, 300000, 500000, 1000000];
export const MARGIN_PRESETS = [10, 20, 30, 50, 60, 70, 80];
export const STUDENT_ARPU_PRESETS = [500, 750, 1000, 1500, 2000, 2500, 3000];
export const HANDWRITTEN_VOLUMES = [100, 250, 500, 1000, 2000, 5000];

export interface SimInputs {
  arpuStudent: number; arpuTutor: number; arpuCentre: number; arpuSchool: number;
  aiCostStudent: number; aiCostTutor: number; aiCostCentre: number; aiCostSchool: number;
  paymentFeePct: number;            // % of revenue taken by payment processing
  monthlyOperating: number; monthlyMarketing: number; otherFixed: number;
  taxReservePct: number;            // % of positive profit set aside
  handwrittenPrice: number;
  handwrittenImages: number; visionCostPerImage: number; reasoningCostPerEval: number; storageCostPerEval: number; humanCostPerEval: number; otherCostPerEval: number;
  targetNetProfit: number;          // per month
}
export const DEFAULT_SIM: SimInputs = {
  arpuStudent: 1000, arpuTutor: 3000, arpuCentre: 10000, arpuSchool: 0,
  aiCostStudent: 0, aiCostTutor: 0, aiCostCentre: 0, aiCostSchool: 0,
  paymentFeePct: 2, monthlyOperating: 0, monthlyMarketing: 0, otherFixed: 0, taxReservePct: 0,
  handwrittenPrice: 499, handwrittenImages: 8, visionCostPerImage: 0, reasoningCostPerEval: 0, storageCostPerEval: 0, humanCostPerEval: 0, otherCostPerEval: 0,
  targetNetProfit: 1000000,
};
const FIELD_LIMITS: Record<keyof SimInputs, [number, number]> = {
  arpuStudent: [0, 1e6], arpuTutor: [0, 1e7], arpuCentre: [0, 1e8], arpuSchool: [0, 1e8],
  aiCostStudent: [0, 1e6], aiCostTutor: [0, 1e6], aiCostCentre: [0, 1e7], aiCostSchool: [0, 1e7],
  paymentFeePct: [0, 50], monthlyOperating: [0, 1e9], monthlyMarketing: [0, 1e9], otherFixed: [0, 1e9], taxReservePct: [0, 60],
  handwrittenPrice: [0, 1e6], handwrittenImages: [0, 100], visionCostPerImage: [0, 1e4], reasoningCostPerEval: [0, 1e5], storageCostPerEval: [0, 1e4], humanCostPerEval: [0, 1e5], otherCostPerEval: [0, 1e5],
  targetNetProfit: [0, 1e10],
};
/** Clamp and fill: anything missing or not a number falls back to the default; nothing can be negative. */
export function cleanSim(raw: unknown): SimInputs {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_SIM } as SimInputs;
  for (const k of Object.keys(FIELD_LIMITS) as (keyof SimInputs)[]) {
    const n = Number(r[k]); const [lo, hi] = FIELD_LIMITS[k];
    if (r[k] !== undefined && r[k] !== '' && Number.isFinite(n)) out[k] = Math.min(hi, Math.max(lo, n));
  }
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
export const SEGMENTS = ['student', 'tutor', 'centre', 'school'] as const;
export type Segment = (typeof SEGMENTS)[number];
export const arpuOf = (s: SimInputs, seg: Segment) => ({ student: s.arpuStudent, tutor: s.arpuTutor, centre: s.arpuCentre, school: s.arpuSchool })[seg];
export const aiCostOf = (s: SimInputs, seg: Segment) => ({ student: s.aiCostStudent, tutor: s.aiCostTutor, centre: s.aiCostCentre, school: s.aiCostSchool })[seg];
/** What one customer of this kind leaves after AI cost and payment fees, per month. */
export const unitContribution = (s: SimInputs, seg: Segment) => arpuOf(s, seg) * (1 - s.paymentFeePct / 100) - aiCostOf(s, seg);

/** Revenue needed to make `target` net profit at a given net margin (the founder's own method: target / margin). */
export function requiredRevenue(target: number, marginPct: number): number | null {
  if (!(marginPct > 0) || !(target >= 0)) return null;
  return r2(target / (marginPct / 100));
}
/** Customers needed to produce that revenue (rounded up). Null when the average revenue is zero. */
export function customersNeeded(revenue: number | null, arpu: number): number | null {
  if (revenue === null || !(arpu > 0)) return null;
  return Math.ceil(revenue / arpu - 1e-9);
}
export interface GridRow { target: number; margin: number; revenue: number | null; customers: number | null }
/** Rows for every target x margin: the revenue and the number of customers (students / tutors / centres) at a given average revenue. */
export function presetGrid(arpu: number, targets = TARGET_PRESETS, margins = MARGIN_PRESETS): GridRow[] {
  const out: GridRow[] = [];
  for (const target of targets) for (const margin of margins) { const revenue = requiredRevenue(target, margin); out.push({ target, margin, revenue, customers: customersNeeded(revenue, arpu) }); }
  return out;
}

export interface Counts { students: number; tutors: number; centres: number; schools: number; handwrittenMocks: number; otherRevenue: number }
export const ZERO_COUNTS: Counts = { students: 0, tutors: 0, centres: 0, schools: 0, handwrittenMocks: 0, otherRevenue: 0 };
export interface Combination { revenue: number; subscriptionRevenue: number; handwrittenRevenue: number; variableCost: number; aiCost: number; paymentCost: number; handwrittenCost: number; fixedCost: number; preTaxProfit: number; tax: number; netProfit: number; netMarginPct: number | null }
export function handwrittenCostPerEval(s: SimInputs): number {
  return r2(s.handwrittenImages * s.visionCostPerImage + s.reasoningCostPerEval + s.storageCostPerEval + s.humanCostPerEval + s.otherCostPerEval);
}
export function combination(s: SimInputs, c: Counts): Combination {
  const subscriptionRevenue = c.students * s.arpuStudent + c.tutors * s.arpuTutor + c.centres * s.arpuCentre + c.schools * s.arpuSchool;
  const handwrittenRevenue = c.handwrittenMocks * s.handwrittenPrice;
  const revenue = subscriptionRevenue + handwrittenRevenue + c.otherRevenue;
  const aiCost = c.students * s.aiCostStudent + c.tutors * s.aiCostTutor + c.centres * s.aiCostCentre + c.schools * s.aiCostSchool;
  const paymentCost = revenue * (s.paymentFeePct / 100);
  const handwrittenCost = c.handwrittenMocks * handwrittenCostPerEval(s);
  const variableCost = aiCost + paymentCost + handwrittenCost;
  const fixedCost = s.monthlyOperating + s.monthlyMarketing + s.otherFixed;
  const preTaxProfit = revenue - variableCost - fixedCost;
  const tax = preTaxProfit > 0 ? preTaxProfit * (s.taxReservePct / 100) : 0;
  const netProfit = preTaxProfit - tax;
  return { revenue: r2(revenue), subscriptionRevenue: r2(subscriptionRevenue), handwrittenRevenue: r2(handwrittenRevenue), variableCost: r2(variableCost), aiCost: r2(aiCost), paymentCost: r2(paymentCost), handwrittenCost: r2(handwrittenCost), fixedCost: r2(fixedCost), preTaxProfit: r2(preTaxProfit), tax: r2(tax), netProfit: r2(netProfit), netMarginPct: revenue > 0 ? r2((netProfit / revenue) * 100) : null };
}

/** Customers of one kind needed to cover the fixed monthly cost (no profit, no tax). Null when a customer of that kind does not cover its own variable cost. */
export function breakEvenCustomers(s: SimInputs, seg: Segment): number | null {
  const u = unitContribution(s, seg); const fixed = s.monthlyOperating + s.monthlyMarketing + s.otherFixed;
  if (!(u > 0)) return null; if (fixed <= 0) return 0;
  return Math.ceil(fixed / u - 1e-9);
}

export interface GapSuggestion { label: string; add: Partial<Counts>; resultingNetProfit: number }
export interface Gap { current: number; target: number; shortfall: number; reached: boolean; suggestions: GapSuggestion[]; note: string | null }
/** "What do I need to add to reach the target?" Single-kind options, plus an even mix of students, tutors and centres. */
export function gapToTarget(s: SimInputs, c: Counts, target = s.targetNetProfit): Gap {
  const cur = combination(s, c);
  if (cur.netProfit >= target) return { current: cur.netProfit, target, shortfall: 0, reached: true, suggestions: [], note: null };
  const keep = 1 - s.taxReservePct / 100;
  const needPre = (target / (keep > 0 ? keep : 1)) - cur.preTaxProfit; // pre-tax profit still to find
  const suggestions: GapSuggestion[] = [];
  const kinds: [string, keyof Counts, Segment][] = [['more paying students', 'students', 'student'], ['more tutors', 'tutors', 'tutor'], ['more coaching centres', 'centres', 'centre'], ['more schools', 'schools', 'school']];
  for (const [label, key, seg] of kinds) {
    const u = unitContribution(s, seg); if (!(u > 0)) continue;
    const n = Math.ceil(needPre / u - 1e-9);
    suggestions.push({ label, add: { [key]: n }, resultingNetProfit: combination(s, { ...c, [key]: (c[key] as number) + n }).netProfit });
  }
  const uS = unitContribution(s, 'student'), uT = unitContribution(s, 'tutor'), uC = unitContribution(s, 'centre');
  if (uS > 0 && uT > 0 && uC > 0) {
    // an even split of the missing profit across the three kinds
    const share = needPre / 3; const add = { students: Math.ceil(share / uS - 1e-9), tutors: Math.ceil(share / uT - 1e-9), centres: Math.ceil(share / uC - 1e-9) };
    suggestions.push({ label: 'an even mix of students, tutors and centres', add, resultingNetProfit: combination(s, { ...c, students: c.students + add.students, tutors: c.tutors + add.tutors, centres: c.centres + add.centres }).netProfit });
  }
  const note = suggestions.length ? null : 'No customer kind has a positive contribution with the current averages and costs, so adding customers does not close the gap. Check the revenue and cost numbers.';
  return { current: cur.netProfit, target, shortfall: r2(target - cur.netProfit), reached: false, suggestions, note };
}

export interface HandwrittenScenario { volume: number; revenue: number; cost: number; contribution: number }
export interface HandwrittenCalc { price: number; costPerEval: number; contributionPerEval: number; marginPct: number | null; positive: boolean; scenarios: HandwrittenScenario[]; incomplete: boolean }
export function handwrittenCalculator(s: SimInputs, volumes = HANDWRITTEN_VOLUMES): HandwrittenCalc {
  const cost = handwrittenCostPerEval(s); const price = s.handwrittenPrice;
  const feeEach = price * (s.paymentFeePct / 100);
  const contribution = price - cost - feeEach;
  return {
    price, costPerEval: cost, contributionPerEval: r2(contribution), marginPct: price > 0 ? r2((contribution / price) * 100) : null, positive: contribution > 0,
    scenarios: volumes.map((v) => ({ volume: v, revenue: r2(v * price), cost: r2(v * (cost + feeEach)), contribution: r2(v * contribution) })),
    // when no cost has been entered the result would only look good because nothing is counted
    incomplete: cost === 0,
  };
}

export const inr = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? 'Insufficient data' : (n < 0 ? '-' : '') + '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN'));
export const lakh = (n: number | null): string => (n === null ? 'Insufficient data' : n >= 10000000 ? `₹${r2(n / 10000000)} crore` : `₹${r2(n / 100000)} lakh`);

import type { SupabaseClient } from '@supabase/supabase-js';
export async function loadSim(service: SupabaseClient): Promise<SimInputs> {
  try { const { data } = await service.from('commerce_settings').select('value').eq('key', 'financial_simulator').maybeSingle(); return cleanSim(data?.value); } catch { return DEFAULT_SIM; }
}
export async function saveSim(service: SupabaseClient, raw: unknown): Promise<SimInputs> {
  const s = cleanSim(raw);
  const { error } = await service.from('commerce_settings').upsert({ key: 'financial_simulator', value: s, note: 'v61 founder financial simulator inputs', updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error('Could not save.');
  return s;
}
