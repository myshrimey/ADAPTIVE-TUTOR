import type { SupabaseClient } from '@supabase/supabase-js';
import { startOfTodayIst } from '../ai-provider/usage';
import { loadProviders, keyPresent, type ProviderRow } from './registry';
import { loadGatewayConfig, type GatewayConfig } from './config';
import { usageByProvider } from './router';
import { providerLines, aiAlerts, summariseCost, perFeature, perStudent, perHandwrittenEvaluation, avgCallsPerStudentPerDay, type CostRow } from './reports';

const COLS = 'provider, ok, input_tokens, output_tokens, created_at, error, cost_inr, cost_est_inr, feature, student_id, ref, model, task, free_quota_used';
const LEGACY_COLS = 'provider, ok, input_tokens, output_tokens, created_at, error, feature, student_id';

async function rowsSince(service: SupabaseClient, iso: string): Promise<{ rows: CostRow[]; migrated: boolean }> {
  const page = async (cols: string) => service.from('ai_usage').select(cols).gte('created_at', iso).order('created_at', { ascending: false }).limit(60000);
  let r = await page(COLS), migrated = true;
  if (r.error) { r = await page(LEGACY_COLS); migrated = false; }
  const rows = ((r.data ?? []) as any[]).map((x) => ({ cost_inr: null, cost_est_inr: null, ...x })) as CostRow[];
  return { rows, migrated };
}

/** Everything the Admin -> AI Infrastructure page shows (read only). */
export async function loadAiInfrastructure(service: SupabaseClient, now: Date = new Date(), env: Record<string, string | undefined> = process.env) {
  const today = now.toISOString().slice(0, 10);
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3600_000).toISOString();
  const weekStart = new Date(new Date(startOfTodayIst(now)).getTime() - 6 * 86400_000).toISOString();
  const sinceIso = new Date(Math.min(new Date(monthStart).getTime(), new Date(weekStart).getTime())).toISOString();
  const [providers, config, usage, bench, tests] = await Promise.all([
    loadProviders(service), loadGatewayConfig(service), rowsSince(service, sinceIso),
    service.from('ai_benchmark_runs').select('*').order('run_at', { ascending: false }).limit(60),
    service.from('ai_benchmark_cases').select('*').order('created_at').limit(300),
  ]);
  const todayIso = startOfTodayIst(now);
  const rows = usage.rows, todayRows = rows.filter((r) => r.created_at >= todayIso), weekRows = rows.filter((r) => r.created_at >= weekStart), monthRows = rows.filter((r) => r.created_at >= monthStart);
  const usageMap = usageByProvider(todayRows, now);
  const hasKey = (p: ProviderRow) => keyPresent(p, env);
  const avg = avgCallsPerStudentPerDay(weekRows, 7);
  const lines = providerLines(providers, usageMap, todayRows, config, hasKey, today, avg).filter((l) => l.id !== 'gateway');
  const day = summariseCost(todayRows), week = summariseCost(weekRows), month = summariseCost(monthRows);
  const prev = weekRows.filter((r) => r.created_at < todayIso && r.provider !== 'gateway' && r.ok).length;
  const alerts = aiAlerts({ lines, cfg: config as GatewayConfig, spendToday: day.billedInr, spendMonth: month.billedInr, todayCalls: day.calls, avgDailyCalls7: prev > 0 ? prev / 6 : null, gatewayRefusalsToday: todayRows.filter((r) => r.provider === 'gateway' && !r.ok).length, providers });
  const keyCheck = providers.filter((p) => ['active', 'testing'].includes(p.status)).map((p) => ({ id: p.id, keySet: hasKey(p) }));
  return {
    migrated: usage.migrated, config, providers: providers.map((p) => ({ ...p, keySet: hasKey(p) })), lines, alerts, keyCheck,
    cost: { day, week, month, perStudentMonth: perStudent(monthRows), perStudentDay: perStudent(todayRows), features: perFeature(monthRows), handwritten: perHandwrittenEvaluation(monthRows) },
    counts: {
      active: providers.filter((p) => p.status === 'active').length, disabled: providers.filter((p) => ['paused', 'retired'].includes(p.status)).length,
      candidates: providers.filter((p) => ['candidate', 'testing'].includes(p.status)).length,
      free: providers.filter((p) => p.status === 'active' && lines.find((l) => l.id === p.id)?.free).length,
      paid: providers.filter((p) => p.status === 'active' && !lines.find((l) => l.id === p.id)?.free).length,
    },
    benchmarkRuns: (bench.data ?? []) as any[], benchmarkCases: (tests.data ?? []) as any[],
    routingShare: Object.entries(usageMap).filter(([k]) => k !== 'gateway').map(([id, u]) => ({ id, requests: u.requests })).sort((a, b) => b.requests - a.requests),
  };
}
export type AiInfrastructure = Awaited<ReturnType<typeof loadAiInfrastructure>>;
