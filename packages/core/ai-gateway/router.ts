import { isFreeRoute, quotaTypeOf, type ProviderRow } from './registry';
import type { AiEconomics } from './economics-settings';
import { computeCost } from './cost';
import { paidAllowed, type GatewayConfig } from './config';
import { taskFor } from './tasks';

export interface UsageRowLite { provider: string; ok: boolean; input_tokens: number; output_tokens: number; created_at: string; error?: string | null; cost_inr?: number | null; feature?: string; student_id?: string | null; latency_ms?: number | null }
export interface ProviderUsage { requests: number; tokens: number; failures: number; failuresLastHour: number; attemptsLastHour: number; rate429LastHour: number; lastMinuteRequests: number; latencySum?: number; latencyN?: number }

/** Roll today's usage rows up per provider (pure). `todayRows` = rows since IST midnight. */
export function usageByProvider(todayRows: UsageRowLite[], now: Date = new Date()): Record<string, ProviderUsage> {
  const out: Record<string, ProviderUsage> = {};
  const hourAgo = now.getTime() - 3600_000, minAgo = now.getTime() - 60_000;
  for (const r of todayRows) {
    const u = (out[r.provider] ??= { requests: 0, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 });
    u.requests += 1; u.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    if (!r.ok) u.failures += 1;
    else if (r.latency_ms) { u.latencySum = (u.latencySum ?? 0) + r.latency_ms; u.latencyN = (u.latencyN ?? 0) + 1; }
    const t = new Date(r.created_at).getTime();
    if (t >= hourAgo) { u.attemptsLastHour += 1; if (!r.ok) { u.failuresLastHour += 1; if (/\b429\b|rate.?limit|quota/i.test(r.error ?? '')) u.rate429LastHour += 1; } }
    if (t >= minAgo) u.lastMinuteRequests += 1;
  }
  return out;
}

export type QuotaLevel = 'ok' | 'warning' | 'critical' | 'exhausted' | 'unknown';
export interface QuotaStatus { level: QuotaLevel; pct: number | null; dimension: string | null; remainingRequests: number | null }
/** Highest-used dimension among the limits the founder entered (rpd, tpd, rpm). Unknown limits are never guessed. */
export function quotaStatus(p: ProviderRow, u: ProviderUsage | undefined, cfg: Pick<GatewayConfig, 'quota_warn_pct' | 'quota_critical_pct'>): QuotaStatus {
  const used = u ?? { requests: 0, tokens: 0, lastMinuteRequests: 0 } as ProviderUsage;
  const dims: Array<[string, number | null, number]> = [['requests/day', p.rpd, used.requests], ['tokens/day', p.tpd, used.tokens], ['requests/minute', p.rpm, used.lastMinuteRequests]];
  let best: { d: string; pct: number } | null = null;
  for (const [d, lim, use] of dims) { if (lim && lim > 0) { const pct = (use / lim) * 100; if (!best || pct > best.pct) best = { d, pct }; } }
  const remainingRequests = p.rpd ? Math.max(0, p.rpd - used.requests) : null;
  if (!best) return { level: 'unknown', pct: null, dimension: null, remainingRequests };
  const level: QuotaLevel = best.pct >= 100 ? 'exhausted' : best.pct >= cfg.quota_critical_pct ? 'critical' : best.pct >= cfg.quota_warn_pct ? 'warning' : 'ok';
  return { level, pct: Math.round(best.pct * 10) / 10, dimension: best.d, remainingRequests };
}

export type Health = 'healthy' | 'degraded' | 'unreliable' | 'unknown';
/** Unreliable = at least 5 attempts in the last hour and half or more failed. */
export function healthOf(u: ProviderUsage | undefined): Health {
  if (!u || u.attemptsLastHour === 0) return 'unknown';
  if (u.attemptsLastHour >= 5 && u.failuresLastHour / u.attemptsLastHour >= 0.5) return 'unreliable';
  if (u.failuresLastHour / u.attemptsLastHour >= 0.2) return 'degraded';
  return 'healthy';
}

export interface RouteInput {
  feature: string | undefined; needsImages: boolean; studentTier: 'free' | 'paid';
  config: GatewayConfig; providers: ProviderRow[]; usage: Record<string, ProviderUsage>;
  hasKey: (p: ProviderRow) => boolean; benchmark?: Record<string, number | undefined>;
  cooling?: Record<string, number>; now?: Date;
  /** set when a spend cap has been reached: paid routes are then off */
  paidBlockedByBudget?: boolean;
  /** v59: routing limits and objective (setting ai_economics), a size estimate for the cost ceiling, and promo credit already used per provider */
  econ?: AiEconomics; estimate?: { inputTokens: number; outputTokens: number; images: number }; promoUsed?: Record<string, number>;
}
export interface RoutePlan { chain: ProviderRow[]; skipped: Array<{ id: string; reason: string }>; /** ADMIN ONLY: why each eligible provider qualified (never shown to students) */ reasons: Record<string, string[]>; objective: string; needs: string[] }

