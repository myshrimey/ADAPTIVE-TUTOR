import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider, AICompletionParams, AICompletionResult } from '../ai-provider/ai-provider.interface';
import { startOfTodayIst, monthRangeIst, type AIAttempt } from '../ai-provider/usage';
import { loadProviders, keyPresent, type ProviderRow } from './registry';
import { loadGatewayConfig, type GatewayConfig } from './config';
import { assertAiAllowed, taskFor } from './tasks';
import { minimiseText } from './privacy';
import { planRoute, budgetDecision, usageByProvider, type ProviderUsage, type UsageRowLite } from './router';
import { computeCost } from './cost';
import { loadEconomics, DEFAULT_ECONOMICS, type AiEconomics } from './economics-settings';
import { capStatuses } from './economics';
import { buildAdapter } from './adapters';

export interface GatewayContext { providers: ProviderRow[]; config: GatewayConfig; usage: Record<string, ProviderUsage>; spendToday: number; spendMonth: number; benchmark: Record<string, number | undefined>; econ?: AiEconomics; promoUsed?: Record<string, number> }
export interface UserStats { userCallsToday: number; userSpendMonth: number; featureSpendMonth: number; refSpend: number }
export interface GatewayDeps {
  loadContext(): Promise<GatewayContext>;
  userStats(studentId: string | null, feature: string, ref: string | undefined, config: GatewayConfig, basis?: 'billed' | 'economic'): Promise<UserStats>;
  buildAdapter(p: ProviderRow, modelOverride?: string | null): AIProvider;
  env: Record<string, string | undefined>;
  now(): Date;
}

/** Rate-limited providers rest for a minute (kept per server instance). */
const cooling: Record<string, number> = {};
export function resetGatewayState() { for (const k of Object.keys(cooling)) delete cooling[k]; cache = null; }

let cache: { at: number; ctx: GatewayContext } | null = null;
const CACHE_MS = 20_000;

function currentMonthStartIst(now: Date): string {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  return monthRangeIst(`${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`)!.from;
}
/** Spend that the limits count: what is billed (default) or the economic cost, which also counts free-quota use. Older rows without an economic figure use their list estimate. */
const sum = (rows: any[] | null, basis: 'billed' | 'economic' = 'billed') => (rows ?? []).reduce((a, r) => a + (basis === 'economic' ? Number(r.economic_cost_inr ?? r.cost_est_inr ?? 0) : Number(r.cost_inr ?? 0)), 0);
/** Run a query with the v59 columns, and again with the older ones if migration 0036 has not been applied yet. */
async function withFallback<T>(run: (cols: string) => PromiseLike<{ data: T | null; error: any }>, wide: string, narrow: string) {
  const r = await run(wide); if (!r.error) return r; return run(narrow);
}

