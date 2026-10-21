import type { SupabaseClient } from '@supabase/supabase-js';

export interface GatewayConfig {
  primary_provider: string | null; primary_model: string | null; fallback_provider: string | null; fallback_model: string | null;
  free_only_mode: boolean; allow_paid_fallback: boolean;
  max_daily_spend_inr: number | null; max_monthly_spend_inr: number | null; max_cost_per_user_inr: number | null; max_cost_per_feature_inr: number | null;
  max_handwritten_eval_inr: number | null; max_calls_per_user_day: number | null;
  quota_warn_pct: number; quota_critical_pct: number; block_unknown_policy: boolean; handwriting_min_quality: number | null;
  routes: Record<string, string[]>;
}
export const DEFAULT_GATEWAY: GatewayConfig = {
  primary_provider: 'gemini', primary_model: null, fallback_provider: 'groq', fallback_model: null, free_only_mode: true, allow_paid_fallback: false,
  max_daily_spend_inr: null, max_monthly_spend_inr: null, max_cost_per_user_inr: null, max_cost_per_feature_inr: null, max_handwritten_eval_inr: null,
  max_calls_per_user_day: 500, quota_warn_pct: 80, quota_critical_pct: 90, block_unknown_policy: false, handwriting_min_quality: null, routes: {},
};

const numOrNull = (v: any, min = 0, max = 1e9): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max ? Number(v) : NaN as any);
const strOrNull = (v: any): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null);

/** Validates a (partial) config from the admin screen. Returns the cleaned full config or an error text. */
export function validateGatewayConfig(input: any, base: GatewayConfig = DEFAULT_GATEWAY): { ok: true; value: GatewayConfig } | { ok: false; error: string } {
  const v: GatewayConfig = { ...base, ...(input ?? {}) };
  const out: GatewayConfig = { ...DEFAULT_GATEWAY };
  for (const k of ['primary_provider', 'primary_model', 'fallback_provider', 'fallback_model'] as const) out[k] = strOrNull(v[k]);
  for (const k of ['free_only_mode', 'allow_paid_fallback', 'block_unknown_policy'] as const) out[k] = (v[k] as unknown) === true || (v[k] as unknown) === 'true';
  for (const k of ['max_daily_spend_inr', 'max_monthly_spend_inr', 'max_cost_per_user_inr', 'max_cost_per_feature_inr', 'max_handwritten_eval_inr'] as const) {
    const n = numOrNull(v[k]); if (Number.isNaN(n as any)) return { ok: false, error: `${k} must be a positive number or empty.` }; out[k] = n;
  }
  const calls = numOrNull(v.max_calls_per_user_day, 1, 100000); if (Number.isNaN(calls as any)) return { ok: false, error: 'max_calls_per_user_day must be 1-100000 or empty.' }; out.max_calls_per_user_day = calls;
  const warn = numOrNull(v.quota_warn_pct, 1, 100), crit = numOrNull(v.quota_critical_pct, 1, 100);
  if (warn === null || crit === null || Number.isNaN(warn as any) || Number.isNaN(crit as any) || warn >= crit) return { ok: false, error: 'Warning % must be lower than critical %, both 1-100.' };
  out.quota_warn_pct = warn; out.quota_critical_pct = crit;
  const q = numOrNull(v.handwriting_min_quality, 0, 100); if (Number.isNaN(q as any)) return { ok: false, error: 'handwriting_min_quality must be 0-100 or empty.' }; out.handwriting_min_quality = q;
  const routes: Record<string, string[]> = {};
  for (const [task, list] of Object.entries(v.routes ?? {})) {
    if (!/^[a-z_]{2,40}$/.test(task) || !Array.isArray(list)) return { ok: false, error: 'Routes must be {task: [provider ids]}.' };
    routes[task] = list.map((x) => String(x)).filter((x) => /^[a-z0-9_]{2,40}$/.test(x)).slice(0, 8);
  }
  out.routes = routes;
  // Paid use needs an EXPLICIT budget rule: both caps set.
  if (out.allow_paid_fallback && !out.free_only_mode && (!out.max_daily_spend_inr || !out.max_monthly_spend_inr)) return { ok: false, error: 'To allow paid providers, set BOTH a daily and a monthly spend limit (and turn Free-only mode off).' };
  return { ok: true, value: out };
}

/** True only when a paid provider may be used: not free-only, explicitly allowed, and both caps set. */
export function paidAllowed(c: GatewayConfig): boolean {
  return !c.free_only_mode && c.allow_paid_fallback && !!c.max_daily_spend_inr && !!c.max_monthly_spend_inr;
}

export async function loadGatewayConfig(service: SupabaseClient): Promise<GatewayConfig> {
  const { data, error } = await service.from('commerce_settings').select('value').eq('key', 'ai_gateway').maybeSingle();
  if (error) throw new Error(`ai_config_unavailable: ${error.message}`);
  const r = validateGatewayConfig(data?.value ?? {}, DEFAULT_GATEWAY);
  return r.ok ? r.value : DEFAULT_GATEWAY; // a damaged setting falls back to the SAFE default (free only)
}