/** Capabilities a task needs. A capability recorded as explicitly false removes the model; an unrecorded one is allowed and noted as unverified. */
export const TASK_CAPABILITIES: Record<string, string[]> = { handwriting: ['vision', 'ocr'], translation: ['hindi'], evaluation: ['json'], question_generation: ['json'], misconception: ['json'] };
export function avgLatencyMs(u: ProviderUsage | undefined): { ms: number; n: number } | null { return u && u.latencyN ? { ms: Math.round((u.latencySum ?? 0) / u.latencyN), n: u.latencyN } : null; }

export function planRoute(i: RouteInput): RoutePlan {
  const now = i.now ?? new Date(); const today = now.toISOString().slice(0, 10);
  const task = taskFor(i.feature);
  const byId = new Map(i.providers.map((p) => [p.id, p]));
  // Order: this task's own route, else primary, fallback, then the rest by priority.
  const custom = i.config.routes[task.key] ?? i.config.routes[i.needsImages ? 'vision' : '__none__'];
  const order: string[] = [];
  const add = (id: string | null | undefined) => { if (id && byId.has(id) && !order.includes(id)) order.push(id); };
  (custom ?? []).forEach(add);
  if (!custom?.length) { add(i.config.primary_provider); add(i.config.fallback_provider); }
  [...i.providers].sort((a, b) => a.priority - b.priority).forEach((p) => add(p.id));
  const skipped: RoutePlan['skipped'] = []; const good: ProviderRow[] = []; const weak: ProviderRow[] = [];
  const reasons: Record<string, string[]> = {}; const E = i.econ;
  const needs = [...(i.needsImages ? ['vision'] : []), ...(TASK_CAPABILITIES[task.key] ?? []).filter((c) => !(i.needsImages && c === 'vision'))];
  const minQ = Math.max(i.config.handwriting_min_quality !== null && task.key === 'handwriting' ? i.config.handwriting_min_quality : -1, E?.quality_min?.[task.key] ?? -1);
  const paidOk = paidAllowed(i.config) && !i.paidBlockedByBudget && i.studentTier === 'paid';
  for (const id of order) {
    const p = byId.get(id)!;
    const skip = (reason: string) => skipped.push({ id, reason });
    if (p.status !== 'active') { if (custom?.includes(id) || id === i.config.primary_provider || id === i.config.fallback_provider || ['paused', 'testing'].includes(p.status)) skip(`status ${p.status}`); continue; }
    if (p.classification === 'F') { skip('not approved (F)'); continue; }
    if (!i.hasKey(p)) { skip('no API key set'); continue; }
    if (!p.model) { skip('no model set'); continue; }
    if (p.adapter === 'openai_compatible' && !p.endpoint) { skip('no endpoint set'); continue; }
    if (i.needsImages && !p.vision) { skip('cannot read images'); continue; }
    if (p.policy_status === 'not_acceptable') { skip('data policy not acceptable'); continue; }
    if (i.config.block_unknown_policy && p.policy_status !== 'acceptable') { skip('data policy not confirmed'); continue; }
    if (i.cooling?.[id] && i.cooling[id] > now.getTime()) { skip('cooling down after a rate limit'); continue; }
    const why: string[] = [];
    const free = isFreeRoute(p, today);
    const qt = quotaTypeOf(p, today, i.promoUsed?.[id] ?? 0);
    // A promotional credit is finite money: it is gated exactly like paid use (plan, explicit budget rule), only the billed amount is lower.
    if (!free) {
      if (i.studentTier === 'free') { skip('paid provider (free plan)'); continue; }
      if (!paidOk) { skip(i.paidBlockedByBudget ? 'paid provider (spend cap reached)' : 'paid provider (no explicit budget rule)'); continue; }
      why.push(qt === 'promo_credit' ? 'promotional credit available (needs paid rules: allowed)' : 'paid route allowed by explicit budget rule');
    } else {
      const q = quotaStatus(p, i.usage[id], i.config);
      if (q.level === 'exhausted') { skip(`free quota used up (${q.dimension})`); continue; }
      why.push(q.level === 'unknown' ? 'free quota (limits not entered, usage unchecked)' : `free quota available (${q.pct}% of ${q.dimension} used)`);
    }
    // capabilities
    const capBad = needs.find((c) => p.capabilities?.[c] === false);
    if (capBad) { skip(`capability "${capBad}" recorded as not supported`); continue; }
    for (const c of needs) why.push(p.capabilities?.[c] === true ? `${c} supported` : c === 'vision' && p.vision ? 'vision supported' : `${c} not recorded (unverified)`);
    // quality gate
    if (minQ >= 0) {
      const sc = i.benchmark?.[id];
      if (sc === undefined || sc < minQ) { skip(sc === undefined ? `not benchmarked (task needs quality >= ${minQ})` : `benchmark ${sc} below ${minQ}`); continue; }
      why.push(`quality benchmark ${sc} >= ${minQ}`);
    }
    // cost ceiling per call (economic = list price, so a free quota does not hide it)
    const ceil = E?.max_cost_per_call_inr?.[task.key];
    if (ceil !== undefined && i.estimate) {
      const est = computeCost(p, i.estimate.inputTokens, i.estimate.outputTokens, i.estimate.images, today, { fx: E?.fx_usd_inr }).listInr;
      if (p.input_price_usd_m !== null && p.output_price_usd_m !== null) {
        if (est > ceil) { skip(`estimated cost Rs ${est.toFixed(3)} above the task limit Rs ${ceil}`); continue; }
        why.push(`estimated cost Rs ${est.toFixed(3)} within task limit Rs ${ceil}`);
      } else why.push('price not recorded: cost limit could not be checked');
    }
    // latency
    const lat = avgLatencyMs(i.usage[id]); const maxLat = E?.max_latency_ms?.[task.key];
    if (maxLat !== undefined && lat && lat.n >= 5) {
      if (lat.ms > maxLat) { skip(`average latency ${lat.ms} ms above the task limit ${maxLat} ms`); continue; }
      why.push(`latency ${lat.ms} ms within ${maxLat} ms`);
    } else if (maxLat !== undefined) why.push('latency not yet measured (fewer than 5 calls today)');
    why.push(p.policy_status === 'acceptable' ? 'data policy approved' : 'data policy not confirmed (allowed: blocking is off)');
    const h = healthOf(i.usage[id]); why.push(h === 'unknown' ? 'no health data yet' : `provider ${h}`);
    reasons[id] = why;
    // Free routes are preferred over paid ones; unreliable providers go to the back.
    (healthOf(i.usage[id]) === 'unreliable' ? weak : good).push(p);
  }
  const free = (p: ProviderRow) => (isFreeRoute(p, today) ? 0 : 1);
  const objective = E?.route_objective ?? 'configured_order';
  // Optional objective: among models that passed every gate above, cheapest list price first (never overrides a failed quality gate, because failed ones are already out).
  const byCost = (a: ProviderRow, b: ProviderRow) => objective !== 'lowest_cost_meeting_quality' || !i.estimate ? 0
    : computeCost(a, i.estimate.inputTokens, i.estimate.outputTokens, i.estimate.images, today, { fx: E?.fx_usd_inr }).listInr - computeCost(b, i.estimate.inputTokens, i.estimate.outputTokens, i.estimate.images, today, { fx: E?.fx_usd_inr }).listInr;
  const tier = (p: ProviderRow) => (free(p) === 0 ? 0 : quotaTypeOf(p, today, i.promoUsed?.[p.id] ?? 0) === 'promo_credit' ? 1 : 2);
  const grp = (arr: ProviderRow[], t: number) => arr.filter((p) => tier(p) === t).sort(byCost);
  const ordered = [0, 1, 2].flatMap((t) => grp(good, t)).concat([0, 1, 2].flatMap((t) => grp(weak, t)));
  if (objective === 'lowest_cost_meeting_quality') for (const p of ordered) reasons[p.id]?.push('ordered by lowest list cost among models that met the requirements');
  return { chain: ordered, skipped, reasons, objective, needs };
}