export function supabaseGatewayDeps(service: SupabaseClient, env: Record<string, string | undefined> = process.env): GatewayDeps {
  return {
    env, now: () => new Date(),
    buildAdapter: (p, m) => buildAdapter(p, m, env),
    async loadContext() {
      if (cache && Date.now() - cache.at < CACHE_MS) return cache.ctx;
      const now = new Date();
      const [providers, config, econ, bench] = await Promise.all([
        loadProviders(service), loadGatewayConfig(service), loadEconomics(service),
        service.from('ai_benchmark_runs').select('provider_id, quality_score, run_at').not('quality_score', 'is', null).order('run_at', { ascending: false }).limit(300),
      ]);
      const basis = econ.cap_basis;
      const today = await withFallback<any[]>((c) => service.from('ai_usage').select(c).gte('created_at', startOfTodayIst(now)).limit(20000), 'provider, ok, input_tokens, output_tokens, created_at, error, cost_inr, latency_ms, economic_cost_inr, cost_est_inr', 'provider, ok, input_tokens, output_tokens, created_at, error, cost_inr, latency_ms');
      if (today.error) throw new Error(`ai_usage_unavailable: ${today.error.message}`);
      const monthRows = await withFallback<any[]>((c) => { let q = service.from('ai_usage').select(c).gte('created_at', currentMonthStartIst(now)).limit(50000); q = basis === 'economic' ? q : q.gt('cost_inr', 0); return q; }, 'cost_inr, economic_cost_inr, cost_est_inr', 'cost_inr');
      const todayRows = (today.data ?? []) as UsageRowLite[];
      const benchmark: Record<string, number | undefined> = {};
      for (const r of (bench.data ?? []) as any[]) if (benchmark[r.provider_id] === undefined) benchmark[r.provider_id] = Number(r.quality_score);
      // promotional credit used since each provider's balance was entered
      const promoUsed: Record<string, number> = {};
      const promoProviders = providers.filter((p) => p.quota_type === 'promo_credit' && p.promo_credit_as_of);
      for (const p of promoProviders) {
        const r = await service.from('ai_usage').select('promo_credit_inr').eq('provider', p.id).gt('promo_credit_inr', 0).gte('created_at', p.promo_credit_as_of!).limit(50000);
        promoUsed[p.id] = (r.data ?? []).reduce((a: number, x: any) => a + Number(x.promo_credit_inr ?? 0), 0);
      }
      const ctx: GatewayContext = { providers, config, usage: usageByProvider(todayRows, now), spendToday: sum(todayRows as any, basis), spendMonth: sum(monthRows.data as any, basis), benchmark, econ, promoUsed };
      cache = { at: Date.now(), ctx };
      return ctx;
    },
    async userStats(studentId, feature, ref, c, basis = 'billed') {
      const out: UserStats = { userCallsToday: 0, userSpendMonth: 0, featureSpendMonth: 0, refSpend: 0 };
      const now = new Date(), month = currentMonthStartIst(now);
      const jobs: Promise<void>[] = [];
      if (studentId && c.max_calls_per_user_day) jobs.push((async () => { const r = await service.from('ai_usage').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('created_at', startOfTodayIst(now)); out.userCallsToday = r.count ?? 0; })());
      const cols = basis === 'economic' ? 'cost_inr, economic_cost_inr, cost_est_inr' : 'cost_inr';
      const spend = async (build: (cols: string) => any): Promise<number> => { const r = await withFallback<any[]>(build, cols, 'cost_inr'); return sum(r.data, basis); };
      const gt = (q: any) => (basis === 'economic' ? q : q.gt('cost_inr', 0));
      if (studentId && c.max_cost_per_user_inr) jobs.push((async () => { out.userSpendMonth = await spend((k) => gt(service.from('ai_usage').select(k).eq('student_id', studentId).gte('created_at', month).limit(5000))); })());
      if (c.max_cost_per_feature_inr) jobs.push((async () => { out.featureSpendMonth = await spend((k) => gt(service.from('ai_usage').select(k).eq('feature', feature).gte('created_at', month).limit(20000))); })());
      if (ref && c.max_handwritten_eval_inr) jobs.push((async () => { out.refSpend = await spend((k) => gt(service.from('ai_usage').select(k).eq('ref', ref).limit(500))); })());
      await Promise.all(jobs);
      return out;
    },
  };
}

export interface GatewayOptions {
  deps: GatewayDeps; studentId: string | null; tier: 'free' | 'paid';
  onAttempt?: (a: AIAttempt) => Promise<void> | void;
  /** Used only if the registry/config cannot be read at all (e.g. migration 0032 not run yet), so the app keeps working. */
  legacy?: () => AIProvider;
}

