import { isFreeRoute, type ProviderRow } from './registry';
import { paidAllowed, type GatewayConfig } from './config';
import { taskFor } from './tasks';

export interface UsageRowLite { provider: string; ok: boolean; input_tokens: number; output_tokens: number; created_at: string; error?: string | null; cost_inr?: number | null; feature?: string; student_id?: string | null }
export interface ProviderUsage { requests: number; tokens: number; failures: number; failuresLastHour: number; attemptsLastHour: number; rate429LastHour: number; lastMinuteRequests: number }

/** Roll today's usage rows up per provider (pure). `todayRows` = rows since IST midnight. */
export function usageByProvider(todayRows: UsageRowLite[], now: Date = new Date()): Record<string, ProviderUsage> {
  const out: Record<string, ProviderUsage> = {};
  const hourAgo = now.getTime() - 3600_000, minAgo = now.getTime() - 60_000;
  for (const r of todayRows) {
    const u = (out[r.provider] ??= { requests: 0, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0 });
    u.requests += 1; u.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    if (!r.ok) u.failures += 1;
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
}
export interface RoutePlan { chain: ProviderRow[]; skipped: Array<{ id: string; reason: string }> }

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
    const free = isFreeRoute(p, today);
    if (!free) {
      if (i.studentTier === 'free') { skip('paid provider (free plan)'); continue; }
      if (!paidOk) { skip(i.paidBlockedByBudget ? 'paid provider (spend cap reached)' : 'paid provider (no explicit budget rule)'); continue; }
    } else {
      const q = quotaStatus(p, i.usage[id], i.config);
      if (q.level === 'exhausted') { skip(`free quota used up (${q.dimension})`); continue; }
    }
    if (task.key === 'handwriting' && i.config.handwriting_min_quality !== null) {
      const s = i.benchmark?.[id];
      if (s === undefined || s < i.config.handwriting_min_quality) { skip(s === undefined ? 'not benchmarked for handwriting' : `benchmark ${s} below ${i.config.handwriting_min_quality}`); continue; }
    }
    // Free routes are preferred over paid ones; unreliable providers go to the back.
    (healthOf(i.usage[id]) === 'unreliable' ? weak : good).push(p);
  }
  const free = (p: ProviderRow) => (isFreeRoute(p, today) ? 0 : 1);
  const ordered = [...good.filter((p) => free(p) === 0), ...good.filter((p) => free(p) === 1), ...weak.filter((p) => free(p) === 0), ...weak.filter((p) => free(p) === 1)];
  return { chain: ordered, skipped };
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
