import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider, AICompletionParams, AICompletionResult } from '../ai-provider/ai-provider.interface';
import { startOfTodayIst, monthRangeIst, type AIAttempt } from '../ai-provider/usage';
import { loadProviders, keyPresent, type ProviderRow } from './registry';
import { loadGatewayConfig, type GatewayConfig } from './config';
import { assertAiAllowed, taskFor } from './tasks';
import { minimiseText } from './privacy';
import { planRoute, budgetDecision, usageByProvider, type ProviderUsage, type UsageRowLite } from './router';
import { computeCost } from './cost';
import { buildAdapter } from './adapters';

export interface GatewayContext { providers: ProviderRow[]; config: GatewayConfig; usage: Record<string, ProviderUsage>; spendToday: number; spendMonth: number; benchmark: Record<string, number | undefined> }
export interface UserStats { userCallsToday: number; userSpendMonth: number; featureSpendMonth: number; refSpend: number }
export interface GatewayDeps {
  loadContext(): Promise<GatewayContext>;
  userStats(studentId: string | null, feature: string, ref: string | undefined, config: GatewayConfig): Promise<UserStats>;
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
const sum = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + Number(r.cost_inr ?? 0), 0);

export function supabaseGatewayDeps(service: SupabaseClient, env: Record<string, string | undefined> = process.env): GatewayDeps {
  return {
    env, now: () => new Date(),
    buildAdapter: (p, m) => buildAdapter(p, m, env),
    async loadContext() {
      if (cache && Date.now() - cache.at < CACHE_MS) return cache.ctx;
      const now = new Date();
      const [providers, config, today, monthPaid, bench] = await Promise.all([
        loadProviders(service), loadGatewayConfig(service),
        service.from('ai_usage').select('provider, ok, input_tokens, output_tokens, created_at, error, cost_inr').gte('created_at', startOfTodayIst(now)).limit(20000),
        service.from('ai_usage').select('cost_inr').gt('cost_inr', 0).gte('created_at', currentMonthStartIst(now)).limit(50000),
        service.from('ai_benchmark_runs').select('provider_id, quality_score, run_at').not('quality_score', 'is', null).order('run_at', { ascending: false }).limit(300),
      ]);
      if (today.error) throw new Error(`ai_usage_unavailable: ${today.error.message}`);
      const todayRows = (today.data ?? []) as UsageRowLite[];
      const benchmark: Record<string, number | undefined> = {};
      for (const r of (bench.data ?? []) as any[]) if (benchmark[r.provider_id] === undefined) benchmark[r.provider_id] = Number(r.quality_score);
      const ctx: GatewayContext = { providers, config, usage: usageByProvider(todayRows, now), spendToday: sum(todayRows as any), spendMonth: sum(monthPaid.data as any), benchmark };
      cache = { at: Date.now(), ctx };
      return ctx;
    },
    async userStats(studentId, feature, ref, c) {
      const out: UserStats = { userCallsToday: 0, userSpendMonth: 0, featureSpendMonth: 0, refSpend: 0 };
      const now = new Date(), month = currentMonthStartIst(now);
      const jobs: Promise<void>[] = [];
      if (studentId && c.max_calls_per_user_day) jobs.push((async () => { const r = await service.from('ai_usage').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('created_at', startOfTodayIst(now)); out.userCallsToday = r.count ?? 0; })());
      if (studentId && c.max_cost_per_user_inr) jobs.push((async () => { const r = await service.from('ai_usage').select('cost_inr').eq('student_id', studentId).gt('cost_inr', 0).gte('created_at', month).limit(5000); out.userSpendMonth = sum(r.data); })());
      if (c.max_cost_per_feature_inr) jobs.push((async () => { const r = await service.from('ai_usage').select('cost_inr').eq('feature', feature).gt('cost_inr', 0).gte('created_at', month).limit(20000); out.featureSpendMonth = sum(r.data); })());
      if (ref && c.max_handwritten_eval_inr) jobs.push((async () => { const r = await service.from('ai_usage').select('cost_inr').eq('ref', ref).gt('cost_inr', 0).limit(500); out.refSpend = sum(r.data); })());
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

export class GatewayAIProvider implements AIProvider {
  readonly supportsImages = true;
  constructor(private o: GatewayOptions) {}

  private async report(a: AIAttempt) { try { await this.o.onAttempt?.(a); } catch { /* logging never breaks a turn */ } }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    assertAiAllowed(params.feature);
    const { deps } = this.o;
    const task = taskFor(params.feature);
    const clean: AICompletionParams = { ...params, systemPrompt: minimiseText(params.systemPrompt), userMessage: minimiseText(params.userMessage) };
    let ctx: GatewayContext;
    try { ctx = await deps.loadContext(); } catch (e) {
      if (this.o.legacy) return this.o.legacy().complete(clean);
      throw new Error(`all_ai_providers_unavailable: gateway_unavailable ${String((e as Error)?.message ?? e).slice(0, 80)}`);
    }
    const now = deps.now();
    let stats: UserStats = { userCallsToday: 0, userSpendMonth: 0, featureSpendMonth: 0, refSpend: 0 };
    try { stats = await deps.userStats(this.o.studentId, task.key, params.ref, ctx.config); } catch { /* a counting problem must not stop a lesson */ }
    const budget = budgetDecision({ config: ctx.config, feature: task.key, spendToday: ctx.spendToday, spendMonth: ctx.spendMonth, ...stats });
    const fail = async (why: string): Promise<never> => {
      await this.report({ provider: 'gateway', feature: task.key, ok: false, inputTokens: 0, outputTokens: 0, latencyMs: 0, error: why, task: task.key, taskTier: task.tier, ref: params.ref });
      throw new Error(`all_ai_providers_unavailable: ${why}`);
    };
    if (!budget.allow) return fail(`ai_budget_limit (${budget.reason})`);

    const needsImages = !!params.images?.length;
    const plan = planRoute({ feature: task.key, needsImages, studentTier: this.o.tier, config: ctx.config, providers: ctx.providers, usage: ctx.usage, hasKey: (p) => keyPresent(p, deps.env), benchmark: ctx.benchmark, cooling, now, paidBlockedByBudget: budget.paidBlocked });
    if (!plan.chain.length) {
      if (needsImages && !plan.skipped.some((s) => s.reason !== 'cannot read images')) throw new Error('no_vision_provider: no provider that can read photos is switched on');
      return fail(`no_eligible_provider (${plan.skipped.slice(0, 6).map((s) => `${s.id}: ${s.reason}`).join('; ')})`);
    }
    const failures: string[] = [];
    for (const p of plan.chain) {
      const started = Date.now();
      const override = p.id === ctx.config.primary_provider ? ctx.config.primary_model : p.id === ctx.config.fallback_provider ? ctx.config.fallback_model : null;
      try {
        const adapter = deps.buildAdapter(p, override);
        const result = await adapter.complete(clean);
        const inTok = result.usage?.inputTokens ?? 0, outTok = result.usage?.outputTokens ?? 0;
        const cost = computeCost(p, inTok, outTok, params.images?.length ?? 0, now.toISOString().slice(0, 10));
        const u = (ctx.usage[p.id] ??= { requests: 0, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 });
        u.requests += 1; u.tokens += inTok + outTok; u.lastMinuteRequests += 1; u.attemptsLastHour += 1;
        ctx.spendToday += cost.billedInr; ctx.spendMonth += cost.billedInr;
        await this.report({ provider: p.id, feature: task.key, ok: true, inputTokens: inTok, outputTokens: outTok, latencyMs: Date.now() - started, model: override || p.model || undefined, task: task.key, taskTier: task.tier, images: params.images?.length ?? 0, costEstInr: cost.estInr, costInr: cost.billedInr, freeQuotaUsed: cost.freeQuotaUsed, ref: params.ref });
        return result;
      } catch (err: any) {
        const message = String(err?.message ?? err);
        const code = Number(/request_failed: (\d{3})/.exec(message)?.[1]) || undefined;
        if (code === 429) cooling[p.id] = now.getTime() + 60_000;
        const u = (ctx.usage[p.id] ??= { requests: 0, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 });
        u.requests += 1; u.failures += 1; u.attemptsLastHour += 1; u.failuresLastHour += 1; if (code === 429) u.rate429LastHour += 1;
        failures.push(`${p.id}: ${message.slice(0, 100)}`);
        await this.report({ provider: p.id, feature: task.key, ok: false, inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started, error: message, model: override || p.model || undefined, task: task.key, taskTier: task.tier, images: params.images?.length ?? 0, costEstInr: 0, costInr: 0, ref: params.ref, statusCode: code });
      }
    }
    throw new Error(`all_ai_providers_unavailable: ${failures.join(' | ')}`);
  }
}
