import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { loadProviders, isFreeRoute, type ProviderRow } from './registry';
import { loadGatewayConfig } from './config';
import { buildAdapter } from './adapters';
import { computeCost } from './cost';

export const MANUAL_DIMENSIONS = ['factual', 'reasoning', 'cbse_alignment', 'explanation', 'marking_scheme', 'multilingual', 'hallucination', 'safety', 'vision_ocr', 'hindi'] as const;
export const MANUAL_LABELS: Record<string, string> = { factual: 'Factual accuracy', reasoning: 'Reasoning', cbse_alignment: 'CBSE alignment', explanation: 'Explanation quality', marking_scheme: 'Marking-scheme quality', multilingual: 'Multilingual quality', hallucination: 'No hallucination', safety: 'Safety', vision_ocr: 'Vision / handwriting reading', hindi: 'Hindi quality' };

const norm = (s: string) => s.toLowerCase().replace(/[\s.,;:!?'"()\[\]{}*_`]+/g, '').replace(/[₹$]/g, '');
/** Pulls the answer after "FINAL:" (or the last line). */
export function extractFinal(text: string): string {
  const m = /FINAL\s*[:：]\s*(.+)/i.exec(text ?? ''); if (m) return m[1].trim();
  const lines = (text ?? '').trim().split(/\n/).filter(Boolean); return (lines[lines.length - 1] ?? '').trim();
}
/** Auto-marks one answer against the expected text. Numbers match within 0.5%; words match ignoring case, spacing and punctuation. */
export function autoGrade(kind: string, expected: string | null, output: string): boolean | null {
  if (!expected || !['mcq', 'numeric', 'short'].includes(kind)) return null;
  const got = extractFinal(output);
  const num = (s: string) => { const m = /-?\d+(?:[.,]\d+)?/.exec(s.replace(/,/g, '')); return m ? Number(m[0]) : NaN; };
  const e = Number(expected.replace(/,/g, ''));
  if (kind === 'numeric' && Number.isFinite(e)) { const g = num(got); return Number.isFinite(g) && Math.abs(g - e) <= Math.abs(e) * 0.005 + 1e-9; }
  const ne = norm(expected), ng = norm(got);
  return ng === ne || (ne.length >= 3 && ng.includes(ne));
}

/** 0-100. Auto accuracy and the founder's manual 0-5 ratings, equally weighted when both exist. Never invented: null when neither exists. */
export function qualityScore(autoCorrect: number, autoTotal: number, scores: Record<string, number>): number | null {
  const auto = autoTotal > 0 ? (autoCorrect / autoTotal) * 100 : null;
  const vals = Object.values(scores).filter((v) => Number.isFinite(v));
  const manual = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) * 20 : null;
  if (auto === null && manual === null) return null;
  return Math.round(((auto ?? manual!) + (manual ?? auto!)) / 2 * 10) / 10;
}

export const BENCH_SYSTEM = 'You are a careful CBSE tutor. Answer the question. Show brief working only if needed. End with one line: "FINAL: <the answer only>". Answer in the language of the question.';

export interface BenchOptions { cases?: number; adapter?: AIProvider; now?: () => Date; subject?: string; classLevel?: string; language?: string; kind?: string }
export interface BreakdownCell { total: number; correct: number; accuracyPct: number | null; avgLatencyMs: number | null }
/** Accuracy by subject, class, language and task kind (auto-marked cases only count toward accuracy). Pure. */
export function benchmarkBreakdown(items: Array<{ subject?: string | null; class_level?: string | null; language?: string | null; kind: string; auto: boolean | null; ok: boolean; latency: number | null }>): Record<string, Record<string, BreakdownCell>> {
  const out: Record<string, Record<string, { t: number; c: number; l: number; n: number }>> = { subject: {}, class: {}, language: {}, task: {} };
  const add = (dim: string, key: string | null | undefined, it: (typeof items)[number]) => {
    const k = key || 'unspecified'; const x = (out[dim][k] ??= { t: 0, c: 0, l: 0, n: 0 });
    if (it.auto !== null) { x.t += 1; if (it.auto) x.c += 1; }
    if (it.ok && it.latency) { x.l += it.latency; x.n += 1; }
  };
  for (const it of items) { add('subject', it.subject, it); add('class', it.class_level, it); add('language', it.language, it); add('task', it.kind, it); }
  const res: Record<string, Record<string, BreakdownCell>> = {};
  for (const [dim, m] of Object.entries(out)) { res[dim] = {}; for (const [k, x] of Object.entries(m)) res[dim][k] = { total: x.t, correct: x.c, accuracyPct: x.t ? Math.round((x.c / x.t) * 1000) / 10 : null, avgLatencyMs: x.n ? Math.round(x.l / x.n) : null }; }
  return res;
}
export interface BenchRunLite { id?: string; provider_id: string; model?: string | null; model_version?: string | null; run_at: string; cases?: number; auto_total?: number; auto_correct?: number; latency_ms_avg?: number | null; cost_inr?: number | null; cost_per_case_inr?: number | null; quality_score?: number | null; scores?: Record<string, number> | null; breakdown?: Record<string, Record<string, BreakdownCell>> | null; subject?: string | null; class_level?: string | null; language?: string | null; task?: string | null }
export interface ComparisonRow { provider: string; model: string | null; version: string | null; date: string; quality: number | null; accuracyPct: number | null; hindiPct: number | null; reasoning: number | null; explanation: number | null; cbse: number | null; vision: number | null; latencyMs: number | null; costPerCaseInr: number | null; cases: number; scope: string }
const ms = (r: BenchRunLite, k: string) => (r.scores && Number.isFinite(Number(r.scores[k])) ? Number(r.scores[k]) : null);
/** Latest run per provider (optionally within one scope) side by side. Missing values stay null: nothing is filled in. */
export function compareModels(runs: BenchRunLite[], filter: { subject?: string; classLevel?: string; language?: string; task?: string } = {}): ComparisonRow[] {
  const latest = new Map<string, BenchRunLite>();
  for (const r of [...runs].sort((a, b) => b.run_at.localeCompare(a.run_at))) {
    if (filter.subject && r.subject !== filter.subject) continue; if (filter.classLevel && r.class_level !== filter.classLevel) continue;
    if (filter.language && r.language !== filter.language) continue; if (filter.task && r.task !== filter.task) continue;
    if (!latest.has(r.provider_id)) latest.set(r.provider_id, r);
  }
  return [...latest.values()].map((r) => ({
    provider: r.provider_id, model: r.model ?? null, version: r.model_version ?? null, date: r.run_at.slice(0, 10), quality: r.quality_score ?? null,
    accuracyPct: r.auto_total ? Math.round(((r.auto_correct ?? 0) / r.auto_total) * 1000) / 10 : null, hindiPct: r.breakdown?.language?.hi?.accuracyPct ?? null,
    reasoning: ms(r, 'reasoning'), explanation: ms(r, 'explanation'), cbse: ms(r, 'cbse_alignment'), vision: ms(r, 'vision_ocr'), latencyMs: r.latency_ms_avg ?? null,
    costPerCaseInr: r.cost_per_case_inr ?? (r.cases ? Number(r.cost_inr ?? 0) / r.cases : null), cases: r.cases ?? 0,
    scope: [r.subject, r.class_level && `class ${r.class_level}`, r.language, r.task].filter(Boolean).join(' · ') || 'all cases',
  })).sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1));
}
/** Runs the active benchmark cases against ONE provider directly (not through routing) and stores the run. Free-tier providers only unless a paid budget rule exists. */
export async function runBenchmark(service: SupabaseClient, providerId: string, opts: BenchOptions = {}): Promise<{ runId: string; cases: number; autoCorrect: number; autoTotal: number; failures: number }> {
  const [providers, cfg] = await Promise.all([loadProviders(service), loadGatewayConfig(service)]);
  const p = providers.find((x) => x.id === providerId); if (!p) throw new Error('provider_not_found');
  if (!['testing', 'active'].includes(p.status)) throw new Error('Switch the provider to "testing" or "active" first.');
  const free = isFreeRoute(p);
  if (!free && !(cfg.allow_paid_fallback && !cfg.free_only_mode)) throw new Error('This provider is not on a free route and no paid budget rule is set, so it will not be benchmarked.');
  const adapter = opts.adapter ?? buildAdapter(p);
  let cq = service.from('ai_benchmark_cases').select('*').eq('active', true);
  if (opts.subject) cq = cq.eq('subject', opts.subject); if (opts.classLevel) cq = cq.eq('class_level', opts.classLevel); if (opts.language) cq = cq.eq('language', opts.language); if (opts.kind) cq = cq.eq('kind', opts.kind);
  const { data: cases } = await cq.order('created_at').limit(opts.cases ?? 20);
  if (!cases?.length) throw new Error('No benchmark cases yet.');
  const { data: run, error } = await service.from('ai_benchmark_runs').insert({ provider_id: p.id, model: p.model, model_version: p.model_version, subject: opts.subject ?? null, class_level: opts.classLevel ?? null, language: opts.language ?? null, task: opts.kind ?? null }).select('id').single();
  if (error || !run) throw new Error('Could not start the run (has migration 0032 been run?).');
  let autoTotal = 0, autoCorrect = 0, failures = 0, latency = 0, ok = 0, cost = 0, listCost = 0;
  const items: Parameters<typeof benchmarkBreakdown>[0] = [];
  for (const c of cases as any[]) {
    const t0 = Date.now();
    let out = '', good = true, err: string | null = null, usage = { inputTokens: 0, outputTokens: 0 };
    try { const r = await adapter.complete({ systemPrompt: BENCH_SYSTEM, userMessage: c.prompt, feature: 'benchmark' }); out = r.text; usage = r.usage ?? usage; } catch (e: any) { good = false; err = String(e?.message ?? e).slice(0, 160); failures++; }
    const ms = Date.now() - t0; if (good) { latency += ms; ok++; }
    const grade = good ? autoGrade(c.kind, c.expected, out) : null;
    if (grade !== null) { autoTotal++; if (grade) autoCorrect++; }
    const cc = computeCost(p, usage.inputTokens, usage.outputTokens); cost += cc.billedInr; listCost += cc.listInr;
    items.push({ subject: c.subject, class_level: c.class_level, language: c.language, kind: c.kind, auto: grade, ok: good, latency: ms });
    await service.from('ai_benchmark_results').insert({ run_id: run.id, case_id: c.id, output: out.slice(0, 4000), ok: good, auto_correct: grade, latency_ms: ms, error: err });
    // Benchmark calls are logged like any other call so they count against quota and cost.
    const row = { student_id: null, tier: 'free', provider: p.id, feature: 'benchmark', ok: good, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, latency_ms: ms, error: err, model: p.model, task: 'benchmark', task_tier: 1, cost_est_inr: cc.estInr, cost_inr: cc.billedInr, free_quota_used: cc.freeQuotaUsed };
    const wide = { ...row, model_version: p.model_version, quota_type: cc.quotaType, list_cost_inr: cc.listInr, economic_cost_inr: cc.economicInr, pricing_snapshot: cc.pricingSnapshot, quality_result: 'not_checked' };
    const w = await service.from('ai_usage').insert(wide); if (w.error) await service.from('ai_usage').insert(row);
  }
  const q = qualityScore(autoCorrect, autoTotal, {});
  await service.from('ai_benchmark_runs').update({ cases: cases.length, auto_total: autoTotal, auto_correct: autoCorrect, failures, latency_ms_avg: ok ? Math.round(latency / ok) : null, cost_inr: cost, quality_score: q }).eq('id', run.id);
  // v59: scope, breakdown and cost per case (separate update so a missing migration 0036 cannot lose the run above)
  await service.from('ai_benchmark_runs').update({ breakdown: benchmarkBreakdown(items), cost_per_case_inr: cases.length ? listCost / cases.length : null }).eq('id', run.id);
  return { runId: run.id, cases: cases.length, autoCorrect, autoTotal, failures };
}

export type { ProviderRow };
