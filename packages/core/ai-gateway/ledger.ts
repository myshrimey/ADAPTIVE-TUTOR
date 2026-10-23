// Database side of the v59 AI ledger and economics: loaders for the admin pages, the per-evaluation record, reconciliation entries.
// Admin / server use only (service client). Nothing here returns an API key or a prompt/answer text.
import type { SupabaseClient } from '@supabase/supabase-js';
import { startOfTodayIst } from '../ai-provider/usage';
import { loadProviders, keyPresent, type ProviderRow } from './registry';
import { loadGatewayConfig } from './config';
import { loadEconomics } from './economics-settings';
import { avgLatencyMs, usageByProvider } from './router';
import {
  aggregate, groupAggregate, featureEconomics, capStatuses, projectCosts, reconcile, groupRequests, evaluationEconomics, rowEconomic, rowBilled,
  type LedgerRow, type Agg,
} from './economics';
import { compareModels } from './benchmark';

export const LEDGER_COLS = 'id, created_at, request_id, attempt_no, student_id, user_id, organisation_id, feature, task, provider, model, model_version, ok, input_tokens, output_tokens, images, audio_seconds, latency_ms, quota_type, list_cost_inr, cost_est_inr, cost_inr, free_quota_value_inr, promo_credit_inr, actual_cost_inr, economic_cost_inr, ref, error, status_code, fallback_count, fallback_reason, retry_count, quality_result, free_quota_used';
const OLD_COLS = 'id, created_at, student_id, feature, task, provider, model, ok, input_tokens, output_tokens, images, latency_ms, cost_est_inr, cost_inr, ref, error, status_code, free_quota_used';

async function ledgerRows(service: SupabaseClient, sinceIso: string, limit = 60000): Promise<{ rows: LedgerRow[]; migrated: boolean }> {
  const page = (cols: string) => service.from('ai_usage').select(cols).gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(limit);
  let r = await page(LEDGER_COLS), migrated = true;
  if (r.error) { r = await page(OLD_COLS); migrated = false; }
  return { rows: ((r.data ?? []) as any[]).filter((x) => x.provider !== 'gateway' || true) as LedgerRow[], migrated };
}

/** Marks every attempt of one request as quality passed / failed (called by code that really checked the answer, e.g. the handwriting reader). Best effort. */
export async function markRequestQuality(service: SupabaseClient, requestId: string | undefined, result: 'passed' | 'failed'): Promise<void> {
  if (!requestId) return;
  try { await service.from('ai_usage').update({ quality_result: result }).eq('request_id', requestId).eq('ok', true); } catch { /* never blocks */ }
}

function istMonth(now: Date) {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  const y = ist.getUTCFullYear(), mo = ist.getUTCMonth();
  return { start: new Date(Date.UTC(y, mo, 1) - 5.5 * 3600_000).toISOString(), daysElapsed: ist.getUTCDate(), daysInMonth: new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(), period: `${y}-${String(mo + 1).padStart(2, '0')}` };
}

const topBy = <T,>(arr: T[], f: (x: T) => number): T | null => arr.reduce<T | null>((b, x) => (b === null || f(x) > f(b) ? x : b), null);

