import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { loadProviders, isFreeRoute, type ProviderRow } from './registry';
import { loadGatewayConfig } from './config';
import { buildAdapter } from './adapters';
import { computeCost } from './cost';

export const MANUAL_DIMENSIONS = ['factual', 'reasoning', 'cbse_alignment', 'explanation', 'marking_scheme', 'multilingual', 'hallucination', 'safety'] as const;
export const MANUAL_LABELS: Record<string, string> = { factual: 'Factual accuracy', reasoning: 'Reasoning', cbse_alignment: 'CBSE alignment', explanation: 'Explanation quality', marking_scheme: 'Marking-scheme quality', multilingual: 'Multilingual quality', hallucination: 'No hallucination', safety: 'Safety' };

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

export interface BenchOptions { cases?: number; adapter?: AIProvider; now?: () => Date }
/** Runs the active benchmark cases against ONE provider directly (not through routing) and stores the run. Free-tier providers only unless a paid budget rule exists. */
export async function runBenchmark(service: SupabaseClient, providerId: string, opts: BenchOptions = {}): Promise<{ runId: string; cases: number; autoCorrect: number; autoTotal: number; failures: number }> {
  const [providers, cfg] = await Promise.all([loadProviders(service), loadGatewayConfig(service)]);
  const p = providers.find((x) => x.id === providerId); if (!p) throw new Error('provider_not_found');
  if (!['testing', 'active'].includes(p.status)) throw new Error('Switch the provider to "testing" or "active" first.');
  const free = isFreeRoute(p);
  if (!free && !(cfg.allow_paid_fallback && !cfg.free_only_mode)) throw new Error('This provider is not on a free route and no paid budget rule is set, so it will not be benchmarked.');
  const adapter = opts.adapter ?? buildAdapter(p);
  const { data: cases } = await service.from('ai_benchmark_cases').select('*').eq('active', true).order('created_at').limit(opts.cases ?? 20);
  if (!cases?.length) throw new Error('No benchmark cases yet.');
  const { data: run, error } = await service.from('ai_benchmark_runs').insert({ provider_id: p.id, model: p.model, model_version: p.model_version }).select('id').single();
  if (error || !run) throw new Error('Could not start the run (has migration 0032 been run?).');
  let autoTotal = 0, autoCorrect = 0, failures = 0, latency = 0, ok = 0, cost = 0;
  for (const c of cases as any[]) {
    const t0 = Date.now();
    let out = '', good = true, err: string | null = null, usage = { inputTokens: 0, outputTokens: 0 };
    try { const r = await adapter.complete({ systemPrompt: BENCH_SYSTEM, userMessage: c.prompt, feature: 'benchmark' }); out = r.text; usage = r.usage ?? usage; } catch (e: any) { good = false; err = String(e?.message ?? e).slice(0, 160); failures++; }
    const ms = Date.now() - t0; if (good) { latency += ms; ok++; }
    const grade = good ? autoGrade(c.kind, c.expected, out) : null;
    if (grade !== null) { autoTotal++; if (grade) autoCorrect++; }
    const cc = computeCost(p, usage.inputTokens, usage.outputTokens); cost += cc.billedInr;
    await service.from('ai_benchmark_results').insert({ run_id: run.id, case_id: c.id, output: out.slice(0, 4000), ok: good, auto_correct: grade, latency_ms: ms, error: err });
    // Benchmark calls are logged like any other call so they count against quota and cost.
    await service.from('ai_usage').insert({ student_id: null, tier: 'free', provider: p.id, feature: 'benchmark', ok: good, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens, latency_ms: ms, error: err, model: p.model, task: 'benchmark', task_tier: 1, cost_est_inr: cc.estInr, cost_inr: cc.billedInr, free_quota_used: cc.freeQuotaUsed });
  }
  const q = qualityScore(autoCorrect, autoTotal, {});
  await service.from('ai_benchmark_runs').update({ cases: cases.length, auto_total: autoTotal, auto_correct: autoCorrect, failures, latency_ms_avg: ok ? Math.round(latency / ok) : null, cost_inr: cost, quality_score: q }).eq('id', run.id);
  return { runId: run.id, cases: cases.length, autoCorrect, autoTotal, failures };
}

export type { ProviderRow };