/** Valid JSON (optionally inside a code fence): the only quality check the gateway can make by itself. */
export function jsonLooksValid(text: string): boolean {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { JSON.parse(t); return true; } catch { const m = /\{[\s\S]*\}/.exec(t); if (!m) return false; try { JSON.parse(m[0]); return true; } catch { return false; } }
}
const newRequestId = (): string => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-0000`.padEnd(36, '0'));

export class GatewayAIProvider implements AIProvider {
  readonly supportsImages = true;
  constructor(private o: GatewayOptions) {}

  private async report(a: AIAttempt) { try { await this.o.onAttempt?.(a); } catch { /* logging never breaks a turn */ } }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    assertAiAllowed(params.feature);
    const { deps } = this.o;
    const task = taskFor(params.feature);
    const requestId = newRequestId();
    const clean: AICompletionParams = { ...params, systemPrompt: minimiseText(params.systemPrompt), userMessage: minimiseText(params.userMessage) };
    let ctx: GatewayContext;
    try { ctx = await deps.loadContext(); } catch (e) {
      if (this.o.legacy) return this.o.legacy().complete(clean);
      throw new Error(`all_ai_providers_unavailable: gateway_unavailable ${String((e as Error)?.message ?? e).slice(0, 80)}`);
    }
    const econ = ctx.econ ?? DEFAULT_ECONOMICS;
    const now = deps.now();
    let stats: UserStats = { userCallsToday: 0, userSpendMonth: 0, featureSpendMonth: 0, refSpend: 0 };
    try { stats = await deps.userStats(this.o.studentId, task.key, params.ref, ctx.config, econ.cap_basis); } catch { /* a counting problem must not stop a lesson */ }
    const budget = budgetDecision({ config: ctx.config, feature: task.key, spendToday: ctx.spendToday, spendMonth: ctx.spendMonth, ...stats });
    const caps = capStatuses({ config: ctx.config, econ, spendToday: ctx.spendToday, spendMonth: ctx.spendMonth, ...stats }).filter((c) => c.level !== 'ok');
    const fail = async (why: string): Promise<never> => {
      await this.report({ requestId, attemptNo: 1, provider: 'gateway', feature: task.key, ok: false, inputTokens: 0, outputTokens: 0, latencyMs: 0, error: why, task: task.key, taskTier: task.tier, ref: params.ref, qualityResult: 'not_checked', routeExplanation: { task: task.key, outcome: 'refused', reason: why, spend_levels: caps.map((c) => `${c.label} ${c.pct}% (${c.level})`) } });
      throw new Error(`all_ai_providers_unavailable: ${why}`);
    };
    if (!budget.allow) return fail(`ai_budget_limit (${budget.reason})`);

    const needsImages = !!params.images?.length;
    const estimate = { inputTokens: Math.ceil((clean.systemPrompt.length + clean.userMessage.length) / 4), outputTokens: needsImages ? 4096 : 512, images: params.images?.length ?? 0 };
    const plan = planRoute({ feature: task.key, needsImages, studentTier: this.o.tier, config: ctx.config, providers: ctx.providers, usage: ctx.usage, hasKey: (p) => keyPresent(p, deps.env), benchmark: ctx.benchmark, cooling, now, paidBlockedByBudget: budget.paidBlocked, econ, estimate, promoUsed: ctx.promoUsed });
    if (!plan.chain.length) {
      if (needsImages && !plan.skipped.some((s) => s.reason !== 'cannot read images')) throw new Error('no_vision_provider: no provider that can read photos is switched on');
      return fail(`no_eligible_provider (${plan.skipped.slice(0, 6).map((s) => `${s.id}: ${s.reason}`).join('; ')})`);
    }
    const failures: string[] = [];
    const tried: string[] = [];
    for (const p of plan.chain) {
      const started = Date.now();
      const override = p.id === ctx.config.primary_provider ? ctx.config.primary_model : p.id === ctx.config.fallback_provider ? ctx.config.fallback_model : null;
      const attemptNo = tried.length + 1, retryCount = tried.filter((x) => x === p.id).length;
      tried.push(p.id);
      const lastFailure = failures.length ? failures[failures.length - 1] : null;
      // ADMIN ONLY: why this model was picked. Contains no key, no price secret and no student text.
      const explanation = {
        task: task.key, task_tier: task.tier, objective: plan.objective, needs: plan.needs, selected: p.id, model: override || p.model, position_in_chain: attemptNo,
        reasons: plan.reasons[p.id] ?? [], chain: plan.chain.map((c) => c.id), skipped: plan.skipped.slice(0, 12),
        budget: { paid_blocked: budget.paidBlocked, reason: budget.reason }, spend_levels: caps.map((c) => `${c.label} ${c.pct}% (${c.level})`),
        fallback_because: lastFailure,
      };
      try {
        const adapter = deps.buildAdapter(p, override);
        const result = await adapter.complete(clean);
        const inTok = result.usage?.inputTokens ?? 0, outTok = result.usage?.outputTokens ?? 0;
        const cost = computeCost(p, inTok, outTok, params.images?.length ?? 0, now.toISOString().slice(0, 10), { fx: econ.fx_usd_inr, promoUsedInr: ctx.promoUsed?.[p.id] ?? 0 });
        if (ctx.promoUsed && cost.promoCreditInr) ctx.promoUsed[p.id] = (ctx.promoUsed[p.id] ?? 0) + cost.promoCreditInr;
        const u = (ctx.usage[p.id] ??= { requests: 0, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 });
        u.requests += 1; u.tokens += inTok + outTok; u.lastMinuteRequests += 1; u.attemptsLastHour += 1;
        const spend = econ.cap_basis === 'economic' ? cost.economicInr : cost.billedInr;
        ctx.spendToday += spend; ctx.spendMonth += spend;
        const quality = params.responseFormat === 'json' ? (jsonLooksValid(result.text) ? 'passed' : 'failed') : 'not_checked';
        await this.report({
          requestId, attemptNo, retryCount, fallbackCount: failures.length, fallbackReason: lastFailure, modelVersion: p.model_version,
          provider: p.id, feature: task.key, ok: true, inputTokens: inTok, outputTokens: outTok, latencyMs: Date.now() - started, model: override || p.model || undefined, task: task.key, taskTier: task.tier,
          images: params.images?.length ?? 0, costEstInr: cost.estInr, costInr: cost.billedInr, freeQuotaUsed: cost.freeQuotaUsed, ref: params.ref,
          quotaType: cost.quotaType, listCostInr: cost.listInr, freeQuotaValueInr: cost.freeQuotaValueInr, promoCreditInr: cost.promoCreditInr, economicCostInr: cost.economicInr,
          pricingSnapshot: cost.pricingSnapshot, qualityResult: quality, routeExplanation: explanation,
        });
        return { ...result, requestId };
      } catch (err: any) {
        const message = String(err?.message ?? err);
        const code = Number(/request_failed: (\d{3})/.exec(message)?.[1]) || undefined;
        if (code === 429) cooling[p.id] = now.getTime() + 60_000;
        const u = (ctx.usage[p.id] ??= { requests: 0, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 });
        u.requests += 1; u.failures += 1; u.attemptsLastHour += 1; u.failuresLastHour += 1; if (code === 429) u.rate429LastHour += 1;
        failures.push(`${p.id}: ${message.slice(0, 100)}`);
        await this.report({
          requestId, attemptNo, retryCount, fallbackCount: attemptNo - 1, fallbackReason: lastFailure, modelVersion: p.model_version,
          provider: p.id, feature: task.key, ok: false, inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started, error: message, model: override || p.model || undefined, task: task.key, taskTier: task.tier,
          images: params.images?.length ?? 0, costEstInr: 0, costInr: 0, ref: params.ref, statusCode: code, quotaType: computeCost(p, 0, 0, 0, undefined, { fx: econ.fx_usd_inr }).quotaType,
          listCostInr: 0, economicCostInr: 0, qualityResult: 'not_checked', routeExplanation: explanation,
        });
      }
    }
    throw new Error(`all_ai_providers_unavailable: ${failures.join(' | ')}`);
  }
}
