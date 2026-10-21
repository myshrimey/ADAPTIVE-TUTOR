import type { SupabaseClient } from '@supabase/supabase-js';
import type { AITier } from '../plans/plans';

// AI usage and cost log. One row per AI call attempt (including failed attempts), with
// token counts and timing, and NEVER the prompt or the answer text (a child's words are
// not stored here). Written only by the server with the service client; there is no
// RLS policy for ordinary users on ai_usage.
//
// Cost is estimated at READ time from the rate table below, so fixing a rate fixes the
// history. The rates are the founder-facing planning numbers, not an invoice: check each
// company's current price page and edit this table if they differ.

export interface AIAttempt {
  provider: string; // 'gemini' | 'gemini_2' | 'groq' | 'openai' | 'claude'
  feature: string;
  ok: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
  // v55b gateway fields (optional: the old chain does not set them)
  model?: string; task?: string; taskTier?: number; images?: number; costEstInr?: number; costInr?: number; freeQuotaUsed?: boolean; ref?: string; statusCode?: number;
}

/** USD per 1 million tokens (input, output). Planning assumptions — edit when prices change. */
export const AI_RATES_USD_PER_M: Record<string, { input: number; output: number }> = {
  gemini: { input: 0.3, output: 2.5 },
  gemini_2: { input: 0.3, output: 2.5 },
  groq: { input: 0.59, output: 0.79 },
  openai: { input: 0.15, output: 0.6 },
  claude: { input: 1.0, output: 5.0 },
};
export const USD_TO_INR = 88;

/**
 * Providers that are on a FREE API tier (so they cost nothing today). The founder sets
 * AI_FREE_PROVIDERS (comma list) when a provider moves to paid billing. Default: the
 * providers that were free in v36. Free-plan students may use ONLY these.
 */
export function freeProviderNames(): string[] {
  const raw = process.env.AI_FREE_PROVIDERS ?? 'gemini,gemini_2,groq';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/** What these tokens would cost at list price, in rupees (regardless of free tier). */
export function listPriceInr(provider: string, inputTokens: number, outputTokens: number): number {
  const r = AI_RATES_USD_PER_M[provider];
  if (!r) return 0;
  return ((inputTokens * r.input + outputTokens * r.output) / 1_000_000) * USD_TO_INR;
}

/** What is actually billed: zero for free-tier providers. */
export function billedInr(provider: string, inputTokens: number, outputTokens: number, free: string[] = freeProviderNames()): number {
  return free.includes(provider) ? 0 : listPriceInr(provider, inputTokens, outputTokens);
}

/** Start of "today" in India (UTC+5:30), as an ISO timestamp — daily limits reset at midnight IST. */
export function startOfTodayIst(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const dayStartIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(dayStartIst - 5.5 * 3600 * 1000).toISOString();
}

export function recordAIAttempt(service: SupabaseClient, studentId: string | null, tier: AITier) {
  return async (a: AIAttempt): Promise<void> => {
    try {
      const base = {
        student_id: studentId,
        tier,
        provider: a.provider,
        feature: a.feature,
        ok: a.ok,
        input_tokens: a.inputTokens,
        output_tokens: a.outputTokens,
        latency_ms: a.latencyMs,
        error: a.error ? a.error.slice(0, 160) : null,
      };
      const { error } = await service.from('ai_usage').insert({
        ...base, model: a.model ?? null, task: a.task ?? null, task_tier: a.taskTier ?? null, images: a.images ?? 0,
        cost_est_inr: a.costEstInr ?? null, cost_inr: a.costInr ?? null, free_quota_used: a.freeQuotaUsed ?? false, ref: a.ref ?? null, status_code: a.statusCode ?? null,
      });
      // Migration 0032 not run yet: keep logging with the old columns.
      if (error) await service.from('ai_usage').insert(base);
    } catch {
      // Logging is best-effort and must never break a student's turn.
    }
  };
}

/** How many AI tutor replies this student has had today (successful 'tutor' calls). */
export async function countTutorRepliesToday(service: SupabaseClient, studentId: string, now: Date = new Date()): Promise<number> {
  const { count } = await service
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('feature', 'tutor')
    .eq('ok', true)
    .gte('created_at', startOfTodayIst(now));
  return count ?? 0;
}

/** Throws 'daily_ai_limit' when the student has used today's allowance of AI tutor replies. */
export async function assertTutorAllowance(service: SupabaseClient, studentId: string, limit: number): Promise<void> {
  const used = await countTutorRepliesToday(service, studentId);
  if (used >= limit) throw new Error('daily_ai_limit');
}

export interface UsageRow {
  student_id: string | null;
  tier: string;
  provider: string;
  feature: string;
  ok: boolean;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

export interface UsageSummary {
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  listPriceInr: number;
  billedInr: number;
}

export function emptySummary(): UsageSummary {
  return { calls: 0, failures: 0, inputTokens: 0, outputTokens: 0, listPriceInr: 0, billedInr: 0 };
}

export function addToSummary(s: UsageSummary, r: UsageRow, free: string[] = freeProviderNames()): void {
  if (r.ok) s.calls += 1;
  else s.failures += 1;
  s.inputTokens += r.input_tokens;
  s.outputTokens += r.output_tokens;
  s.listPriceInr += listPriceInr(r.provider, r.input_tokens, r.output_tokens);
  s.billedInr += billedInr(r.provider, r.input_tokens, r.output_tokens, free);
}

export interface UsageReport {
  total: UsageSummary;
  byProvider: Record<string, UsageSummary>;
  byFeature: Record<string, UsageSummary>;
  byTier: Record<string, UsageSummary>;
  byStudent: Record<string, UsageSummary>;
}

/** Pure roll-up of usage rows for the admin cost page. */
export function buildUsageReport(rows: UsageRow[], free: string[] = freeProviderNames()): UsageReport {
  const report: UsageReport = { total: emptySummary(), byProvider: {}, byFeature: {}, byTier: {}, byStudent: {} };
  const bump = (bucket: Record<string, UsageSummary>, key: string, r: UsageRow) => {
    addToSummary((bucket[key] ??= emptySummary()), r, free);
  };
  for (const r of rows) {
    addToSummary(report.total, r, free);
    bump(report.byProvider, r.provider, r);
    bump(report.byFeature, r.feature, r);
    bump(report.byTier, r.tier, r);
    bump(report.byStudent, r.student_id ?? 'unknown', r);
  }
  return report;
}

/** First and last instant of a calendar month ('YYYY-MM') in India time, as ISO timestamps. */
export function monthRangeIst(month: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const off = 5.5 * 3600 * 1000;
  return { from: new Date(Date.UTC(y, mo - 1, 1) - off).toISOString(), to: new Date(Date.UTC(y, mo, 1) - off).toISOString() };
}