export interface BudgetInput {
  config: GatewayConfig; feature: string | undefined; spendToday: number; spendMonth: number;
  userSpendMonth?: number; featureSpendMonth?: number; userCallsToday?: number; refSpend?: number;
}
export interface BudgetDecision { allow: boolean; paidBlocked: boolean; reason: string | null }
/** Pure budget rules. Per-user call cap blocks the call; spend caps block non-essential work and switch paid routes off for essential work. */
export function budgetDecision(b: BudgetInput): BudgetDecision {
  const c = b.config, essential = taskFor(b.feature).essential;
  if (c.max_calls_per_user_day && (b.userCallsToday ?? 0) >= c.max_calls_per_user_day) return { allow: false, paidBlocked: true, reason: 'user_call_limit' };
  const reasons: string[] = [];
  if (c.max_daily_spend_inr && b.spendToday >= c.max_daily_spend_inr) reasons.push('daily_spend_limit');
  if (c.max_monthly_spend_inr && b.spendMonth >= c.max_monthly_spend_inr) reasons.push('monthly_spend_limit');
  if (c.max_cost_per_user_inr && (b.userSpendMonth ?? 0) >= c.max_cost_per_user_inr) reasons.push('user_spend_limit');
  if (c.max_cost_per_feature_inr && (b.featureSpendMonth ?? 0) >= c.max_cost_per_feature_inr) reasons.push('feature_spend_limit');
  if (c.max_handwritten_eval_inr && taskFor(b.feature).key === 'handwriting' && (b.refSpend ?? 0) >= c.max_handwritten_eval_inr) reasons.push('handwritten_evaluation_limit');
  if (!reasons.length) return { allow: true, paidBlocked: false, reason: null };
  return { allow: essential, paidBlocked: true, reason: reasons.join(',') };
}
