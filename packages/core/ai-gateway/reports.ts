import { startOfTodayIst } from '../ai-provider/usage';
import { isFreeRoute, type ProviderRow } from './registry';
import { quotaStatus, healthOf, type ProviderUsage, type UsageRowLite, type QuotaStatus, type Health } from './router';
import type { GatewayConfig } from './config';
import { taskFor } from './tasks';

export interface CostRow extends UsageRowLite { feature: string; student_id: string | null; cost_inr: number | null; cost_est_inr: number | null; ref?: string | null; model?: string | null; task?: string | null; free_quota_used?: boolean }
export type Label = 'ACTUAL' | 'ESTIMATED' | 'Insufficient data';
export interface Measure { value: number | null; label: Label }
const M = (value: number | null, label: Label): Measure => (value === null ? { value: null, label: 'Insufficient data' } : { value, label });

export interface CostSummary { calls: number; failures: number; billedInr: number; listInr: number; freeCalls: number; activeStudents: number }
export function summariseCost(rows: CostRow[]): CostSummary {
  const s = new Set<string>(); let calls = 0, failures = 0, billed = 0, list = 0, free = 0;
  for (const r of rows) {
    if (r.provider === 'gateway') { failures += r.ok ? 0 : 1; continue; } // gateway refusals are counted as failures, never as spend
    if (r.ok) { calls++; if (r.student_id) s.add(r.student_id); } else failures++;
    billed += Number(r.cost_inr ?? 0); list += Number(r.cost_est_inr ?? 0); if (r.ok && r.free_quota_used) free++;
  }
  return { calls, failures, billedInr: billed, listInr: list, freeCalls: free, activeStudents: s.size };
}

/** Cost per active student (students who used AI in the period) and the straight-line figure per 1,000 such students. */
export function perStudent(rows: CostRow[]) {
  const s = summariseCost(rows);
  const per = s.activeStudents > 0 ? s.billedInr / s.activeStudents : null;
  const perList = s.activeStudents > 0 ? s.listInr / s.activeStudents : null;
  return { activeStudents: s.activeStudents, billedPerStudent: M(per, 'ACTUAL'), listPerStudent: M(perList, 'ESTIMATED'), billedPer1000: M(per === null ? null : per * 1000, 'ESTIMATED'), listPer1000: M(perList === null ? null : perList * 1000, 'ESTIMATED') };
}

export function perFeature(rows: CostRow[]) {
  const m = new Map<string, { feature: string; label: string; tier: number; calls: number; failures: number; billedInr: number; listInr: number }>();
  for (const r of rows) {
    if (r.provider === 'gateway') continue;
    const t = taskFor(r.feature);
    const x = m.get(t.key) ?? { feature: t.key, label: t.label, tier: t.tier, calls: 0, failures: 0, billedInr: 0, listInr: 0 };
    if (r.ok) x.calls++; else x.failures++;
    x.billedInr += Number(r.cost_inr ?? 0); x.listInr += Number(r.cost_est_inr ?? 0); m.set(t.key, x);
  }
  return [...m.values()].sort((a, b) => b.listInr - a.listInr);
}

/** Cost per handwritten evaluation: rows that carry a ref (the exam id) are added up per exam; rows without one are not guessed. */
export function perHandwrittenEvaluation(rows: CostRow[]) {
  const by = new Map<string, { billed: number; list: number }>();
  for (const r of rows) {
    if (r.feature !== 'handwriting' || !r.ref || r.provider === 'gateway') continue;
    const x = by.get(r.ref) ?? { billed: 0, list: 0 }; x.billed += Number(r.cost_inr ?? 0); x.list += Number(r.cost_est_inr ?? 0); by.set(r.ref, x);
  }
  const n = by.size; let b = 0, l = 0; for (const v of by.values()) { b += v.billed; l += v.list; }
  return { evaluations: n, billedAvg: M(n ? b / n : null, 'ACTUAL'), listAvg: M(n ? l / n : null, 'ESTIMATED') };
}

export interface ProviderLine {
  id: string; name: string; model: string | null; status: string; classification: string; free: boolean; keySet: boolean; legacy: boolean; verified: string | null;
  quota: QuotaStatus; health: Health; requestsToday: number; tokensToday: number; failureRate: number | null; rate429: number; billedToday: number; listToday: number;
  expiry: string | null; reset: string; fallback: string | null; estimatedRemainingStudents: Measure; policy: string;
}
export function providerLines(providers: ProviderRow[], usage: Record<string, ProviderUsage>, todayRows: CostRow[], cfg: GatewayConfig, hasKey: (p: ProviderRow) => boolean, today: string, avgCallsPerStudent: number | null): ProviderLine[] {
  const costBy: Record<string, { b: number; l: number }> = {};
  for (const r of todayRows) { const c = (costBy[r.provider] ??= { b: 0, l: 0 }); c.b += Number(r.cost_inr ?? 0); c.l += Number(r.cost_est_inr ?? 0); }
  const order = [...providers].sort((a, b) => a.priority - b.priority);
  return providers.map((p) => {
    const u = usage[p.id]; const q = quotaStatus(p, u, cfg);
    const next = p.id === cfg.primary_provider ? cfg.fallback_provider : order.find((o) => o.id !== p.id && o.status === 'active' && o.priority > p.priority)?.id ?? null;
    return {
      id: p.id, name: p.provider_name, model: p.model, status: p.status, classification: p.classification, free: isFreeRoute(p, today), keySet: hasKey(p), legacy: p.legacy, verified: p.last_verified,
      quota: q, health: healthOf(u), requestsToday: u?.requests ?? 0, tokensToday: u?.tokens ?? 0,
      failureRate: u && u.attemptsLastHour > 0 ? Math.round((u.failuresLastHour / u.attemptsLastHour) * 100) : null, rate429: u?.rate429LastHour ?? 0,
      billedToday: costBy[p.id]?.b ?? 0, listToday: costBy[p.id]?.l ?? 0, expiry: p.free_tier_expiry, reset: p.quota_reset, fallback: next,
      estimatedRemainingStudents: M(q.remainingRequests !== null && avgCallsPerStudent && avgCallsPerStudent > 0 ? Math.floor(q.remainingRequests / avgCallsPerStudent) : null, 'ESTIMATED'), policy: p.policy_status,
    };
  });
}