/** Everything /admin/ai-economics shows. */
export async function loadAiEconomics(service: SupabaseClient, now: Date = new Date(), env: Record<string, string | undefined> = process.env) {
  const m = istMonth(now), todayIso = startOfTodayIst(now);
  const [providers, config, econ, led, studentsCount, recon, evals, bench] = await Promise.all([
    loadProviders(service), loadGatewayConfig(service), loadEconomics(service), ledgerRows(service, m.start),
    service.from('students').select('id', { count: 'exact', head: true }),
    service.from('ai_reconciliations').select('provider_id, period, actual_inr, note').order('period', { ascending: false }).limit(60),
    service.from('ai_evaluation_costs').select('*').order('computed_at', { ascending: false }).limit(60),
    service.from('ai_benchmark_runs').select('*').order('run_at', { ascending: false }).limit(150),
  ]);
  const rows = led.rows, todayRows = rows.filter((r) => r.created_at >= todayIso);
  const today = aggregate(todayRows, 'today'), month = aggregate(rows, 'month');
  const features = featureEconomics(rows);
  const okRows = rows.filter((r) => r.ok);
  const models = groupAggregate(rows, (r) => `${r.provider} · ${r.model ?? 'model not recorded'}${r.model_version ? ` (${r.model_version})` : ''}`);
  const spend = (rs: LedgerRow[]) => rs.reduce((a, r) => a + (econ.cap_basis === 'economic' ? rowEconomic(r) : rowBilled(r)), 0);
  const per = (key: (r: LedgerRow) => string | null | undefined, rs: LedgerRow[]) => { const mm = new Map<string, number>(); for (const r of rs) { const k = key(r); if (!k) continue; mm.set(k, (mm.get(k) ?? 0) + (econ.cap_basis === 'economic' ? rowEconomic(r) : rowBilled(r))); } return Math.max(0, ...mm.values()); };
  const callsPer = (() => { const mm = new Map<string, number>(); for (const r of todayRows) if (r.student_id) mm.set(r.student_id, (mm.get(r.student_id) ?? 0) + 1); return Math.max(0, ...mm.values()); })();
  const caps = capStatuses({ config, econ, spendToday: spend(todayRows), spendMonth: spend(rows), userSpendMonth: per((r) => r.student_id, rows), featureSpendMonth: per((r) => r.task ?? r.feature, rows), refSpend: per((r) => (r.task === 'handwriting' || r.feature === 'handwriting' ? r.ref : null), rows), userCallsToday: callsPer });
  const total = studentsCount.count ?? 0;
  const projection = projectCosts({ economicMtd: month.economicInr, billedMtd: month.billedInr, activeStudents: month.users, daysElapsed: m.daysElapsed, daysInMonth: m.daysInMonth, calls: month.calls });
  const reconciliations = reconcile(rows, (recon.data ?? []) as any[]);
  const byProvider = new Map<string, Agg>(); for (const a of groupAggregate(rows, (r) => r.provider)) byProvider.set(a.key, a);
  const usageToday = usageByProvider(todayRows as any, now);
  const evalRows = (evals.data ?? []) as any[];
  const atRisk = evalRows.filter((e) => e.margin_at_risk);
  const runs = (bench.data ?? []) as any[];
  const latestQuality: Record<string, number | null> = {}; for (const r of runs) if (latestQuality[r.provider_id] === undefined && r.quality_score !== null) latestQuality[r.provider_id] = Number(r.quality_score);
  const mostExpensiveFeature = topBy(features.filter((f) => !f.rulesOnly), (f) => f.economicInr);
  return {
    migrated: led.migrated, truncated: rows.length >= 60000, econ, config, period: m.period, daysElapsed: m.daysElapsed, daysInMonth: m.daysInMonth,
    today, month, totalStudents: total, costPerStudent: total ? month.economicInr / total : null, costPerActiveStudent: month.users ? month.economicInr / month.users : null,
    features, models, caps, projection, reconciliations,
    freeVsPaid: { freeQuotaValueInr: month.freeQuotaValueInr, promoCreditInr: month.promoCreditInr, billedInr: month.billedInr, economicInr: month.economicInr, freeCalls: okRows.filter((r) => r.quota_type === 'free_quota' || (!r.quota_type && r.free_quota_used)).length, paidCalls: okRows.filter((r) => r.quota_type === 'paid' || r.quota_type === 'unknown' || (!r.quota_type && !r.free_quota_used && rowBilled(r) > 0)).length, promoCalls: okRows.filter((r) => r.quota_type === 'promo_credit').length },
    mostUsedModel: topBy(models, (a) => a.calls), mostExpensiveModel: topBy(models, (a) => a.economicInr), mostExpensiveFeature,
    evaluations: { recent: evalRows, atRiskCount: atRisk.length, count: evalRows.length, avgContributionInr: evalRows.filter((e) => e.contribution_inr !== null).length ? evalRows.filter((e) => e.contribution_inr !== null).reduce((a, e) => a + Number(e.contribution_inr), 0) / evalRows.filter((e) => e.contribution_inr !== null).length : null },
    comparison: compareModels(runs), benchmarkRuns: runs.slice(0, 40),
    providers: providers.map((p) => ({ ...p, keySet: keyPresent(p, env) })),
    simulator: providers.map((p) => ({ id: p.id, label: `${p.provider_name} — ${p.model ?? 'no model set'}`, row: pickPrices(p), quality: latestQuality[p.id] ?? null, latencyMs: avgLatencyMs(usageToday[p.id])?.ms ?? byProvider.get(p.id)?.avgLatencyMs ?? null, usage: byProvider.get(p.id) ? { calls: byProvider.get(p.id)!.calls, inputTokens: byProvider.get(p.id)!.inputTokens, outputTokens: byProvider.get(p.id)!.outputTokens, images: byProvider.get(p.id)!.images, economicInr: byProvider.get(p.id)!.economicInr, billedInr: byProvider.get(p.id)!.billedInr, avgLatencyMs: byProvider.get(p.id)!.avgLatencyMs } : { calls: 0, inputTokens: 0, outputTokens: 0, images: 0, economicInr: 0, billedInr: 0, avgLatencyMs: null } })),
  };
}
/** Only the fields the simulator needs (no key name, no endpoint). */
function pickPrices(p: ProviderRow): ProviderRow { return { ...({} as ProviderRow), id: p.id, provider_name: p.provider_name, model: p.model, model_version: p.model_version, input_price_usd_m: p.input_price_usd_m, output_price_usd_m: p.output_price_usd_m, image_price_usd: p.image_price_usd, free_tier_available: p.free_tier_available, classification: p.classification, status: p.status, quota_type: p.quota_type } as ProviderRow; }
export type AiEconomicsData = Awaited<ReturnType<typeof loadAiEconomics>>;

