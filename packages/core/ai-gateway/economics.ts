// Pure AI economics maths (no database): roll-ups of the request ledger, cost protection levels, projections,
// handwritten-evaluation contribution and the model switch simulator. Everything here is arithmetic on recorded
// rows and founder-entered assumptions; nothing is estimated from outside facts.
import type { AiEconomics } from './economics-settings';
import type { GatewayConfig } from './config';
import { computeCost } from './cost';
import type { ProviderRow } from './registry';
import { TASKS } from './tasks';

export interface LedgerRow {
  id?: string; created_at: string; request_id?: string | null; attempt_no?: number | null; student_id?: string | null; user_id?: string | null; organisation_id?: string | null;
  feature?: string | null; task?: string | null; provider: string; model?: string | null; model_version?: string | null; ok: boolean;
  input_tokens?: number | null; output_tokens?: number | null; images?: number | null; audio_seconds?: number | null; latency_ms?: number | null;
  quota_type?: string | null; list_cost_inr?: number | null; cost_est_inr?: number | null; cost_inr?: number | null; free_quota_value_inr?: number | null; promo_credit_inr?: number | null;
  actual_cost_inr?: number | null; economic_cost_inr?: number | null; ref?: string | null; error?: string | null; status_code?: number | null;
  free_quota_used?: boolean | null; fallback_count?: number | null; fallback_reason?: string | null; retry_count?: number | null; quality_result?: string | null;
  pricing_snapshot?: Record<string, unknown> | null; route_explanation?: Record<string, unknown> | null;
}
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
/** Rows written before v59 have no economic/list column: the older estimate is the best record, and is labelled so on screen. */
export const rowList = (r: LedgerRow) => n(r.list_cost_inr ?? r.cost_est_inr);
export const rowEconomic = (r: LedgerRow) => n(r.economic_cost_inr ?? r.list_cost_inr ?? r.cost_est_inr);
export const rowBilled = (r: LedgerRow) => n(r.cost_inr);