export interface AiAlert { level: 'critical' | 'warning' | 'info'; kind: 'quota' | 'failure' | 'cost' | 'usage' | 'setup'; text: string }
export function aiAlerts(args: { lines: ProviderLine[]; cfg: GatewayConfig; spendToday: number; spendMonth: number; todayCalls: number; avgDailyCalls7: number | null; gatewayRefusalsToday: number; providers: ProviderRow[]; paidBlockedRoutes?: number }): AiAlert[] {
  const out: AiAlert[] = []; const { cfg } = args;
  for (const l of args.lines) {
    if (l.status !== 'active') continue;
    if (l.quota.level === 'exhausted') out.push({ level: 'critical', kind: 'quota', text: `${l.name}: free quota used up (${l.quota.dimension}). Its free route is switched off and the next approved provider is used.` });
    else if (l.quota.level === 'critical') out.push({ level: 'critical', kind: 'quota', text: `${l.name}: ${l.quota.pct}% of the ${l.quota.dimension} quota used.` });
    else if (l.quota.level === 'warning') out.push({ level: 'warning', kind: 'quota', text: `${l.name}: ${l.quota.pct}% of the ${l.quota.dimension} quota used.` });
    if (l.health === 'unreliable') out.push({ level: 'critical', kind: 'failure', text: `${l.name}: ${l.failureRate}% of calls failed in the last hour. It has been moved to the back of the line.` });
    else if (l.health === 'degraded') out.push({ level: 'warning', kind: 'failure', text: `${l.name}: ${l.failureRate}% of calls failed in the last hour.` });
    if (l.free && !l.keySet) out.push({ level: 'info', kind: 'setup', text: `${l.name} is switched on but its API key is not set on the server.` });
  }
  const free = cfg.free_only_mode;
  if (free && args.spendToday > 0) out.push({ level: 'critical', kind: 'cost', text: `Free-only mode is ON but ₹${args.spendToday.toFixed(2)} of billed AI cost was recorded today. Check the provider list.` });
  if (cfg.max_daily_spend_inr && args.spendToday >= cfg.max_daily_spend_inr * 0.8) out.push({ level: args.spendToday >= cfg.max_daily_spend_inr ? 'critical' : 'warning', kind: 'cost', text: `Daily AI spend ₹${args.spendToday.toFixed(2)} of ₹${cfg.max_daily_spend_inr} limit.` });
  if (cfg.max_monthly_spend_inr && args.spendMonth >= cfg.max_monthly_spend_inr * 0.8) out.push({ level: args.spendMonth >= cfg.max_monthly_spend_inr ? 'critical' : 'warning', kind: 'cost', text: `Monthly AI spend ₹${args.spendMonth.toFixed(2)} of ₹${cfg.max_monthly_spend_inr} limit.` });
  if (args.avgDailyCalls7 !== null && args.avgDailyCalls7 >= 50 && args.todayCalls > args.avgDailyCalls7 * 3) out.push({ level: 'warning', kind: 'usage', text: `Unusual usage: ${args.todayCalls} AI calls so far today, against a recent daily average of ${Math.round(args.avgDailyCalls7)}.` });
  if (args.gatewayRefusalsToday > 0) out.push({ level: 'warning', kind: 'usage', text: `${args.gatewayRefusalsToday} AI request(s) were refused today by a limit or because no provider was eligible.` });
  const activeOk = args.providers.filter((p) => p.status === 'active' && p.classification !== 'F').length;
  if (activeOk < 2) out.push({ level: 'warning', kind: 'setup', text: 'Fewer than two approved providers are active: there is no fallback if one fails.' });
  const unknownPolicy = args.providers.filter((p) => p.status === 'active' && p.policy_status === 'unknown').length;
  if (unknownPolicy) out.push({ level: 'info', kind: 'setup', text: `${unknownPolicy} active provider(s) have an unconfirmed data policy. Student text is sent to them with contact details removed.` });
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Average successful calls per active student per day over the rows given (days = number of days covered). */
export function avgCallsPerStudentPerDay(rows: CostRow[], days: number): number | null {
  const s = summariseCost(rows); return s.activeStudents > 0 && days > 0 ? s.calls / s.activeStudents / days : null;
}
export { startOfTodayIst };