export interface RequestFilter { feature?: string; provider?: string; studentId?: string; status?: 'ok' | 'failed' | 'fallback'; days?: number; limit?: number }
/** Recent requests (attempts grouped by request id) for the request inspector list. */
export async function loadAiRequests(service: SupabaseClient, f: RequestFilter = {}, now: Date = new Date()) {
  const since = new Date(now.getTime() - (f.days ?? 3) * 86400_000).toISOString();
  const page = (cols: string) => { let q = service.from('ai_usage').select(cols).gte('created_at', since).order('created_at', { ascending: false }).limit(3000); if (f.feature) q = q.eq('feature', f.feature); if (f.provider) q = q.eq('provider', f.provider); if (f.studentId) q = q.eq('student_id', f.studentId); return q; };
  let r = await page(LEDGER_COLS), migrated = true; if (r.error) { r = await page(OLD_COLS); migrated = false; }
  let reqs = groupRequests(((r.data ?? []) as any[]) as LedgerRow[]);
  if (f.status === 'ok') reqs = reqs.filter((x) => x.ok); if (f.status === 'failed') reqs = reqs.filter((x) => !x.ok); if (f.status === 'fallback') reqs = reqs.filter((x) => x.fallbackUsed);
  return { migrated, requests: reqs.slice(0, f.limit ?? 200).map(({ attempts, ...x }) => ({ ...x, attemptCount: attempts.length, finalProvider: x.finalAttempt?.provider ?? null, finalModel: x.finalAttempt?.model ?? null })) };
}

/** One request with every attempt, the pricing used at the time, and the admin-only routing explanation. */
export async function loadAiRequest(service: SupabaseClient, requestId: string) {
  if (!/^[0-9a-f-]{8,64}$/i.test(requestId) && !/^single:/.test(requestId)) return null;
  const cols = `${LEDGER_COLS}, pricing_snapshot, route_explanation`;
  let r: any;
  if (requestId.startsWith('single:')) { r = await service.from('ai_usage').select(cols).eq('id', requestId.slice(7)).limit(1); if (r.error) r = await service.from('ai_usage').select(OLD_COLS).eq('id', requestId.slice(7)).limit(1); }
  else { r = await service.from('ai_usage').select(cols).eq('request_id', requestId).limit(50); }
  const rows = ((r?.data ?? []) as LedgerRow[]);
  if (!rows.length) return null;
  const [req] = groupRequests(rows);
  let studentName: string | null = null; // first name only, admin page: helps a founder answer a family; never shown to students
  if (req.studentId) { const { data } = await service.from('students').select('display_name').eq('id', req.studentId).maybeSingle(); studentName = data?.display_name ?? null; }
  return { ...req, studentName };
}

/**
 * Stores the cost, price and contribution of ONE handwritten evaluation (idempotent per exam). Called after the evaluation finishes.
 * Price used is the configured target price (the real price paid depends on the bundle bought); say so on screen.
 */