export interface Agg {
  key: string; calls: number; failures: number; users: number; inputTokens: number; outputTokens: number; images: number;
  listInr: number; billedInr: number; economicInr: number; freeQuotaValueInr: number; promoCreditInr: number;
  actualInr: number | null; costPerUserInr: number | null; unpriced: number; avgLatencyMs: number | null; fallbacks: number;
}
export function aggregate(rows: LedgerRow[], key = 'all'): Agg {
  const users = new Set<string>(); let actual: number | null = null, latSum = 0, latN = 0;
  const a: Agg = { key, calls: 0, failures: 0, users: 0, inputTokens: 0, outputTokens: 0, images: 0, listInr: 0, billedInr: 0, economicInr: 0, freeQuotaValueInr: 0, promoCreditInr: 0, actualInr: null, costPerUserInr: null, unpriced: 0, avgLatencyMs: null, fallbacks: 0 };
  for (const r of rows) {
    if (r.ok) a.calls += 1; else a.failures += 1;
    if (r.student_id) users.add(r.student_id);
    a.inputTokens += n(r.input_tokens); a.outputTokens += n(r.output_tokens); a.images += n(r.images);
    a.listInr += rowList(r); a.billedInr += rowBilled(r); a.economicInr += rowEconomic(r);
    a.freeQuotaValueInr += n(r.free_quota_value_inr ?? (r.quota_type === 'free_quota' ? rowList(r) : 0)); a.promoCreditInr += n(r.promo_credit_inr);
    if (r.actual_cost_inr !== null && r.actual_cost_inr !== undefined) actual = (actual ?? 0) + n(r.actual_cost_inr);
    if (r.ok && (r.pricing_snapshot as any)?.rates_known === false) a.unpriced += 1;
    if (r.ok && r.latency_ms) { latSum += n(r.latency_ms); latN += 1; }
    if (n(r.fallback_count) > 0 && r.ok) a.fallbacks += 1;
  }
  a.users = users.size; a.actualInr = actual; a.costPerUserInr = users.size ? a.economicInr / users.size : null; a.avgLatencyMs = latN ? Math.round(latSum / latN) : null;
  return a;
}
export function groupAggregate(rows: LedgerRow[], keyOf: (r: LedgerRow) => string): Agg[] {
  const m = new Map<string, LedgerRow[]>();
  for (const r of rows) { const k = keyOf(r); (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
  return [...m.entries()].map(([k, v]) => aggregate(v, k)).sort((a, b) => b.economicInr - a.economicInr);
}

/** What the founder calls each feature, and which gateway task(s) carry its AI calls. Features with no task make NO AI call (rule-based); this is stated, not hidden. */
export const FEATURE_CATALOG: Array<{ label: string; tasks: string[]; note?: string }> = [
  { label: 'AI Tutor', tasks: ['tutor'] },
  { label: 'Quiz', tasks: [], note: 'Typed quizzes are marked by rules: no AI call.' },
  { label: 'Question Generation', tasks: ['question_generation'] },
  { label: 'Explanation', tasks: ['explanation', 'summary'] },
  { label: 'Misconception Check', tasks: ['misconception'] },
  { label: 'Translation', tasks: ['translation'] },
  { label: 'Image Questions', tasks: [], note: 'Question figures are stored images: no AI call.' },
  { label: 'Written answer marking', tasks: ['evaluation'] },
  { label: 'Handwritten Evaluation', tasks: ['handwriting'] },
  { label: 'Mock Exam Evaluation', tasks: [], note: 'Typed part is rule-marked; the handwritten part is counted under Handwritten Evaluation.' },
  { label: 'Parent Report', tasks: [], note: 'Reports are written by rules from recorded evidence: no AI call.' },
  { label: 'Tutor Report', tasks: [], note: 'Reports are written by rules from recorded evidence: no AI call.' },
  { label: 'Admin tests and other', tasks: ['benchmark', 'provider_test', 'other'] },
];
export interface FeatureLine extends Agg { label: string; note?: string; rulesOnly: boolean }
export function featureEconomics(rows: LedgerRow[]): FeatureLine[] {
  return FEATURE_CATALOG.map((f) => {
    const mine = rows.filter((r) => f.tasks.includes(r.task ?? r.feature ?? 'other') || (f.tasks.includes('other') && !(r.task ?? r.feature) ));
    return { ...aggregate(mine, f.label), label: f.label, note: f.note, rulesOnly: f.tasks.length === 0 };
  });
}
export const taskLabel = (t: string) => TASKS[t]?.label ?? t;

export type CapLevel = 'ok' | 'warning' | 'critical' | 'blocked';
export interface CapStatus { key: string; label: string; used: number; limit: number; pct: number; level: CapLevel; unit: 'inr' | 'calls' }
export interface CapInput { config: GatewayConfig; econ: Pick<AiEconomics, 'spend_warn_pct' | 'spend_critical_pct' | 'cap_basis'>; spendToday: number; spendMonth: number; userSpendMonth?: number; featureSpendMonth?: number; refSpend?: number; userCallsToday?: number }
/** 80% warning, 90% critical, 100% blocked: for every spend/call control the founder has set. Controls left empty are not listed. */
export function capStatuses(i: CapInput): CapStatus[] {
  const out: CapStatus[] = []; const c = i.config;
  const add = (key: string, label: string, used: number | undefined, limit: number | null, unit: 'inr' | 'calls') => {
    if (!limit || used === undefined) return;
    const pct = (used / limit) * 100;
    out.push({ key, label, used, limit, pct: Math.round(pct * 10) / 10, unit, level: pct >= 100 ? 'blocked' : pct >= i.econ.spend_critical_pct ? 'critical' : pct >= i.econ.spend_warn_pct ? 'warning' : 'ok' });
  };
  add('daily_spend', 'Daily AI spend', i.spendToday, c.max_daily_spend_inr, 'inr');
  add('monthly_spend', 'Monthly AI spend', i.spendMonth, c.max_monthly_spend_inr, 'inr');
  add('user_spend', 'Spend for one student this month', i.userSpendMonth, c.max_cost_per_user_inr, 'inr');
  add('feature_spend', 'Spend for one feature this month', i.featureSpendMonth, c.max_cost_per_feature_inr, 'inr');
  add('evaluation_spend', 'Spend for one handwritten evaluation', i.refSpend, c.max_handwritten_eval_inr, 'inr');
  add('calls_per_user_day', 'AI calls for one student today', i.userCallsToday, c.max_calls_per_user_day, 'calls');
  return out;
}
export const worstCap = (l: CapStatus[]): CapStatus | null => l.filter((x) => x.level !== 'ok').sort((a, b) => b.pct - a.pct)[0] ?? null;

export const PROJECTION_SIZES = [100, 500, 1000, 5000, 10000, 100000] as const;
export interface Projection { size: number; economicInr: number; billedInr: number }
export interface ProjectionResult { ok: boolean; reason?: string; perActiveStudentMonthEconomic: number | null; perActiveStudentMonthBilled: number | null; rows: Projection[]; basis: string }
/** Straight-line scaling of THIS month's recorded cost per active student. It assumes new students use AI like today's active ones; it is a planning figure, not a forecast. */
export function projectCosts(i: { economicMtd: number; billedMtd: number; activeStudents: number; daysElapsed: number; daysInMonth: number; calls: number }): ProjectionResult {
  const basis = 'ASSUMPTION: every student uses AI like this month\'s active students; month-to-date cost scaled to a full month.';
  if (i.activeStudents < 5 || i.calls === 0 || i.daysElapsed <= 0) return { ok: false, reason: 'Insufficient data (fewer than 5 students used AI this month).', perActiveStudentMonthEconomic: null, perActiveStudentMonthBilled: null, rows: [], basis };
  const scale = i.daysInMonth / i.daysElapsed;
  const e = (i.economicMtd / i.activeStudents) * scale, b = (i.billedMtd / i.activeStudents) * scale;
  return { ok: true, perActiveStudentMonthEconomic: e, perActiveStudentMonthBilled: b, rows: PROJECTION_SIZES.map((s) => ({ size: s, economicInr: e * s, billedInr: b * s })), basis };
}

export interface ContributionInput {
  images: number; aiListInr: number; aiBilledInr: number; aiEconomicInr: number; sellingPriceInr: number | null;
  storagePerImageInr: number | null; processingInr: number | null; humanReviewInr: number | null; econ: Pick<AiEconomics, 'handwritten_min_margin_pct' | 'handwritten_min_contribution_inr'>;
}
export interface ContributionResult {
  storageInr: number | null; processingInr: number | null; humanInr: number | null; totalVariableInr: number; sellingPriceInr: number | null; contributionInr: number | null; marginPct: number | null;
  thresholdInr: number | null; marginAtRisk: boolean; status: 'MARGIN_AT_RISK' | 'OK' | 'OK_PARTIAL' | 'NO_PRICE'; incomplete: string[];
}
/** CONTRIBUTION = SELLING PRICE - TOTAL VARIABLE COST. Costs the founder has not entered are listed as missing (the total is then a lower bound). */
export function evaluationEconomics(i: ContributionInput): ContributionResult {
  const incomplete: string[] = [];
  const storage = i.storagePerImageInr === null ? null : i.storagePerImageInr * i.images; if (storage === null) incomplete.push('storage cost per image');
  if (i.processingInr === null) incomplete.push('processing cost per evaluation');
  if (i.humanReviewInr === null) incomplete.push('human review cost');
  const total = i.aiEconomicInr + (storage ?? 0) + (i.processingInr ?? 0) + (i.humanReviewInr ?? 0);
  const price = i.sellingPriceInr;
  if (price === null || price <= 0) return { storageInr: storage, processingInr: i.processingInr, humanInr: i.humanReviewInr, totalVariableInr: total, sellingPriceInr: price, contributionInr: null, marginPct: null, thresholdInr: null, marginAtRisk: false, status: 'NO_PRICE', incomplete };
  const contribution = price - total, margin = (contribution / price) * 100;
  const threshold = i.econ.handwritten_min_contribution_inr ?? (price * i.econ.handwritten_min_margin_pct) / 100;
  const risk = contribution < threshold;
  return { storageInr: storage, processingInr: i.processingInr, humanInr: i.humanReviewInr, totalVariableInr: total, sellingPriceInr: price, contributionInr: contribution, marginPct: margin, thresholdInr: threshold, marginAtRisk: risk, status: risk ? 'MARGIN_AT_RISK' : incomplete.length ? 'OK_PARTIAL' : 'OK', incomplete };
}

export interface SwitchInput {
  current: ProviderRow; alternative: ProviderRow; fx: number;
  usage: { calls: number; inputTokens: number; outputTokens: number; images: number; economicInr: number; billedInr: number; avgLatencyMs: number | null };
  currentQuality?: number | null; altQuality?: number | null; altLatencyMs?: number | null; daysElapsed: number; daysInMonth: number;
}
export interface SwitchResult {
  currentMonthToDate: { calls: number; economicInr: number; billedInr: number }; currentFullMonthInr: number;
  alternativeMonthToDateInr: number | null; alternativeFullMonthInr: number | null; savingsMonthInr: number | null; savingsPct: number | null;
  qualityDiff: number | null; latencyDiffMs: number | null; notes: string[];
}
/** Re-prices this month's recorded tokens/images at the alternative's registry rates. Quality and latency come only from benchmark and measured calls; missing values are shown as unknown. */
export function simulateSwitch(i: SwitchInput): SwitchResult {
  const notes: string[] = []; const scale = i.daysElapsed > 0 ? i.daysInMonth / i.daysElapsed : 1;
  const a = i.alternative;
  const known = a.input_price_usd_m !== null && a.output_price_usd_m !== null;
  if (!known) notes.push('The alternative has no recorded price, so its cost cannot be projected.');
  const alt = known ? computeCost(a, i.usage.inputTokens, i.usage.outputTokens, i.usage.images, undefined, { fx: i.fx }).listInr : null;
  if (i.usage.calls === 0) notes.push('No calls recorded this month for the current model.');
  const savings = alt === null ? null : i.usage.economicInr * scale - alt * scale;
  if (a.free_tier_available === true) notes.push('The alternative may have a free quota today; this uses its LIST price because free quotas can end. Verify its current terms.');
  if (!a.model) notes.push('The alternative has no model name set.');
  return {
    currentMonthToDate: { calls: i.usage.calls, economicInr: i.usage.economicInr, billedInr: i.usage.billedInr }, currentFullMonthInr: i.usage.economicInr * scale,
    alternativeMonthToDateInr: alt, alternativeFullMonthInr: alt === null ? null : alt * scale, savingsMonthInr: savings,
    savingsPct: savings !== null && i.usage.economicInr > 0 ? (savings / (i.usage.economicInr * scale)) * 100 : null,
    qualityDiff: i.currentQuality != null && i.altQuality != null ? i.altQuality - i.currentQuality : null,
    latencyDiffMs: i.usage.avgLatencyMs != null && i.altLatencyMs != null ? i.altLatencyMs - i.usage.avgLatencyMs : null,
    notes: [...notes, ...(i.currentQuality == null || i.altQuality == null ? ['Quality difference unknown: run the benchmark for both models.'] : []), ...(i.altLatencyMs == null ? ['The alternative has no measured latency yet.'] : [])],
  };
}

export interface Reconciliation { provider: string; period: string; billedByAppInr: number; actualInr: number | null; diffInr: number | null; diffPct: number | null }
/** Compares what the app expected to be billed with the invoice amount the founder entered. No invoice = unknown, never zero. */
export function reconcile(rows: LedgerRow[], entered: Array<{ provider_id: string; period: string; actual_inr: number }>): Reconciliation[] {
  const by = new Map<string, number>();
  for (const r of rows) { const k = `${r.provider}|${r.created_at.slice(0, 7)}`; by.set(k, (by.get(k) ?? 0) + rowBilled(r)); }
  for (const e of entered) { const k = `${e.provider_id}|${e.period}`; if (!by.has(k)) by.set(k, 0); }
  return [...by.entries()].map(([k, billed]) => {
    const [provider, period] = k.split('|'); const e = entered.find((x) => x.provider_id === provider && x.period === period);
    const actual = e ? n(e.actual_inr) : null;
    return { provider, period, billedByAppInr: billed, actualInr: actual, diffInr: actual === null ? null : actual - billed, diffPct: actual !== null && billed > 0 ? ((actual - billed) / billed) * 100 : null };
  }).sort((a, b) => b.period.localeCompare(a.period));
}

export interface RequestSummary {
  requestId: string; startedAt: string; feature: string; task: string; studentId: string | null; userId: string | null; organisationId: string | null;
  attempts: LedgerRow[]; finalAttempt: LedgerRow | null; ok: boolean; fallbackUsed: boolean; economicInr: number; billedInr: number; inputTokens: number; outputTokens: number; images: number;
}
/** Groups attempts into requests. Rows from before v59 have no request id: each is its own request. */
export function groupRequests(rows: LedgerRow[]): RequestSummary[] {
  const m = new Map<string, LedgerRow[]>();
  for (const r of rows) { const k = r.request_id ?? `single:${r.id ?? r.created_at}`; (m.get(k) ?? m.set(k, []).get(k)!).push(r); }
  return [...m.entries()].map(([k, v]) => {
    const att = v.sort((a, b) => n(a.attempt_no ?? 1) - n(b.attempt_no ?? 1) || a.created_at.localeCompare(b.created_at));
    const fin = [...att].reverse().find((x) => x.ok) ?? null; const first = att[0];
    return {
      requestId: k, startedAt: first.created_at, feature: first.feature ?? 'other', task: first.task ?? first.feature ?? 'other', studentId: first.student_id ?? null, userId: first.user_id ?? null, organisationId: first.organisation_id ?? null,
      attempts: att, finalAttempt: fin, ok: !!fin, fallbackUsed: att.length > 1 && !!fin, economicInr: att.reduce((s, x) => s + rowEconomic(x), 0), billedInr: att.reduce((s, x) => s + rowBilled(x), 0),
      inputTokens: att.reduce((s, x) => s + n(x.input_tokens), 0), outputTokens: att.reduce((s, x) => s + n(x.output_tokens), 0), images: att.reduce((s, x) => s + n(x.images), 0),
    };
  }).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