export async function recordEvaluationEconomics(service: SupabaseClient, examId: string, studentId: string, extra: { humanReviewed?: boolean; humanReviewCostInr?: number | null; infraPerEvalInr?: number | null; questions?: number } = {}): Promise<{ saved: boolean; marginAtRisk?: boolean }> {
  try {
    const econ = await loadEconomics(service);
    const r = await service.from('ai_usage').select(LEDGER_COLS).eq('ref', examId).eq('feature', 'handwriting').limit(500);
    let rows = (r.data ?? []) as LedgerRow[];
    if (r.error) { const o = await service.from('ai_usage').select(OLD_COLS).eq('ref', examId).eq('feature', 'handwriting').limit(500); rows = (o.data ?? []) as LedgerRow[]; }
    if (!rows.length) return { saved: false };
    const ok = rows.filter((x) => x.ok);
    const last = ok[ok.length - 1] ?? rows[rows.length - 1];
    const a = aggregate(rows, examId);
    const images = Math.max(0, ...ok.map((x) => Number(x.images ?? 0)));
    const e = evaluationEconomics({
      images, aiListInr: a.listInr, aiBilledInr: a.billedInr, aiEconomicInr: a.economicInr, sellingPriceInr: econ.handwritten_target_price_inr,
      storagePerImageInr: econ.storage_cost_per_image_inr, processingInr: econ.processing_cost_per_eval_inr ?? extra.infraPerEvalInr ?? null,
      humanReviewInr: extra.humanReviewed === undefined ? null : extra.humanReviewed ? (extra.humanReviewCostInr ?? null) : 0, econ,
    });
    const { data: exam } = await service.from('mock_exams').select('title').eq('id', examId).maybeSingle();
    const row = {
      exam_id: examId, student_id: studentId, exam_label: (exam as any)?.title ?? null, questions: extra.questions ?? 0, images, ai_calls: ok.length, provider: last.provider, model: last.model ?? null,
      input_tokens: a.inputTokens, output_tokens: a.outputTokens, ai_list_cost_inr: a.listInr, ai_billed_cost_inr: a.billedInr, ai_economic_cost_inr: a.economicInr,
      storage_cost_inr: e.storageInr, processing_cost_inr: e.processingInr, human_review_cost_inr: e.humanInr, total_variable_cost_inr: e.totalVariableInr, selling_price_inr: e.sellingPriceInr,
      price_basis: 'target', contribution_inr: e.contributionInr, margin_pct: e.marginPct, margin_at_risk: e.marginAtRisk, incomplete: e.incomplete.join(', ') || null, computed_at: new Date().toISOString(),
    };
    const { error } = await service.from('ai_evaluation_costs').upsert(row, { onConflict: 'exam_id' });
    return error ? { saved: false } : { saved: true, marginAtRisk: e.marginAtRisk };
  } catch { return { saved: false }; } // never blocks the evaluation
}

/** The few AI numbers the Founder Command Centre shows. Cheap: one month of ledger rows. */
export async function loadCommandCentreAi(service: SupabaseClient, now: Date = new Date()) {
  const d = await loadAiEconomics(service, now);
  return {
    migrated: d.migrated, monthEconomicInr: d.month.economicInr, monthBilledInr: d.month.billedInr, perStudentInr: d.costPerStudent, perActiveStudentInr: d.costPerActiveStudent,
    freeQuotaValueInr: d.freeVsPaid.freeQuotaValueInr, freeCalls: d.freeVsPaid.freeCalls, paidCalls: d.freeVsPaid.paidCalls, paidBilledInr: d.month.billedInr,
    mostUsedModel: d.mostUsedModel?.key ?? null, mostExpensiveModel: d.mostExpensiveModel?.key ?? null, mostExpensiveFeature: d.mostExpensiveFeature?.label ?? null,
    handwrittenAvgCostInr: (() => { const h = d.features.find((f) => f.label === 'Handwritten Evaluation'); return h && h.calls ? h.economicInr / h.calls : null; })(),
    evaluationsTracked: d.evaluations.count, marginAtRisk: d.evaluations.atRiskCount, avgContributionInr: d.evaluations.avgContributionInr,
    projectedMonthAtCurrentUse: d.projection.ok ? d.projection.perActiveStudentMonthEconomic! * d.month.users : null, projection: d.projection,
    worstCap: d.caps.filter((c) => c.level !== 'ok').sort((a, b) => b.pct - a.pct)[0] ?? null, activeStudents: d.month.users,
  };
}
